import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import Plot from '../../lib/Plot';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { patientsApi } from '../../api/patients';
import { modelXaiApi } from '../../api/modelXai';
import { PageHeader } from '../../components/common/PageHeader';
import { PPH_COLOURS, getSeverityColours } from '../../theme/pphTheme';
import { formatDateTime } from '../../utils/formatters';

// ── Types ────────────────────────────────────────────────────────────────────

interface VisitSHAP {
  visitLabel: string;
  shap_values: Record<string, number>;
  base_value: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export const TrendsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [shapByVisit, setShapByVisit] = useState<VisitSHAP[]>([]);
  const [shapLoading, setShapLoading] = useState(false);
  const alertFiredRef = useRef(false);

  useEffect(() => { dispatch(setPageTitle('Temporal Trends')); }, [dispatch]);

  const { data: patientData, isLoading } = useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsApi.getById(id!),
    enabled: !!id,
  });

  const patient = patientData?.patient;
  const assessments = (patientData?.assessments ?? []).slice().sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Fetch SHAP for each assessment (max 6 most recent)
  useEffect(() => {
    const recent = assessments.slice(-6);
    if (recent.length === 0) return;
    setShapLoading(true);
    Promise.allSettled(
      recent.map((a, i) =>
        modelXaiApi.explain({
          duration_labour_min: a.duration_labour_min,
          hiv_status_num: a.hiv_status_num,
          parity_num: a.parity_num,
          booked_unbooked: a.booked_unbooked,
          delivery_method_clean_LSCS: a.delivery_method_clean_lscs,
        }).then((res) => ({
          visitLabel: `Visit ${i + 1}\n${formatDateTime(a.created_at).slice(0, 10)}`,
          shap_values: res.shap_values,
          base_value: res.base_value,
        }))
      )
    ).then((results) => {
      const ok = results.filter((r): r is PromiseFulfilledResult<VisitSHAP> => r.status === 'fulfilled').map((r) => r.value);
      setShapByVisit(ok);
      setShapLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-64 rounded" />
        <div className="skeleton h-64 w-full rounded-xl" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="card bg-base-100 shadow-sm p-8 max-w-lg">
        <p className="text-xl font-bold mb-2">Patient not found</p>
        <button className="btn btn-ghost btn-sm w-fit" onClick={() => navigate('/patients')}>← Back to Patients</button>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Temporal Trends" subtitle={`Patient: ${patient.full_name}`} />
        <div className="card bg-base-100 shadow-sm p-8">
          <p className="text-base-content/50">No assessments recorded for this patient yet. Complete at least one assessment to view trends.</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={() => navigate(`/patients/${id}/assessments/new`)}>Run First Assessment</button>
        </div>
      </div>
    );
  }

  const visitLabels = assessments.slice(-6).map((_, i) => `Visit ${i + 1}`);
  const probabilities = assessments.slice(-6).map((a) => a.probability_severe_pph);
  const durations = assessments.slice(-6).map((a) => a.duration_labour_min);
  const parities = assessments.slice(-6).map((a) => a.parity_num);

  // Clinical alert: >15pp rise between any two consecutive visits
  const maxRise = probabilities.reduce((max, p, i) => {
    if (i === 0) return max;
    return Math.max(max, p - probabilities[i - 1]);
  }, 0);
  const clinicalAlert = maxRise > 0.15;

  // Severity band shapes for trajectory chart
  const shapes: Partial<Plotly.Shape>[] = [
    { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0, y1: 0.33, fillcolor: 'rgba(56,142,60,0.05)', line: { width: 0 }, layer: 'below' },
    { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0.33, y1: 0.66, fillcolor: 'rgba(245,124,0,0.05)', line: { width: 0 }, layer: 'below' },
    { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0.66, y1: 1, fillcolor: 'rgba(211,47,47,0.07)', line: { width: 0 }, layer: 'below' },
  ];

  // Feature importance change table data
  const featureNames = ['duration_labour_min', 'hiv_status_num', 'parity_num', 'booked_unbooked', 'delivery_method_clean_LSCS'];
  const featureDisplayNames: Record<string, string> = {
    duration_labour_min: 'Labour Duration (min)',
    hiv_status_num: 'HIV Status',
    parity_num: 'Parity',
    booked_unbooked: 'Booking Status',
    delivery_method_clean_LSCS: 'Delivery: LSCS',
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Temporal Trends" subtitle={`Patient: ${patient.full_name} — ${patient.patient_id_number}`} />
      <p className="text-sm text-base-content/50 -mt-4">{assessments.length} assessment{assessments.length !== 1 ? 's' : ''} on record · Showing up to 6 most recent</p>

      {/* Clinical Alert Banner */}
      {clinicalAlert && !alertFiredRef.current && (() => { alertFiredRef.current = true; return null; })()}
      {clinicalAlert && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="font-bold">Clinical Alert: Rapid Risk Escalation</h3>
            <p className="text-sm mt-1">Predicted PPH severity risk has risen by more than 15 percentage points between consecutive visits (+{Math.round(maxRise * 100)}pp). Immediate clinical review is recommended.</p>
          </div>
        </div>
      )}

      {/* PPH Risk Score Trajectory */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-1">PPH Risk Score Trajectory</h3>
          <p className="text-xs text-base-content/40 mb-3 italic">Predicted probability of Severe PPH over time. Severity tiers: Mild (&lt;33%), Moderate (33–66%), Severe (&gt;66%).</p>
          <Plot
            data={[
              {
                x: visitLabels,
                y: probabilities,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'PPH Probability',
                line: { color: PPH_COLOURS.severe.background, width: 2.5, shape: 'spline' },
                marker: {
                  color: probabilities.map((p) => getSeverityColours(p).background),
                  size: 10,
                  symbol: 'diamond',
                  line: { color: '#fff', width: 2 },
                },
                hovertemplate: '<b>%{x}</b><br>Risk: %{y:.1%}<extra></extra>',
              },
            ]}
            layout={{
              autosize: true,
              height: 300,
              margin: { l: 50, r: 20, t: 20, b: 50 },
              yaxis: {
                range: [0, 1],
                tickformat: '.0%',
                title: { text: 'Probability', standoff: 8 },
                gridcolor: '#EDF0F3',
              },
              xaxis: { title: { text: 'Assessment Visit', standoff: 8 }, gridcolor: '#EDF0F3' },
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              shapes,
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
          {/* Tier legend */}
          <div className="flex gap-4 text-xs mt-1">
            {(['severe', 'moderate', 'mild'] as const).map((tier) => (
              <span key={tier} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: PPH_COLOURS[tier].background }} aria-hidden="true" />
                <span style={{ color: PPH_COLOURS[tier].background }}>{PPH_COLOURS[tier].label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Biomarker Trend Lines */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-1">Biomarker Trends</h3>
          <p className="text-xs text-base-content/40 mb-3 italic">Labour duration (minutes) and parity (previous live births) over assessment visits.</p>
          <Plot
            data={[
              {
                x: visitLabels,
                y: durations,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Labour Duration (min)',
                yaxis: 'y',
                line: { color: '#4A6D8C', width: 2 },
                marker: { size: 7 },
                hovertemplate: '<b>Labour Duration</b><br>%{x}: %{y} min<extra></extra>',
              },
              {
                x: visitLabels,
                y: parities,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Parity',
                yaxis: 'y2',
                line: { color: '#F57C00', width: 2, dash: 'dash' },
                marker: { size: 7 },
                hovertemplate: '<b>Parity</b><br>%{x}: %{y}<extra></extra>',
              },
            ]}
            layout={{
              autosize: true,
              height: 280,
              margin: { l: 60, r: 60, t: 20, b: 50 },
              yaxis: {
                title: { text: 'Duration (min)', standoff: 8 },
                gridcolor: '#EDF0F3',
              },
              yaxis2: {
                title: { text: 'Parity', standoff: 8 },
                overlaying: 'y',
                side: 'right',
                gridcolor: 'transparent',
                dtick: 1,
              },
              xaxis: { title: { text: 'Assessment Visit', standoff: 8 }, gridcolor: '#EDF0F3' },
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              legend: { orientation: 'h', y: -0.25 },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Feature Contribution Change Table (SHAP per visit) */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-1">Feature Contribution Change (SHAP)</h3>
          <p className="text-xs text-base-content/40 mb-3 italic">
            SHAP values per feature across assessment visits. Positive = increases PPH risk. Computed via model service.
            {shapLoading && ' Loading…'}
          </p>
          {shapByVisit.length === 0 && !shapLoading && (
            <p className="text-sm text-base-content/40 italic">SHAP contributions unavailable — model service may be offline.</p>
          )}
          {shapByVisit.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-sm text-xs">
                <thead>
                  <tr>
                    <th className="text-left">Feature</th>
                    {shapByVisit.map((v, i) => (
                      <th key={i} className="text-center">{v.visitLabel.split('\n')[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureNames.map((feat) => (
                    <tr key={feat}>
                      <td className="font-medium">{featureDisplayNames[feat]}</td>
                      {shapByVisit.map((v, i) => {
                        const val = v.shap_values[feat] ?? 0;
                        const isPos = val > 0;
                        return (
                          <td key={i} className="text-center font-mono" style={{ color: isPos ? PPH_COLOURS.severe.background : PPH_COLOURS.mild.background }}>
                            {val > 0 ? '+' : ''}{val.toFixed(3)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assessment Timeline */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-3">Assessment History</h3>
          <div className="space-y-2">
            {assessments.slice(-6).map((a, i) => {
              const col = getSeverityColours(a.probability_severe_pph);
              return (
                <div key={a.id} className="flex items-center gap-4 p-3 rounded-lg bg-base-200">
                  <span className="text-xs font-bold w-14 text-center" style={{ color: '#4A6D8C' }}>Visit {i + 1}</span>
                  <span className="text-xs text-base-content/50 w-36">{formatDateTime(a.created_at)}</span>
                  <span className="flex-1 text-sm font-semibold">{Math.round(a.probability_severe_pph * 100)}% severe PPH</span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: col.background, color: col.text }} aria-label={`Severity: ${col.label}`}>{col.label}</span>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => navigate(`/patients/${id}/assessments/${a.id}/result`)}
                  >
                    View
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pb-6">
        <button className="btn btn-primary" onClick={() => navigate(`/patients/${id}/assessments/new`)}>Run New Assessment</button>
        <button className="btn btn-ghost" onClick={() => navigate(`/patients/${id}`)}>Back to Patient Record</button>
      </div>
    </div>
  );
};
