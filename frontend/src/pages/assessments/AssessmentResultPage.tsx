import { useEffect, useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { patientsApi } from '../../api/patients';
import { modelXaiApi } from '../../api/modelXai';
import type { ExplainResponse, ConfidenceResponse } from '../../api/modelXai';
import { PageHeader } from '../../components/common/PageHeader';
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

  const handleDownloadReport = () => {
    setReportGenerating(true);
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

      // ── Risk result ─────────────────────────────────────────────────────────
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

      // ── Clinical input data ──────────────────────────────────────────────────
      section('CLINICAL INPUT DATA');
      write(`Labour Duration:  ${formatMinutesToHours(assessment.duration_labour_min)} (${assessment.duration_labour_min} min)`);
      write(`HIV Status:       ${formatHIVStatus(assessment.hiv_status_num)}`);
      write(`Parity:           ${assessment.parity_num} previous live births`);
      write(`Booking Status:   ${formatBookingStatus(assessment.booked_unbooked)}`);
      write(`Delivery Method:  ${formatDeliveryMethod(assessment.delivery_method_clean_lscs)}`);

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

      // ── Audit trail ──────────────────────────────────────────────────────────
      section('AUDIT TRAIL');
      write(`Model:              ${MODEL_VERSION} — Logistic Regression (5 features)`);
      write(`Session/Input Hash: ${inputHash}`);
      write(`Assessment ID:      ${assessment.id}`);

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
    <div className="space-y-6">
      <PageHeader title="Assessment Result" subtitle={`Patient: ${patient.full_name} — ${patient.patient_id_number}`} />
      <p className="text-sm text-base-content/50 -mt-4">Assessed: {formatDateTime(assessment.created_at)}</p>

      {/* ═══ ZONE A — Patient Headline Banner ═══ */}
      <div className="rounded-2xl p-6" style={{ background: severityColours.lightBackground, border: `2px solid ${severityColours.border}`, color: severityColours.border }}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="w-full lg:w-64 flex-shrink-0">
            <RiskGauge probability={probability} />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-4 py-1.5 rounded-full text-xl font-extrabold tracking-wide" style={{ backgroundColor: severityColours.background, color: severityColours.text }} aria-label={`Severity: ${severityColours.label}`}>
                {severityColours.label}
              </span>
              <span className="text-3xl font-bold">
                {formatProbability(probability)}
                <span className="text-base font-normal ml-2 opacity-70">probability of Severe PPH</span>
              </span>
            </div>
            {confidenceData && (
              <p className="text-base font-medium">
                <span className="font-semibold">{Math.round(confidenceData.risk * 100)}%</span>
                <span className="opacity-70 ml-1">[95% CI: {Math.round(confidenceData.ci_low * 100)}%–{Math.round(confidenceData.ci_high * 100)}% · n={confidenceData.n_bootstrap} bootstrap iterations]</span>
              </p>
            )}
            {xaiLoading && <p className="text-sm opacity-60">Computing confidence interval…</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm opacity-80">
              <span><strong>Patient:</strong> {patient.full_name}</span>
              <span><strong>Age:</strong> {patient.age} years</span>
              <span><strong>ID:</strong> {patient.patient_id_number}</span>
            </div>
            <div className="text-xs rounded-lg px-3 py-2 mt-2" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.1)' }}>
              <strong>Model Transparency:</strong> {MODEL_VERSION} · Logistic Regression (5 features) ·
              Inference: {formatDateTime(assessment.created_at)} ·{' '}
              <em>Limitation: Trained on 223 patients from a single Zimbabwean facility. Supplementary tool only — not a replacement for clinical judgement.</em>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT GRID — B + C + D ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ZONE B — Input Summary */}
        <div className="xl:col-span-3 space-y-4">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-3">Input Data Summary</h3>
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2">Non-Modifiable Factors</p>
                {(['hiv_status_num', 'parity_num'] as const).map((feat) => {
                  const flags = ABNORMALITY_FLAGS.filter((f) => f.feature === feat && f.condition(assessmentFeatures[feat]));
                  const loinc = FEATURE_LOINC[feat];
                  return (
                    <div key={feat} className="py-2 border-b border-base-200 last:border-0">
                      <p className="text-xs text-base-content/50 flex items-center gap-1">
                        {FEATURE_DISPLAY[feat]}
                        {loinc && <span className="text-[10px] opacity-50 cursor-help border-b border-dotted" title={`LOINC ${loinc}`} aria-label={`LOINC code ${loinc}`}>⁺{loinc}</span>}
                      </p>
                      <p className="font-semibold text-sm">
                        {feat === 'hiv_status_num' ? formatHIVStatus(assessment.hiv_status_num) : `${assessment.parity_num} previous deliveries`}
                      </p>
                      {flags.map((f, i) => <AbnormalityDot key={i} severity={f.severity} note={f.note} />)}
                    </div>
                  );
                })}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2">Modifiable Factors</p>
                {([
                  { feat: 'duration_labour_min' },
                  { feat: 'booked_unbooked' },
                  { feat: 'delivery_method_clean_lscs' },
                ] as const).map(({ feat }) => {
                  const flags = ABNORMALITY_FLAGS.filter((f) => f.feature === feat && f.condition(assessmentFeatures[feat]));
                  return (
                    <div key={feat} className="py-2 border-b border-base-200 last:border-0">
                      <p className="text-xs text-base-content/50">{FEATURE_DISPLAY[feat]}</p>
                      <p className="font-semibold text-sm">
                        {feat === 'duration_labour_min' ? `${formatMinutesToHours(assessment.duration_labour_min)} (${assessment.duration_labour_min} min)`
                          : feat === 'booked_unbooked' ? formatBookingStatus(assessment.booked_unbooked)
                          : formatDeliveryMethod(assessment.delivery_method_clean_lscs)}
                      </p>
                      {flags.map((f, i) => <AbnormalityDot key={i} severity={f.severity} note={f.note} />)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-2">Model Feature Weights</h3>
              <FeatureImportanceChart deliveryLSCS={assessment.delivery_method_clean_lscs} />
            </div>
          </div>
        </div>

        {/* ZONE C — XAI Tabs */}
        <div className="xl:col-span-6">
          <div className="card bg-base-100 shadow-sm h-full">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-3">Clinical Explainability (XAI)</h3>
              <div className="tabs tabs-boxed mb-4" role="tablist" aria-label="XAI visualisation tabs">
                {([['shap','SHAP Contributions'],['population','vs. Population'],['counterfactual','Path to Lower Risk']] as const).map(([key, label]) => (
                  <button key={key} role="tab" aria-selected={xaiTab === key} className={`tab tab-sm ${xaiTab === key ? 'tab-active' : ''}`} onClick={() => setXaiTab(key)}>{label}</button>
                ))}
              </div>
              {xaiError && (
                <div className="alert alert-warning text-sm mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>{xaiError}</span>
                </div>
              )}
              {xaiTab === 'shap' && (
                <div>
                  <p className="text-xs text-base-content/50 mb-3 italic">SHAP values show how each factor raised or lowered the predicted PPH severity for this specific patient. Computed live on submission.</p>
                  {xaiLoading && <div className="skeleton h-64 w-full rounded" />}
                  {!xaiLoading && explainData && (
                    <SHAPBarChart
                      shapValues={explainData.shap_values}
                      patientValues={{
                        duration_labour_min: assessment.duration_labour_min,
                        hiv_status_num: formatHIVStatus(assessment.hiv_status_num),
                        parity_num: assessment.parity_num,
                        booked_unbooked: formatBookingStatus(assessment.booked_unbooked),
                        delivery_method_clean_LSCS: formatDeliveryMethod(assessment.delivery_method_clean_lscs),
                      }}
                      computedAt={explainData.computed_at}
                    />
                  )}
                  {!xaiLoading && !explainData && !xaiError && <p className="text-sm text-base-content/40 italic">SHAP data unavailable — model service may be offline.</p>}
                  {explainData?.method === 'coefficient_fallback' && <p className="text-xs text-base-content/40 mt-2 italic">Note: Using LR coefficient approximation (SHAP library not installed in model service).</p>}
                </div>
              )}
              {xaiTab === 'population' && (
                <div className="space-y-6">
                  <p className="text-xs text-base-content/50 italic">Box plots show the distribution of each feature across PPH severity tiers in the training population. The diamond (◆) marks this patient's value.</p>
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
                  <p className="text-xs text-base-content/50 mb-3 italic">Grid-search analysis showing what changes to modifiable factors would project a lower predicted severity tier. Statistical projection only — not a clinical prescription.</p>
                  {severityTier === 'mild' ? (
                    <div className="alert alert-success text-sm"><span>Patient is already at the lowest predicted severity tier (Mild). No counterfactual changes required.</span></div>
                  ) : counterfactuals.length === 0 ? (
                    <div className="alert alert-info text-sm"><span>No single-feature change within the population median range produces a tier change. Risk is driven by fixed factors.</span></div>
                  ) : (
                    <div className="space-y-3">
                      {counterfactuals.map((cf, i) => {
                        const progressPct = typeof cf.currentValue === 'number' && typeof cf.suggestedTarget === 'number'
                          ? Math.min(100, Math.abs(((cf.suggestedTarget - cf.currentValue) / (POPULATION_MEDIANS[cf.feature] - cf.currentValue + 0.001)) * 100))
                          : 50;
                        const targetTierColour = PPH_COLOURS[getSeverityTier(predictProbClient({ ...assessmentFeatures, [cf.feature]: Number(cf.suggestedTarget) }))];
                        return (
                          <div key={i} className="rounded-lg p-3 bg-base-200 border border-base-300">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-sm">{cf.displayName}</p>
                                <p className="text-xs text-base-content/60">Current: <strong>{String(cf.currentValue)}</strong> → Suggested: <strong>{String(cf.suggestedTarget)}</strong></p>
                              </div>
                              <div className="text-right text-xs">
                                <span className="inline-block px-2 py-0.5 rounded text-white font-semibold" style={{ backgroundColor: severityColours.background }} aria-label={`Current: ${cf.currentTier}`}>{cf.currentTier}</span>
                                <span className="mx-1">→</span>
                                <span className="inline-block px-2 py-0.5 rounded text-white font-semibold" style={{ backgroundColor: targetTierColour.background }} aria-label={`Projected: ${cf.projectedTier}`}>{cf.projectedTier}</span>
                              </div>
                            </div>
                            <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: '#DDE3EA' }}>
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
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-xs text-base-content/40">HIV Status</span><p className="font-medium">{formatHIVStatus(assessment.hiv_status_num)}</p></div>
                      <div><span className="text-xs text-base-content/40">Parity</span><p className="font-medium">{assessment.parity_num} previous deliveries</p></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ZONE D — Recommendations + Clinical Notes */}
        <div className="xl:col-span-3 space-y-4">
          {isHigh ? (
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <h3 className="font-bold">Recommended Actions</h3>
                <p className="text-sm mt-1">This patient has been identified as <strong>HIGH RISK</strong> for Severe PPH. Ensure active management of the third stage of labour, have uterotonics ready, establish IV access, ensure blood products are available, and consider consultant review.</p>
              </div>
            </div>
          ) : (
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <h3 className="font-bold">Clinical Note</h3>
                <p className="text-sm mt-1">This patient has been assessed as <strong>LOW RISK</strong> for Severe PPH. Standard postpartum monitoring protocols apply. Observe for unexpected clinical changes.</p>
              </div>
            </div>
          )}

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-3">Clinical Decision Support Notes</h3>
              <p className="text-xs text-base-content/40 mb-3 italic">Static clinical protocol lookup table. Ref: WHO/RHR/12.30 · NICE NG121</p>
              {clinicalNotes.length === 0 ? (
                <p className="text-sm text-base-content/50">No specific clinical flags identified.</p>
              ) : (
                <ul className="space-y-3">
                  {clinicalNotes.map((note, i) => {
                    const urgencyColour = note.urgency === 'high' ? PPH_COLOURS.severe.background : note.urgency === 'medium' ? PPH_COLOURS.moderate.background : PPH_COLOURS.mild.background;
                    const urgencyLabel = note.urgency === 'high' ? 'High priority' : note.urgency === 'medium' ? 'Medium priority' : 'Standard';
                    return (
                      <li key={i} className="flex gap-2 text-sm" aria-label={`${urgencyLabel}: ${note.note}`}>
                        <span className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: urgencyColour }} aria-hidden="true" />
                        <span><span className="text-[10px] font-bold uppercase mr-1" style={{ color: urgencyColour }}>[{urgencyLabel}]</span>{note.note}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-3">Probability Breakdown</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-sm mb-1" style={{ color: '#6B7A8D' }}>No Severe PPH</p>
                  <p className="text-2xl font-bold" style={{ color: '#5B8A6F' }}>{formatProbability(assessment.probability_no_pph)}</p>
                  <div className="w-full mt-2 rounded-full overflow-hidden" style={{ height: '6px', background: '#DDE3EA' }}>
                    <div className="h-full rounded-full" style={{ width: `${pctNoPPH}%`, backgroundColor: '#5B8A6F' }} />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-sm mb-1" style={{ color: '#6B7A8D' }}>Severe PPH</p>
                  <p className="text-2xl font-bold" style={{ color: PPH_COLOURS.severe.background }}>{formatProbability(probability)}</p>
                  <div className="w-full mt-2 rounded-full overflow-hidden" style={{ height: '6px', background: '#DDE3EA' }}>
                    <div className="h-full rounded-full" style={{ width: `${pctSeverePPH}%`, backgroundColor: PPH_COLOURS.severe.background }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ INPUT DATA SUMMARY — collapsible ═══ */}
      <div className="collapse collapse-arrow bg-base-100 shadow-sm">
        <input type="checkbox" />
        <div className="collapse-title text-base font-medium">Assessment Input Data — Click to expand</div>
        <div className="collapse-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-2">
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">Duration of Labour</p>
              <p className="font-semibold">{formatMinutesToHours(assessment.duration_labour_min)}</p>
              <p className="text-xs text-base-content/40">{assessment.duration_labour_min} minutes</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">HIV Status</p>
              <p className="font-semibold">{formatHIVStatus(assessment.hiv_status_num)}</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">Parity</p>
              <p className="font-semibold">{assessment.parity_num} previous live births</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">Booking Status</p>
              <p className="font-semibold">{formatBookingStatus(assessment.booked_unbooked)}</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">Delivery Method</p>
              <p className="font-semibold">{formatDeliveryMethod(assessment.delivery_method_clean_lscs)}</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">Assessed By</p>
              <p className="font-semibold">{assessment.assessed_by_name}</p>
            </div>
          </div>
          <p className="text-xs text-base-content/30 mt-4">Assessment ID: {assessment.id}</p>
        </div>
      </div>

      {/* ═══ ZONE E — Audit Trail ═══ */}
      <div className="rounded-xl p-4 text-xs space-y-1" style={{ background: '#F4F6F8', border: '1px solid #DDE3EA', color: '#6B7A8D' }}>
        <p className="font-semibold text-[11px] uppercase tracking-widest mb-2" style={{ color: '#1A2535' }}>
          Data Provenance &amp; Audit Trail
        </p>
        <p><strong>Inference Timestamp:</strong> {formatDateTime(assessment.created_at)}</p>
        <p><strong>Model Version:</strong> {MODEL_VERSION} — Logistic Regression, scikit-learn 1.5.2</p>
        <p><strong>Session / Input Hash:</strong> {inputHash}</p>
        <p><strong>Assessed By:</strong> {assessment.assessed_by_name}</p>
        {confidenceData && <p><strong>Confidence:</strong> 95% CI [{Math.round(confidenceData.ci_low * 100)}%–{Math.round(confidenceData.ci_high * 100)}%] · {confidenceData.n_bootstrap} bootstrap iterations</p>}
        <hr className="my-2 border-base-300" />
        <p className="italic"><strong>Clinical Disclaimer:</strong> MediFlow is a supplementary clinical decision-support tool. Predictions are probabilistic estimates derived from a dataset of 223 patients at Mpilo Central Hospital, Bulawayo, Zimbabwe (DOI: 10.17632/k7z2yywdn5.1). This tool does not replace clinical judgement. Reference: WHO PPH Prevention Guidelines (WHO/RHR/12.30).</p>
        <p className="italic"><strong>Privacy Note:</strong> Patient data is processed on-premise and is not transmitted to third-party services. Comply with local data protection regulations at all times.</p>
      </div>

      {/* ═══ ACTION BUTTONS ═══ */}
      <div className="flex flex-wrap gap-3 pb-6">
        <button className="btn btn-primary" onClick={() => navigate(`/patients/${id}`)}>← Patient Record</button>
        <button
          className="btn btn-outline"
          onClick={handleDownloadReport}
          disabled={reportGenerating}
        >
          {reportGenerating && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {reportGenerating ? 'Generating…' : '⬇ Download PDF Report'}
        </button>
        <button className="btn btn-outline" onClick={() => navigate(`/patients/${id}/assessments/new`)}>Run Another Assessment</button>
        <button className="btn btn-ghost" onClick={() => navigate(`/patients/${id}/trends`)}>View Temporal Trends</button>
        <button className="btn btn-ghost" onClick={() => navigate('/patients')}>Back to Patients List</button>
      </div>
    </div>
  );
};