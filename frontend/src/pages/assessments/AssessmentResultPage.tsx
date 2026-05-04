import { useEffect, useState, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { patientsApi } from '../../api/patients';
import { modelXaiApi } from '../../api/modelXai';
import type { ExplainResponse, ConfidenceResponse } from '../../api/modelXai';
import { SkeletonCard } from '../../components/common/SkeletonCard';
import { SkeletonTable } from '../../components/common/SkeletonTable';
import { SHAPBarChart } from '../../components/charts/SHAPBarChart';
import { PopDistributionChart } from '../../components/charts/PopDistributionChart';
import type { PopulationStats } from '../../components/charts/PopDistributionChart';
import { RiskGauge } from '../../components/charts/RiskGauge';
import { FeatureImportanceChart } from '../../components/charts/FeatureImportanceChart';
import { ABNORMALITY_FLAGS } from '../../data/abnormalityFlags';
import { getRelevantClinicalNotes } from '../../data/clinicalNotes';
import { PPH_COLOURS, getSeverityTier, getSeverityColours, MODEL_VERSION } from '../../theme/pphTheme';
import {
  formatDate,
  formatDateTime,
  formatProbability,
  formatMinutesToHours,
  formatHIVStatus,
  formatBookingStatus,
  formatDeliveryMethod,
} from '../../utils/formatters';

// ── Types ──────────────────────────────────────────────────────────────────────

type XAITab = 'shap' | 'population' | 'counterfactual';

interface CounterfactualResult {
  feature: string;
  displayName: string;
  currentValue: number | string;
  suggestedTarget: number | string;
  currentTier: string;
  projectedTier: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const FEATURE_DISPLAY: Record<string, string> = {
  duration_labour_min: 'Labour Duration (min)',
  hiv_status_num: 'HIV Status',
  parity_num: 'Parity',
  booked_unbooked: 'Booking Status',
  delivery_method_clean_lscs: 'Delivery: LSCS',
};

const FEATURE_LOINC: Record<string, string> = {
  hiv_status_num: '55277-8',
};

/**
 * Counterfactual grid search — no external library.
 * Steps from current value toward population median, returns first value
 * where predicted tier changes.
 */
function findCounterfactual(
  features: Record<string, number>,
  featureName: string,
  populationMedian: number,
  predictTier: (f: Record<string, number>) => string,
  steps = 20
): CounterfactualResult | null {
  const currentValue = features[featureName];
  const currentTier = predictTier(features);
  for (let i = 0; i <= steps; i++) {
    const value = currentValue + ((populationMedian - currentValue) * i) / steps;
    const modified = { ...features, [featureName]: value };
    const newTier = predictTier(modified);
    if (newTier !== currentTier) {
      return {
        feature: featureName,
        displayName: FEATURE_DISPLAY[featureName] ?? featureName,
        currentValue,
        suggestedTarget:
          featureName === 'duration_labour_min' ? Math.round(value) : Math.round(value * 10) / 10,
        currentTier,
        projectedTier: newTier,
      };
    }
  }
  return null;
}

/**
 * Client-side LR probability approximation using published model coefficients.
 * Used ONLY for counterfactual grid search (no network call needed per step).
 * Coefficients from MediFlow academic report (March 2026), Mpilo Central Hospital dataset.
 */
const LR_COEFS: Record<string, number> = {
  duration_labour_min: 0.0004,
  hiv_status_num: -0.7501,
  parity_num: 0.0083,
  booked_unbooked: 1.2642,
  delivery_method_clean_lscs: 2.3684,
};
const LR_INTERCEPT = -2.1;

function predictProbClient(features: Record<string, number>): number {
  const logOdds = Object.entries(LR_COEFS).reduce(
    (sum, [k, coef]) => sum + coef * (features[k] ?? 0),
    LR_INTERCEPT
  );
  return 1 / (1 + Math.exp(-logOdds));
}

function predictTierClient(features: Record<string, number>): string {
  return getSeverityTier(predictProbClient(features));
}

// Population medians from generated population_stats.json
const POPULATION_MEDIANS: Record<string, number> = {
  duration_labour_min: 329,
  booked_unbooked: 0,
  delivery_method_clean_lscs: 0,
};

// ── Skeleton ───────────────────────────────────────────────────────────────────

const PageSkeleton = () => (
  <div className="space-y-6">
    <div className="skeleton h-10 w-72 rounded" />
    <div className="skeleton h-48 w-full rounded-xl" />
    <SkeletonCard />
    <div className="grid grid-cols-2 gap-4">
      <SkeletonCard />
      <SkeletonCard />
    </div>
    <SkeletonTable rows={2} cols={4} />
  </div>
);

// ── AbnormalityDot ─────────────────────────────────────────────────────────────

const AbnormalityDot = ({ severity, note }: { severity: 'red' | 'amber'; note: string }) => {
  const colour = severity === 'red' ? PPH_COLOURS.severe.background : PPH_COLOURS.moderate.background;
  const label = severity === 'red' ? 'Critical' : 'Elevated risk';
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium ml-2" title={note} aria-label={`${label}: ${note}`}>
      <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colour }} aria-hidden="true" />
      <span style={{ color: colour }}>{note}</span>
    </span>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const AssessmentResultPage = () => {
  const { id, assessmentId } = useParams<{ id: string; assessmentId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const [xaiTab, setXaiTab] = useState<XAITab>('shap');
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);
  const [confidenceData, setConfidenceData] = useState<ConfidenceResponse | null>(null);
  const [xaiLoading, setXaiLoading] = useState(false);
  const [xaiError, setXaiError] = useState<string | null>(null);
  const [populationStats, setPopulationStats] = useState<PopulationStats | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);

  // Refs for PDF capture
  const riskBannerRef = useRef<HTMLDivElement>(null);
  const xaiSectionRef = useRef<HTMLDivElement>(null);
  const clinicalSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => { dispatch(setPageTitle('Assessment Result')); }, [dispatch]);

  useEffect(() => {
    fetch('/population_stats.json')
      .then((r) => r.json())
      .then(setPopulationStats)
      .catch(() => {});
  }, []);

  const { data: patientData, isLoading } = useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsApi.getById(id!),
    enabled: !!id,
  });

  const patient = patientData?.patient;
  const assessment = patientData?.assessments?.find((a) => a.id === assessmentId);
  const isHigh = assessment?.risk_level === 'HIGH';
  const probability = assessment?.probability_severe_pph ?? 0;
  const severityTier = getSeverityTier(probability);
  const severityColours = getSeverityColours(probability);
  const pctSeverePPH = Math.round(probability * 100);
  const pctNoPPH = Math.round((assessment?.probability_no_pph ?? 0) * 100);

  const fetchXAI = useCallback(async () => {
    if (!assessment) return;
    setXaiLoading(true);
    setXaiError(null);
    try {
      const input = {
        duration_labour_min: assessment.duration_labour_min,
        hiv_status_num: assessment.hiv_status_num,
        parity_num: assessment.parity_num,
        booked_unbooked: assessment.booked_unbooked,
        delivery_method_clean_FORCEPS: assessment.delivery_method_clean_forceps,
        delivery_method_clean_LSCS: assessment.delivery_method_clean_lscs,
      };
      const [explain, conf] = await Promise.all([
        modelXaiApi.explain(input),
        modelXaiApi.confidence(input),
      ]);
      setExplainData(explain);
      setConfidenceData(conf);
    } catch {
      setXaiError('XAI data could not be loaded — model service may be unavailable.');
    } finally {
      setXaiLoading(false);
    }
  }, [assessment]);

  useEffect(() => { if (assessment) fetchXAI(); }, [assessment, fetchXAI]);

  if (isLoading) return <PageSkeleton />;

  if (!assessment || !patient) {
    return (
      <div className="card bg-base-100 shadow-sm p-8 max-w-lg">
        <p className="text-xl font-bold mb-2">Assessment not found</p>
        <p className="text-base-content/60 mb-4">This assessment record could not be loaded.</p>
        <button className="btn btn-ghost btn-sm w-fit" onClick={() => navigate('/patients')}>← Back to Patients</button>
      </div>
    );
  }

  const assessmentFeatures: Record<string, number> = {
    duration_labour_min: assessment.duration_labour_min,
    hiv_status_num: assessment.hiv_status_num,
    parity_num: assessment.parity_num,
    booked_unbooked: assessment.booked_unbooked,
    delivery_method_clean_lscs: assessment.delivery_method_clean_lscs,
  };

  const clinicalNotes = getRelevantClinicalNotes({
    duration_labour_min: assessment.duration_labour_min,
    hiv_status_num: assessment.hiv_status_num,
    parity_num: assessment.parity_num,
    booked_unbooked: assessment.booked_unbooked,
    delivery_method_clean_forceps: assessment.delivery_method_clean_forceps,
    delivery_method_clean_lscs: assessment.delivery_method_clean_lscs,
  });

  const modifiableFeatures = ['duration_labour_min', 'booked_unbooked', 'delivery_method_clean_lscs'];
  const counterfactuals: CounterfactualResult[] = [];
  if (severityTier !== 'mild') {
    const cfFeatures: Record<string, number> = { ...assessmentFeatures };
    for (const feat of modifiableFeatures) {
      if (feat in POPULATION_MEDIANS) {
        const cf = findCounterfactual(cfFeatures, feat, POPULATION_MEDIANS[feat], predictTierClient);
        if (cf) counterfactuals.push(cf);
      }
    }
  }

  const inputHash = btoa(`${assessment.id}:${assessment.duration_labour_min}:${assessment.hiv_status_num}`).slice(0, 12);

  const handleDownloadReport = async () => {
    setReportGenerating(true);

    // Helper: capture a DOM element as a base64 PNG, returns null on failure
    const captureElement = async (el: HTMLElement | null): Promise<string | null> => {
      if (!el) return null;
      try {
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
        return canvas.toDataURL('image/png');
      } catch {
        return null;
      }
    };

    // Capture all three visual sections in parallel
    const [riskImg, xaiImg, clinicalImg] = await Promise.all([
      captureElement(riskBannerRef.current),
      captureElement(xaiSectionRef.current),
      captureElement(clinicalSectionRef.current),
    ]);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 18;
      const contentW = pageW - margin * 2;
      let y = margin;

      const nl = (n = 4) => { y += n; };

      const write = (text: string, size = 10, bold = false, r = 26, g = 37, b = 53) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(r, g, b);
        const lines = doc.splitTextToSize(text, contentW) as string[];
        lines.forEach((line: string) => {
          if (y > 272) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += size * 0.42;
        });
        y += 1;
      };

      const section = (title: string) => {
        y += 4;
        if (y > 265) { doc.addPage(); y = margin; }
        doc.setDrawColor(74, 109, 140);
        doc.line(margin, y, pageW - margin, y);
        y += 5;
        write(title, 11, true, 74, 109, 140);
      };

      // Helper: embed a captured image spanning the content width
      const addImage = (dataUrl: string, captionText?: string) => {
        const imgProps = doc.getImageProperties(dataUrl);
        const imgH = (imgProps.height * contentW) / imgProps.width;
        const maxH = 100; // mm — cap very tall captures
        const drawH = Math.min(imgH, maxH);
        if (y + drawH > 277) { doc.addPage(); y = margin; }
        doc.addImage(dataUrl, 'PNG', margin, y, contentW, drawH);
        y += drawH + 2;
        if (captionText) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(107, 122, 141);
          doc.text(captionText, margin, y);
          y += 4;
        }
      };

      // ── Header bar ──────────────────────────────────────────────────────────
      doc.setFillColor(74, 109, 140);
      doc.rect(0, 0, pageW, 24, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('MediFlow — PPH Risk Assessment Report', margin, 15);
      y = 32;

      write(`Generated: ${new Date().toLocaleString()}   |   Assessment ID: ${assessment.id}`, 8, false, 107, 122, 141);
      nl(2);

      // ── Patient information ──────────────────────────────────────────────────
      section('PATIENT INFORMATION');
      write(`Name:               ${patient.full_name}`);
      write(`Patient ID:         ${patient.patient_id_number}`);
      write(`Age:                ${patient.age} years`);
      write(`Date of Admission:  ${formatDate(patient.date_of_admission)}`);

      // ── Risk result (text summary) ───────────────────────────────────────────
      section('RISK ASSESSMENT RESULT');
      write(`Assessed:    ${formatDateTime(assessment.created_at)}`);
      write(`Assessed By: ${assessment.assessed_by_name}`);
      nl(2);
      write(`Predicted Severity: ${severityColours.label}    ·    Risk Level: ${assessment.risk_level}`, 12, true);
      nl(2);
      write(`Probability of Severe PPH:  ${formatProbability(probability)}`);
      write(`Probability of No PPH:      ${formatProbability(assessment.probability_no_pph)}`);
      if (confidenceData) {
        write(
          `95% Confidence Interval:    ${Math.round(confidenceData.ci_low * 100)}% – ` +
          `${Math.round(confidenceData.ci_high * 100)}%  (${confidenceData.n_bootstrap} bootstrap iterations)`
        );
      }

      // ── Risk gauge + probability breakdown visualisation ─────────────────────
      if (riskImg) {
        nl(3);
        addImage(riskImg, 'Fig 1 — Risk gauge and probability breakdown');
      }

      // ── Clinical input data ──────────────────────────────────────────────────
      section('CLINICAL INPUT DATA');
      write(`Labour Duration:  ${formatMinutesToHours(assessment.duration_labour_min)} (${assessment.duration_labour_min} min)`);
      write(`HIV Status:       ${formatHIVStatus(assessment.hiv_status_num)}`);
      write(`Parity:           ${assessment.parity_num} previous live births`);
      write(`Booking Status:   ${formatBookingStatus(assessment.booked_unbooked)}`);
      write(`Delivery Method:  ${formatDeliveryMethod(assessment.delivery_method_clean_lscs, assessment.delivery_method_clean_forceps)}`);

      // ── Recommendations ──────────────────────────────────────────────────────
      section('RECOMMENDATIONS');
      if (isHigh) {
        write(
          'HIGH RISK: Ensure active management of the third stage of labour, have uterotonics ready, ' +
          'establish IV access, ensure blood products are available, and consider consultant review.',
          10, true
        );
      } else {
        write('LOW RISK: Standard postpartum monitoring protocols apply. Observe for unexpected clinical changes.');
      }

      // ── Clinical decision support notes ─────────────────────────────────────
      section('CLINICAL DECISION SUPPORT NOTES');
      write('Ref: WHO/RHR/12.30  ·  NICE NG121', 8, false, 107, 122, 141);
      nl(1);
      if (clinicalNotes.length === 0) {
        write('No specific clinical flags identified.');
      } else {
        clinicalNotes.forEach((note) => {
          const tag = note.urgency === 'high' ? '[HIGH]   ' : note.urgency === 'medium' ? '[MEDIUM] ' : '[STD]    ';
          write(`${tag}${note.note}`);
          nl(1);
        });
      }

      // ── Clinical section visualisation (inputs + notes) ──────────────────────
      if (clinicalImg) {
        nl(2);
        addImage(clinicalImg, 'Fig 2 — Clinical input data and decision support notes');
      }

      // ── XAI Visualisations ───────────────────────────────────────────────────
      section('CLINICAL EXPLAINABILITY (XAI)');
      if (explainData) {
        nl(1);
        write('SHAP Feature Contributions', 10, true);
        const sorted = Object.entries(explainData.shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        sorted.forEach(([feat, val]) => {
          const display = FEATURE_DISPLAY[feat] ?? feat;
          const dir = val >= 0 ? '↑ increases' : '↓ decreases';
          write(`  ${display}: ${val.toFixed(4)}  (${dir} risk)`);
        });
        nl(1);
      }
      if (xaiImg) {
        addImage(xaiImg, 'Fig 3 — XAI analysis: SHAP contributions, population distribution, feature weights, and counterfactual analysis');
      } else if (!explainData) {
        write('XAI data unavailable — model service was not reachable at time of report generation.', 9, false, 107, 122, 141);
      }

      // ── Counterfactual analysis ──────────────────────────────────────────────
      if (counterfactuals.length > 0) {
        section('COUNTERFACTUAL ANALYSIS (PATH TO LOWER RISK)');
        write('Modifiable changes projected to lower predicted severity tier:', 9, false, 107, 122, 141);
        nl(1);
        counterfactuals.forEach((cf) => {
          write(`  ${cf.displayName}: ${cf.currentValue} → ${cf.suggestedTarget}  (${cf.currentTier} → ${cf.projectedTier})`);
        });
        write('Note: Statistical projection only — not a clinical prescription.', 8, false, 107, 122, 141);
      }

      // ── Audit trail ──────────────────────────────────────────────────────────
      section('AUDIT TRAIL');
      write(`Model:              ${MODEL_VERSION} — SVM (6 features)`);
      write(`Session/Input Hash: ${inputHash}`);
      write(`Assessment ID:      ${assessment.id}`);
      if (confidenceData) {
        write(`Bootstrap CI:       ${confidenceData.n_bootstrap} iterations`);
      }

      // ── Disclaimer ──────────────────────────────────────────────────────────
      section('DISCLAIMER');
      write(
        'MediFlow is a supplementary clinical decision-support tool. Predictions are probabilistic ' +
        'estimates derived from a dataset of 223 patients at Mpilo Central Hospital, Bulawayo, Zimbabwe ' +
        '(DOI: 10.17632/k7z2yywdn5.1). This tool does not replace clinical judgement. ' +
        'Patient data is processed on-premise and is not transmitted to third-party services.',
        8, false, 107, 122, 141
      );

      doc.save(`PPH_Report_${patient.patient_id_number}_${assessment.id.slice(0, 8)}.pdf`);
    } finally {
      setReportGenerating(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 — Page header with patient context & action buttons
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Assessment Result</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-sm text-base-content/55">
            <span className="font-medium text-base-content/80">{patient.full_name}</span>
            <span>·</span>
            <span className="font-mono text-xs">{patient.patient_id_number}</span>
            <span>·</span>
            <span>Age {patient.age}</span>
            <span>·</span>
            <span>Assessed {formatDateTime(assessment.created_at)}</span>
            <span>·</span>
            <span>by {assessment.assessed_by_name}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/patients/${id}`)}>← Patient Record</button>
          <button
            className="btn btn-sm btn-outline"
            onClick={handleDownloadReport}
            disabled={reportGenerating}
          >
            {reportGenerating
              ? <><span className="loading loading-spinner loading-xs" /> Generating…</>
              : '⬇ PDF Report'}
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => navigate(`/patients/${id}/assessments/new`)}>+ New Assessment</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 — Risk result banner: gauge · verdict · prob breakdown
      ══════════════════════════════════════════════════════════════ */}
      <div
        ref={riskBannerRef}
        className="rounded-2xl p-6"
        style={{ background: severityColours.lightBackground, border: `2px solid ${severityColours.border}` }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

          {/* Gauge */}
          <div className="flex justify-center">
            <div className="w-52">
              <RiskGauge probability={probability} />
            </div>
          </div>

          {/* Risk verdict */}
          <div className="text-center space-y-2" style={{ color: severityColours.border }}>
            <div>
              <span
                className="inline-block px-5 py-1.5 rounded-full text-lg font-extrabold tracking-wide"
                style={{ backgroundColor: severityColours.background, color: severityColours.text }}
                aria-label={`Severity: ${severityColours.label}`}
              >
                {severityColours.label}
              </span>
            </div>
            <p className="text-5xl font-extrabold tabular-nums">{formatProbability(probability)}</p>
            <p className="text-sm font-medium opacity-70">probability of Severe PPH</p>
            {confidenceData && (
              <p className="text-xs font-medium opacity-65">
                95% CI: {Math.round(confidenceData.ci_low * 100)}%–{Math.round(confidenceData.ci_high * 100)}%
                &nbsp;·&nbsp;{confidenceData.n_bootstrap} bootstrap iterations
              </p>
            )}
            {xaiLoading && !confidenceData && (
              <p className="text-xs opacity-50 animate-pulse">Computing confidence interval…</p>
            )}
          </div>

          {/* Probability breakdown */}
          <div style={{ color: severityColours.border }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-55 mb-3">Probability Breakdown</p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="opacity-70">No Severe PPH</span>
                  <span className="font-bold">{formatProbability(assessment.probability_no_pph)}</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: 'rgba(255,255,255,0.35)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pctNoPPH}%`, backgroundColor: '#5B8A6F' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="opacity-70">Severe PPH</span>
                  <span className="font-bold">{formatProbability(probability)}</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: 'rgba(255,255,255,0.35)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pctSeverePPH}%`, backgroundColor: PPH_COLOURS.severe.background }} />
                </div>
              </div>
            </div>
            <p className="text-[10px] opacity-45 mt-3 italic">
              {MODEL_VERSION} · LR (5 features) · Supplementary tool only
            </p>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3 — Clinical inputs (left) + Recommendation & notes (right)
      ══════════════════════════════════════════════════════════════ */}
      <div ref={clinicalSectionRef} className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* LEFT — Clinical Input Data */}
        <div className="lg:col-span-2 card bg-base-100 shadow-sm">
          <div className="card-body p-5">
            <h2 className="font-bold text-base mb-4">Clinical Input Data</h2>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-base-content/40 mb-2">Non-Modifiable Factors</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {(['hiv_status_num', 'parity_num'] as const).map((feat) => {
                const flags = ABNORMALITY_FLAGS.filter((f) => f.feature === feat && f.condition(assessmentFeatures[feat]));
                const loinc = FEATURE_LOINC[feat];
                return (
                  <div key={feat} className="rounded-lg bg-base-200 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider font-medium text-base-content/40 mb-0.5 flex items-center gap-1">
                      {FEATURE_DISPLAY[feat]}
                      {loinc && (
                        <span
                          className="text-[9px] opacity-40 border-b border-dotted cursor-help"
                          title={`LOINC ${loinc}`}
                          aria-label={`LOINC code ${loinc}`}
                        >⁺{loinc}</span>
                      )}
                    </p>
                    <p className="font-semibold text-sm leading-snug">
                      {feat === 'hiv_status_num'
                        ? formatHIVStatus(assessment.hiv_status_num)
                        : `${assessment.parity_num} prev. deliveries`}
                    </p>
                    {flags.map((f, i) => <AbnormalityDot key={i} severity={f.severity} note={f.note} />)}
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-base-content/40 mb-2">Modifiable Factors</p>
            <div className="space-y-2">
              {([
                { feat: 'duration_labour_min' as const },
                { feat: 'booked_unbooked' as const },
                { feat: 'delivery_method_clean_lscs' as const },
              ]).map(({ feat }) => {
                const flags = [
                  ...ABNORMALITY_FLAGS.filter((f) => f.feature === feat && f.condition(assessmentFeatures[feat])),
                  ...(feat === 'delivery_method_clean_lscs'
                    ? ABNORMALITY_FLAGS.filter((f) => f.feature === 'delivery_method_clean_forceps' && f.condition(assessment.delivery_method_clean_forceps))
                    : []),
                ];
                const value =
                  feat === 'duration_labour_min'
                    ? `${formatMinutesToHours(assessment.duration_labour_min)} (${assessment.duration_labour_min} min)`
                    : feat === 'booked_unbooked'
                    ? formatBookingStatus(assessment.booked_unbooked)
                    : formatDeliveryMethod(assessment.delivery_method_clean_lscs, assessment.delivery_method_clean_forceps);
                return (
                  <div key={feat} className="rounded-lg bg-base-200 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider font-medium text-base-content/40 mb-0.5">{FEATURE_DISPLAY[feat]}</p>
                    <p className="font-semibold text-sm leading-snug">{value}</p>
                    {flags.map((f, i) => <AbnormalityDot key={i} severity={f.severity} note={f.note} />)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Recommendation + Clinical Decision Support */}
        <div className="lg:col-span-3 space-y-4">

          {/* Recommendation alert */}
          {isHigh ? (
            <div className="rounded-xl p-4" style={{ background: '#FFF3F3', border: '2px solid #E57373' }}>
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="shrink-0 h-5 w-5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#C62828" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-bold" style={{ color: '#C62828' }}>Recommended Actions — HIGH RISK</p>
                  <p className="text-sm mt-1 text-base-content/80">
                    Ensure active management of the third stage of labour, have uterotonics ready,
                    establish IV access, ensure blood products are available, and consider consultant review.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-4" style={{ background: '#F0FFF4', border: '2px solid #66BB6A' }}>
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="shrink-0 h-5 w-5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#2E7D32" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-bold" style={{ color: '#2E7D32' }}>Clinical Note — LOW RISK</p>
                  <p className="text-sm mt-1 text-base-content/80">
                    Standard postpartum monitoring protocols apply. Observe for unexpected clinical changes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Decision Support Notes */}
          <div className="card bg-base-100 shadow-sm flex-1">
            <div className="card-body p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-bold text-base">Clinical Decision Support</h2>
                <span className="text-[10px] text-base-content/30">Ref: WHO/RHR/12.30 · NICE NG121</span>
              </div>
              {clinicalNotes.length === 0 ? (
                <p className="text-sm text-base-content/50 italic">No specific clinical flags identified.</p>
              ) : (
                <ul className="space-y-3">
                  {clinicalNotes.map((note, i) => {
                    const urgencyColour =
                      note.urgency === 'high'
                        ? PPH_COLOURS.severe.background
                        : note.urgency === 'medium'
                        ? PPH_COLOURS.moderate.background
                        : PPH_COLOURS.mild.background;
                    const urgencyLabel =
                      note.urgency === 'high' ? 'High' : note.urgency === 'medium' ? 'Medium' : 'Standard';
                    return (
                      <li key={i} className="flex gap-2.5 text-sm" aria-label={`${urgencyLabel}: ${note.note}`}>
                        <span
                          className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: urgencyColour }}
                          aria-hidden="true"
                        />
                        <span>
                          <span
                            className="text-[10px] font-bold uppercase mr-1.5 px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: urgencyColour + '22', color: urgencyColour }}
                          >{urgencyLabel}</span>
                          <span className="text-base-content/80">{note.note}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4 — XAI Analysis panel with tabs + feature weights
      ══════════════════════════════════════════════════════════════ */}
      <div ref={xaiSectionRef} className="card bg-base-100 shadow-sm">
        <div className="card-body p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-bold text-base">Clinical Explainability (XAI)</h2>
            {xaiLoading && (
              <span className="text-xs text-base-content/40 flex items-center gap-1.5">
                <span className="loading loading-spinner loading-xs" />Loading XAI data…
              </span>
            )}
          </div>

          {xaiError && (
            <div className="alert alert-warning text-sm mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{xaiError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* XAI tab content */}
            <div className="xl:col-span-2 space-y-4">
              <div className="tabs tabs-boxed w-fit" role="tablist" aria-label="XAI visualisation tabs">
                {([['shap', 'SHAP Contributions'], ['population', 'vs. Population'], ['counterfactual', 'Path to Lower Risk']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={xaiTab === key}
                    className={`tab tab-sm ${xaiTab === key ? 'tab-active' : ''}`}
                    onClick={() => setXaiTab(key)}
                  >{label}</button>
                ))}
              </div>

              {xaiTab === 'shap' && (
                <div>
                  <p className="text-xs text-base-content/50 mb-3 italic">
                    SHAP values show how each factor raised or lowered the predicted PPH severity for this specific patient.
                  </p>
                  {xaiLoading && <div className="skeleton h-64 w-full rounded" />}
                  {!xaiLoading && explainData && (
                    <SHAPBarChart
                      shapValues={explainData.shap_values}
                      patientValues={{
                        duration_labour_min: assessment.duration_labour_min,
                        hiv_status_num: formatHIVStatus(assessment.hiv_status_num),
                        parity_num: assessment.parity_num,
                        booked_unbooked: formatBookingStatus(assessment.booked_unbooked),
                        delivery_method_clean_LSCS: formatDeliveryMethod(assessment.delivery_method_clean_lscs, assessment.delivery_method_clean_forceps),
                      }}
                      computedAt={explainData.computed_at}
                    />
                  )}
                  {!xaiLoading && !explainData && !xaiError && (
                    <p className="text-sm text-base-content/40 italic">SHAP data unavailable — model service may be offline.</p>
                  )}
                  {explainData?.method === 'coefficient_fallback' && (
                    <p className="text-xs text-base-content/40 mt-2 italic">Note: Using LR coefficient approximation (SHAP library not installed in model service).</p>
                  )}
                </div>
              )}

              {xaiTab === 'population' && (
                <div className="space-y-6">
                  <p className="text-xs text-base-content/50 italic">
                    Box plots show feature distributions across PPH severity tiers in the training population. The diamond (◆) marks this patient's value.
                  </p>
                  {populationStats ? (
                    <>
                      <PopDistributionChart feature="duration_labour_min" patientValue={assessment.duration_labour_min} populationStats={populationStats} />
                      <PopDistributionChart feature="parity_num" patientValue={assessment.parity_num} populationStats={populationStats} />
                    </>
                  ) : <div className="skeleton h-64 w-full rounded" />}
                </div>
              )}

              {xaiTab === 'counterfactual' && (
                <div>
                  <p className="text-xs text-base-content/50 mb-3 italic">
                    Modifiable changes that would project a lower predicted severity tier. Statistical projection only — not a clinical prescription.
                  </p>
                  {severityTier === 'mild' ? (
                    <div className="alert alert-success text-sm">
                      <span>Patient is already at the lowest predicted severity tier (Mild). No changes required.</span>
                    </div>
                  ) : counterfactuals.length === 0 ? (
                    <div className="alert alert-info text-sm">
                      <span>No single-feature change within the population median range produces a tier change. Risk is driven by fixed factors.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {counterfactuals.map((cf, i) => {
                        const progressPct =
                          typeof cf.currentValue === 'number' && typeof cf.suggestedTarget === 'number'
                            ? Math.min(100, Math.abs(((cf.suggestedTarget - cf.currentValue) / (POPULATION_MEDIANS[cf.feature] - cf.currentValue + 0.001)) * 100))
                            : 50;
                        const targetTierColour = PPH_COLOURS[getSeverityTier(predictProbClient({ ...assessmentFeatures, [cf.feature]: Number(cf.suggestedTarget) }))];
                        return (
                          <div key={i} className="rounded-lg p-3 bg-base-200 border border-base-300">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-sm">{cf.displayName}</p>
                                <p className="text-xs text-base-content/60">Current: <strong>{String(cf.currentValue)}</strong> → Target: <strong>{String(cf.suggestedTarget)}</strong></p>
                              </div>
                              <div className="flex items-center gap-1 text-xs shrink-0">
                                <span className="px-2 py-0.5 rounded text-white font-semibold" style={{ backgroundColor: severityColours.background }} aria-label={`Current: ${cf.currentTier}`}>{cf.currentTier}</span>
                                <span>→</span>
                                <span className="px-2 py-0.5 rounded text-white font-semibold" style={{ backgroundColor: targetTierColour.background }} aria-label={`Projected: ${cf.projectedTier}`}>{cf.projectedTier}</span>
                              </div>
                            </div>
                            <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: '#DDE3EA' }}>
                              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, backgroundColor: targetTierColour.background }} role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} />
                            </div>
                            <p className="text-[11px] text-base-content/40 mt-1">{Math.round(progressPct)}% change toward population median</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-4 rounded-lg p-3 bg-base-200 border border-base-300">
                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2">Non-Modifiable Factors (Fixed)</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-base-content/40 mb-0.5">HIV Status</p>
                        <p className="font-medium">{formatHIVStatus(assessment.hiv_status_num)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-base-content/40 mb-0.5">Parity</p>
                        <p className="font-medium">{assessment.parity_num} previous deliveries</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Feature weights sidebar */}
            <div className="xl:col-span-1">
              <div className="rounded-xl bg-base-200 p-4 h-full">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-base-content/50 mb-3">Model Feature Weights</p>
                <FeatureImportanceChart deliveryLSCS={assessment.delivery_method_clean_lscs} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 5 — Audit trail (collapsible)
      ══════════════════════════════════════════════════════════════ */}
      <div
        className="collapse collapse-arrow rounded-xl"
        style={{ background: '#F4F6F8', border: '1px solid #DDE3EA' }}
      >
        <input type="checkbox" />
        <div className="collapse-title text-xs font-semibold uppercase tracking-widest py-3" style={{ color: '#6B7A8D' }}>
          Data Provenance &amp; Audit Trail
        </div>
        <div className="collapse-content text-xs" style={{ color: '#6B7A8D' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1.5 pb-3">
            <p><strong>Inference Timestamp:</strong> {formatDateTime(assessment.created_at)}</p>
            <p><strong>Assessed By:</strong> {assessment.assessed_by_name}</p>
            <p><strong>Model Version:</strong> {MODEL_VERSION} — Logistic Regression, scikit-learn 1.5.2</p>
            <p><strong>Assessment ID:</strong> <span className="font-mono">{assessment.id}</span></p>
            <p><strong>Session / Input Hash:</strong> <span className="font-mono">{inputHash}</span></p>
            {confidenceData && (
              <p><strong>Confidence:</strong> 95% CI [{Math.round(confidenceData.ci_low * 100)}%–{Math.round(confidenceData.ci_high * 100)}%] · {confidenceData.n_bootstrap} bootstrap iterations</p>
            )}
          </div>
          <hr className="mb-2" style={{ borderColor: '#DDE3EA' }} />
          <p className="italic mb-1">
            <strong>Clinical Disclaimer:</strong> MediFlow is a supplementary clinical decision-support tool.
            Predictions are probabilistic estimates derived from 223 patients at Mpilo Central Hospital, Bulawayo, Zimbabwe
            (DOI: 10.17632/k7z2yywdn5.1). Does not replace clinical judgement. Ref: WHO PPH Prevention Guidelines (WHO/RHR/12.30).
          </p>
          <p className="italic">
            <strong>Privacy Note:</strong> Patient data is processed on-premise and is not transmitted to third-party services.
            Comply with local data protection regulations at all times.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 6 — Navigation actions
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/patients/${id}`)}>← Patient Record</button>
        <button
          className="btn btn-outline btn-sm"
          onClick={handleDownloadReport}
          disabled={reportGenerating}
        >
          {reportGenerating
            ? <><span className="loading loading-spinner loading-xs" /> Generating…</>
            : '⬇ Download PDF Report'}
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/patients/${id}/assessments/new`)}>+ New Assessment</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/patients/${id}/trends`)}>View Trends</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patients')}>All Patients</button>
      </div>

    </div>
  );
};