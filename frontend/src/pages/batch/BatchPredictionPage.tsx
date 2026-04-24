import { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Plot from '../../lib/Plot';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { PageHeader } from '../../components/common/PageHeader';
import { PPH_COLOURS, getSeverityTier, getSeverityColours } from '../../theme/pphTheme';
import { modelXaiApi } from '../../api/modelXai';

// ── Types ────────────────────────────────────────────────────────────────────

interface BatchRow {
  duration_labour_min: number;
  hiv_status_num: number;
  parity_num: number;
  booked_unbooked: number;
  delivery_method_clean_LSCS: number;
  rowIndex: number;
}

interface BatchResult extends BatchRow {
  probability_severe_pph: number;
  probability_no_pph: number;
  risk_level: 'HIGH' | 'LOW';
  severity_tier: string;
  error?: string;
}

const REQUIRED_COLUMNS = ['duration_labour_min', 'hiv_status_num', 'parity_num', 'booked_unbooked', 'delivery_method_clean_LSCS'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function validateRow(row: Record<string, unknown>, idx: number): { valid: BatchRow | null; error: string | null } {
  const missing = REQUIRED_COLUMNS.filter((c) => row[c] === undefined || row[c] === null || row[c] === '');
  if (missing.length > 0) return { valid: null, error: `Row ${idx + 1}: Missing columns: ${missing.join(', ')}` };

  const r = {
    duration_labour_min: Number(row['duration_labour_min']),
    hiv_status_num: Number(row['hiv_status_num']),
    parity_num: Number(row['parity_num']),
    booked_unbooked: Number(row['booked_unbooked']),
    delivery_method_clean_LSCS: Number(row['delivery_method_clean_LSCS']),
    rowIndex: idx + 1,
  };

  if (isNaN(r.duration_labour_min) || r.duration_labour_min < 0) return { valid: null, error: `Row ${idx + 1}: duration_labour_min must be ≥ 0` };
  if (![0, 1].includes(r.hiv_status_num)) return { valid: null, error: `Row ${idx + 1}: hiv_status_num must be 0 or 1` };
  if (r.parity_num < 0 || !Number.isInteger(r.parity_num)) return { valid: null, error: `Row ${idx + 1}: parity_num must be non-negative integer` };
  if (![0, 1].includes(r.booked_unbooked)) return { valid: null, error: `Row ${idx + 1}: booked_unbooked must be 0 or 1` };
  if (![0, 1].includes(r.delivery_method_clean_LSCS)) return { valid: null, error: `Row ${idx + 1}: delivery_method_clean_LSCS must be 0 or 1` };

  return { valid: r, error: null };
}

// ── Component ────────────────────────────────────────────────────────────────

export const BatchPredictionPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [results, setResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [threshold, setThreshold] = useState(0.5);
  const [exportLoading, setExportLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { dispatch(setPageTitle('Batch Prediction')); }, [dispatch]);

  const handleFile = useCallback(async (file: File) => {
    setValidationErrors([]);
    setResults([]);

    let workbook: XLSX.WorkBook;
    try {
      const buf = await file.arrayBuffer();
      workbook = XLSX.read(buf, { type: 'array' });
    } catch {
      setValidationErrors(['Could not parse file. Please upload a valid .xlsx file.']);
      return;
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (rows.length === 0) {
      setValidationErrors(['The spreadsheet contains no data rows.']);
      return;
    }
    if (rows.length > 500) {
      setValidationErrors([`Maximum 500 rows allowed per batch. Found ${rows.length}.`]);
      return;
    }

    const validRows: BatchRow[] = [];
    const errors: string[] = [];
    rows.forEach((row, i) => {
      const { valid, error } = validateRow(row, i);
      if (valid) validRows.push(valid);
      else if (error) errors.push(error);
    });

    if (errors.length > 0) {
      setValidationErrors(errors.slice(0, 10));
      if (errors.length > 10) setValidationErrors((e) => [...e, `…and ${errors.length - 10} more errors`]);
      return;
    }

    setLoading(true);
    try {
      const batchResults: BatchResult[] = await Promise.all(
        validRows.map(async (row) => {
          try {
            const res = await modelXaiApi.confidence({
              duration_labour_min: row.duration_labour_min,
              hiv_status_num: row.hiv_status_num,
              parity_num: row.parity_num,
              booked_unbooked: row.booked_unbooked,
              delivery_method_clean_LSCS: row.delivery_method_clean_LSCS,
            });
            const prob = res.risk;
            return {
              ...row,
              probability_severe_pph: prob,
              probability_no_pph: 1 - prob,
              risk_level: prob >= 0.5 ? 'HIGH' : ('LOW' as const),
              severity_tier: getSeverityTier(prob),
            };
          } catch {
            return {
              ...row,
              probability_severe_pph: 0,
              probability_no_pph: 0,
              risk_level: 'LOW' as const,
              severity_tier: 'mild',
              error: 'Prediction failed',
            };
          }
        })
      );
      setResults(batchResults);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const filteredByThreshold = results.filter((r) => r.probability_severe_pph >= threshold);
  const tierCounts = {
    severe: results.filter((r) => r.severity_tier === 'severe').length,
    moderate: results.filter((r) => r.severity_tier === 'moderate').length,
    mild: results.filter((r) => r.severity_tier === 'mild').length,
  };

  // Parity band categories for heatmap
  const parityBands = ['0–1', '2–3', '4+'];
  const deliveryTypes = ['Vaginal', 'LSCS'];
  const heatmapData: number[][] = deliveryTypes.map((_, dIdx) =>
    parityBands.map((_, pIdx) => {
      const pMin = [0, 2, 4][pIdx];
      const pMax = [1, 3, 99][pIdx];
      const subset = results.filter(
        (r) => r.delivery_method_clean_LSCS === dIdx && r.parity_num >= pMin && r.parity_num <= pMax
      );
      if (subset.length === 0) return 0;
      return subset.reduce((sum, r) => sum + r.probability_severe_pph, 0) / subset.length;
    })
  );

  const handleExportPDF = async () => {
    if (!resultsRef.current) return;
    setExportLoading(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { scale: 1.5, useCORS: true, backgroundColor: '#fff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(imgHeight, 200));
      pdf.save(`mediflow_batch_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportExcel = () => {
    const exportRows = results.map((r) => ({
      Row: r.rowIndex,
      duration_labour_min: r.duration_labour_min,
      hiv_status_num: r.hiv_status_num,
      parity_num: r.parity_num,
      booked_unbooked: r.booked_unbooked,
      delivery_method_clean_LSCS: r.delivery_method_clean_LSCS,
      probability_severe_pph: r.probability_severe_pph.toFixed(4),
      probability_no_pph: r.probability_no_pph.toFixed(4),
      risk_level: r.risk_level,
      severity_tier: r.severity_tier,
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Batch Results');
    XLSX.writeFile(wb, `mediflow_batch_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Batch Prediction" subtitle="Upload a spreadsheet to score multiple patients at once" />

      {/* Upload Zone */}
      <div
        className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors hover:bg-base-200"
        style={{ borderColor: '#4A6D8C' }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        aria-label="Upload batch prediction spreadsheet"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          aria-label="Select .xlsx batch file"
        />
        <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="#4A6D8C">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-base font-semibold" style={{ color: '#4A6D8C' }}>Drop .xlsx file here or click to browse</p>
        <p className="text-xs text-base-content/50 mt-1">Required columns: duration_labour_min, hiv_status_num, parity_num, booked_unbooked, delivery_method_clean_LSCS · Max 500 rows</p>
        <a
          href="/sample_batch_template.xlsx"
          download
          className="btn btn-ghost btn-xs mt-3"
          onClick={(e) => e.stopPropagation()}
          aria-label="Download sample batch template"
        >
          Download sample template
        </a>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <p className="font-bold">Validation Errors</p>
            <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
              {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3">
          <span className="loading loading-spinner loading-sm" />
          <span className="text-sm text-base-content/60">Running predictions… This may take a moment for large batches.</span>
        </div>
      )}

      {results.length > 0 && (
        <div ref={resultsRef} className="space-y-6">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            {(['severe', 'moderate', 'mild'] as const).map((tier) => (
              <div key={tier} className="rounded-xl p-4 text-center" style={{ backgroundColor: PPH_COLOURS[tier].lightBackground, border: `1px solid ${PPH_COLOURS[tier].border}` }}>
                <p className="text-3xl font-extrabold" style={{ color: PPH_COLOURS[tier].background }}>{tierCounts[tier]}</p>
                <p className="text-sm font-semibold mt-1" style={{ color: PPH_COLOURS[tier].background }}>{PPH_COLOURS[tier].label}</p>
                <p className="text-xs text-base-content/50 mt-0.5">{results.length > 0 ? Math.round((tierCounts[tier] / results.length) * 100) : 0}% of batch</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Score Histogram */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-1">Risk Score Distribution</h3>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-xs text-base-content/60 whitespace-nowrap">Threshold: {Math.round(threshold * 100)}%</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="range range-xs flex-1"
                    aria-label="Risk threshold slider"
                  />
                  <span className="text-xs font-semibold w-24 text-right">{filteredByThreshold.length} above</span>
                </div>
                <Plot
                  data={[
                    {
                      x: results.map((r) => r.probability_severe_pph),
                      type: 'histogram',
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ...({ nbinsx: 20 } as any),
                      marker: {
                        color: results.map((r) => getSeverityColours(r.probability_severe_pph).background),
                        opacity: 0.8,
                      },
                      hovertemplate: 'Range: %{x}<br>Count: %{y}<extra></extra>',
                    },
                  ]}
                  layout={{
                    autosize: true, height: 240, margin: { l: 45, r: 15, t: 15, b: 45 },
                    xaxis: { title: { text: 'Probability of Severe PPH', standoff: 6 }, range: [0, 1], gridcolor: '#EDF0F3', tickformat: '.0%' },
                    yaxis: { title: { text: 'Count', standoff: 6 }, gridcolor: '#EDF0F3' },
                    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
                    shapes: [{ type: 'line', x0: threshold, x1: threshold, y0: 0, y1: 1, yref: 'paper', line: { color: '#333', width: 2, dash: 'dot' } }],
                    annotations: [{ x: threshold, y: 1, yref: 'paper', text: `Threshold`, showarrow: false, font: { size: 9, color: '#555' }, xanchor: 'left', yanchor: 'top' }],
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Subgroup Heatmap */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-1">Subgroup Heatmap</h3>
                <p className="text-xs text-base-content/40 mb-2 italic">Mean PPH probability by delivery method × parity band</p>
                <Plot
                  data={[
                    {
                      z: heatmapData,
                      x: parityBands,
                      y: deliveryTypes,
                      type: 'heatmap',
                      colorscale: [
                        [0, PPH_COLOURS.mild.background],
                        [0.33, PPH_COLOURS.moderate.background],
                        [1, PPH_COLOURS.severe.background],
                      ],
                      zmin: 0,
                      zmax: 1,
                      hovertemplate: '%{y} / Parity %{x}<br>Mean Risk: %{z:.1%}<extra></extra>',
                      colorbar: { title: { text: 'Mean Risk', side: 'right' }, tickformat: '.0%', len: 0.8 },
                    },
                  ]}
                  layout={{
                    autosize: true, height: 240, margin: { l: 75, r: 80, t: 15, b: 50 },
                    xaxis: { title: { text: 'Parity Band', standoff: 6 }, gridcolor: '#EDF0F3' },
                    yaxis: { title: { text: 'Delivery Method', standoff: 6 }, gridcolor: '#EDF0F3' },
                    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60">Results ({results.length} patients)</h3>
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-outline" onClick={handleExportExcel} aria-label="Export results to Excel">Export Excel</button>
                  <button className="btn btn-sm btn-outline" onClick={handleExportPDF} disabled={exportLoading} aria-label="Export results to PDF">
                    {exportLoading ? <span className="loading loading-spinner loading-xs" /> : 'Export PDF'}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="table table-sm table-pin-rows text-xs">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Duration (min)</th>
                      <th>HIV</th>
                      <th>Parity</th>
                      <th>Booked</th>
                      <th>LSCS</th>
                      <th className="text-center">PPH Risk</th>
                      <th className="text-center">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => {
                      const col = getSeverityColours(r.probability_severe_pph);
                      return (
                        <tr key={r.rowIndex}>
                          <td>{r.rowIndex}</td>
                          <td>{r.duration_labour_min}</td>
                          <td>{r.hiv_status_num === 1 ? 'Pos' : 'Neg'}</td>
                          <td>{r.parity_num}</td>
                          <td>{r.booked_unbooked === 0 ? 'Booked' : 'Unbooked'}</td>
                          <td>{r.delivery_method_clean_LSCS === 1 ? 'Yes' : 'No'}</td>
                          <td className="text-center font-mono font-semibold">{Math.round(r.probability_severe_pph * 100)}%</td>
                          <td className="text-center">
                            {r.error ? (
                              <span className="text-error text-xs">Error</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ backgroundColor: col.background, color: col.text }} aria-label={`Severity: ${col.label}`}>{col.label}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
