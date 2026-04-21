import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { PageHeader } from '../../components/common/PageHeader';
import { MODEL_VERSION } from '../../theme/pphTheme';

type Tab = 'dataset' | 'architecture' | 'comparison';

const MODELS = [
  { name: 'Logistic Regression', acc: 0.7612, auc: 0.7420, prec: 0.5909, recall: 0.6500, f1: 0.6190, isActive: true },
  { name: 'Decision Tree',       acc: 0.6716, auc: 0.6734, prec: 0.4643, recall: 0.6500, f1: 0.5417, isActive: false },
  { name: 'Random Forest',       acc: 0.7463, auc: 0.7670, prec: 0.5600, recall: 0.7000, f1: 0.6222, isActive: false },
  { name: 'SVM',                 acc: 0.8060, auc: 0.7973, prec: 0.6522, recall: 0.7500, f1: 0.6977, isActive: false },
  { name: 'Gradient Boosting',   acc: 0.7015, auc: 0.7202, prec: 0.5000, recall: 0.7000, f1: 0.5833, isActive: false },
  { name: 'MLP Neural Network',  acc: 0.7761, auc: 0.8527, prec: 0.6190, recall: 0.6500, f1: 0.6341, isActive: false },
  { name: 'XGBoost',             acc: 0.7612, auc: 0.7601, prec: 0.5909, recall: 0.6500, f1: 0.6190, isActive: false },
];

const FEATURES = [
  {
    name: 'duration_labour_min',
    displayName: 'Duration of Labour (min)',
    type: 'Continuous',
    range: '≥ 0 minutes',
    description: 'Total duration of active labour from onset to delivery in minutes.',
    coefficient: 0.0004,
    loinc: null,
  },
  {
    name: 'hiv_status_num',
    displayName: 'HIV Status',
    type: 'Binary (0/1)',
    range: '0 = Negative, 1 = Positive',
    description: 'Patient HIV status at time of delivery. Note: coefficient is negative in this dataset — may reflect confounding from increased monitoring intensity for HIV+ patients.',
    coefficient: -0.7501,
    loinc: '55277-8',
  },
  {
    name: 'parity_num',
    displayName: 'Parity',
    type: 'Integer',
    range: '≥ 0',
    description: 'Number of previous live births. Grand multiparity (≥4) is a recognised clinical risk factor independent of model output.',
    coefficient: 0.0083,
    loinc: null,
  },
  {
    name: 'booked_unbooked',
    displayName: 'Booking Status',
    type: 'Binary (0/1)',
    range: '0 = Booked (antenatal care), 1 = Unbooked',
    description: 'Whether the patient attended antenatal care. Unbooked patients (1) have significantly higher predicted risk — consistent with poorer antenatal risk identification.',
    coefficient: 1.2642,
    loinc: null,
  },
  {
    name: 'delivery_method_clean_LSCS',
    displayName: 'Delivery: LSCS',
    type: 'Binary (0/1)',
    range: '0 = Vaginal, 1 = LSCS (Caesarean)',
    description: 'Whether delivery was by Lower Segment Caesarean Section. LSCS is the strongest single predictor in this model (coefficient +2.37).',
    coefficient: 2.3684,
    loinc: null,
  },
];

export const AboutPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [tab, setTab] = useState<Tab>('dataset');

  useEffect(() => { dispatch(setPageTitle('About & Dataset')); }, [dispatch]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dataset', label: 'Dataset Details' },
    { key: 'architecture', label: 'Model Architecture' },
    { key: 'comparison', label: 'All Models Comparison' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="About MediFlow & Dataset" subtitle={`${MODEL_VERSION} — Mpilo Central Hospital PPH Prediction Study`} />

      {/* Tab navigation */}
      <div className="tabs tabs-boxed" role="tablist" aria-label="About page tabs">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`tab ${tab === key ? 'tab-active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Dataset Details ──────────────────────────────────────────────────── */}
      {tab === 'dataset' && (
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <h3 className="font-bold text-base mb-4">Dataset Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                {[
                  ['Facility', 'Mpilo Central Hospital, Bulawayo, Zimbabwe'],
                  ['Total Records', '223 patients'],
                  ['Outcome', 'Severe Postpartum Hemorrhage (PPH)'],
                  ['Positive Cases (Severe PPH)', '40 (17.9%)'],
                  ['Data Period', 'Retrospective obstetric records'],
                  ['Dataset DOI', '10.17632/k7z2yywdn5.1 (Mendeley Data)'],
                  ['Lead Contributor', 'Solwayo Ngwenya'],
                  ['Evaluation Method', 'Leave-one-out cross-validation'],
                  ['Primary Reference', 'WHO/RHR/12.30 PPH Prevention Guidelines'],
                  ['Severity: Mild',    '118 patients (52.9%) — probability < 33%'],
                  ['Severity: Moderate', '67 patients (30.0%) — probability 33–66%'],
                  ['Severity: Severe',  '38 patients (17.0%) — probability > 66%'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">{label}</p>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <h3 className="font-bold text-base mb-4">Feature Definitions</h3>
              <p className="text-xs text-base-content/40 mb-4 italic">All 5 features used in the deployed Logistic Regression model. Population medians: duration_labour_min = 329 min, parity = 1.</p>
              <div className="space-y-4">
                {FEATURES.map((f) => (
                  <div key={f.name} className="rounded-xl p-4 bg-base-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{f.displayName}</p>
                        <p className="text-xs text-base-content/50 font-mono mt-0.5">{f.name}{f.loinc && ` · LOINC ${f.loinc}`}</p>
                      </div>
                      <div className="text-right text-xs">
                        <span className="px-2 py-0.5 rounded bg-base-300 font-medium">{f.type}</span>
                        <p className="text-base-content/50 mt-1">{f.range}</p>
                      </div>
                    </div>
                    <p className="text-sm text-base-content/70 mt-2">{f.description}</p>
                    <p className="text-xs font-mono mt-1.5">
                      <span className="text-base-content/40">LR coefficient: </span>
                      <span className={f.coefficient > 0 ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>
                        {f.coefficient > 0 ? '+' : ''}{f.coefficient}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <h3 className="font-bold text-base mb-3">Citation</h3>
              <div className="rounded-xl p-4 bg-base-200 font-mono text-xs leading-relaxed text-base-content/70">
                Ngwenya S. et al. (2024). <em>Postpartum Haemorrhage prediction dataset — Mpilo Central Hospital, Bulawayo, Zimbabwe.</em>{' '}
                Mendeley Data. DOI:{' '}
                <a href="https://doi.org/10.17632/k7z2yywdn5.1" target="_blank" rel="noopener noreferrer" className="link link-primary" aria-label="Dataset DOI link (opens in new tab)">
                  10.17632/k7z2yywdn5.1
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Model Architecture ───────────────────────────────────────────────── */}
      {tab === 'architecture' && (
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <h3 className="font-bold text-base mb-4">Model Architecture — {MODEL_VERSION}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {[
                  ['Algorithm', 'Logistic Regression'],
                  ['Library', 'scikit-learn 1.5.2'],
                  ['Model File', 'final_lr_model.joblib'],
                  ['Input Features', '5 (see Feature Definitions)'],
                  ['Output', 'probability_severe_pph, probability_no_pph, risk_level (HIGH/LOW)'],
                  ['Preprocessing', 'StandardScaler applied to all features'],
                  ['Decision Boundary', 'Linear (logit function)'],
                  ['Regularisation', 'L2 (default C=1.0)'],
                  ['Intercept', '−2.10 (approximate)'],
                  ['Explainability', 'SHAP LinearExplainer (shap==0.45.1)'],
                  ['Fallback XAI', 'Coefficient × feature value (when SHAP unavailable)'],
                  ['Confidence Intervals', 'Bootstrap: 100 iterations, Gaussian coefficient perturbation'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">{label}</p>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <h3 className="font-bold text-base mb-3">Severity Tier Thresholds</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { tier: 'Mild', range: '< 33%', description: 'Low predicted risk of severe PPH. Standard monitoring applies.', bg: '#EAF4EE', border: '#388E3C', text: '#2E6B4A' },
                  { tier: 'Moderate', range: '33% – 66%', description: 'Elevated risk. Increased vigilance and PPH preparedness recommended.', bg: '#FFF3E0', border: '#F57C00', text: '#BF360C' },
                  { tier: 'Severe', range: '> 66%', description: 'High risk. Active PPH prevention measures and consultant review advised.', bg: '#FDECEA', border: '#D32F2F', text: '#921B21' },
                ].map((t) => (
                  <div key={t.tier} className="rounded-xl p-4" style={{ backgroundColor: t.bg, border: `1px solid ${t.border}` }}>
                    <p className="text-lg font-extrabold" style={{ color: t.text }}>{t.tier}</p>
                    <p className="text-base font-semibold mt-0.5" style={{ color: t.text }}>{t.range}</p>
                    <p className="text-xs mt-2" style={{ color: t.text, opacity: 0.75 }}>{t.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <h3 className="font-bold text-base mb-3">LR Coefficients (Published)</h3>
              <p className="text-xs text-base-content/40 mb-4 italic">From Ngwenya et al. academic report. Used for client-side counterfactual grid search.</p>
              <table className="table table-sm text-sm">
                <thead>
                  <tr><th>Feature</th><th className="text-right">Coefficient</th><th>Direction</th></tr>
                </thead>
                <tbody>
                  {FEATURES.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)).map((f) => (
                    <tr key={f.name}>
                      <td className="font-mono text-xs">{f.name}</td>
                      <td className="text-right font-mono font-semibold" style={{ color: f.coefficient > 0 ? '#D32F2F' : '#388E3C' }}>
                        {f.coefficient > 0 ? '+' : ''}{f.coefficient}
                      </td>
                      <td className="text-xs text-base-content/60">{f.coefficient > 0 ? 'Increases PPH risk' : 'Decreases PPH risk'}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="font-mono text-xs italic text-base-content/50">intercept</td>
                    <td className="text-right font-mono">−2.10</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── All Models Comparison ────────────────────────────────────────────── */}
      {tab === 'comparison' && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-5">
            <h3 className="font-bold text-base mb-3">All Models Comparison</h3>
            <p className="text-xs text-base-content/40 mb-4 italic">
              Evaluation results from Ngwenya et al. academic report. All models evaluated on the same 223-patient Mpilo dataset via leave-one-out cross-validation.
              Logistic Regression was selected for deployment due to its interpretability, calibration properties, and regulatory transparency advantages.
            </p>
            <div className="overflow-x-auto">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th className="text-center">Accuracy</th>
                    <th className="text-center">AUC-ROC</th>
                    <th className="text-center">Precision</th>
                    <th className="text-center">Recall</th>
                    <th className="text-center">F1</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MODELS.map((m) => (
                    <tr key={m.name} className={m.isActive ? 'bg-blue-50 font-semibold' : ''}>
                      <td>{m.name}</td>
                      <td className="text-center font-mono">{(m.acc * 100).toFixed(1)}%</td>
                      <td className="text-center font-mono">{m.auc.toFixed(4)}</td>
                      <td className="text-center font-mono">{m.prec.toFixed(4)}</td>
                      <td className="text-center font-mono">{m.recall.toFixed(4)}</td>
                      <td className="text-center font-mono">{m.f1.toFixed(4)}</td>
                      <td className="text-center">
                        {m.isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: '#4A6D8C' }}>Deployed</span>
                        ) : (
                          <span className="text-base-content/40 text-xs">Evaluated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-xl p-4 text-xs bg-base-200 text-base-content/60">
              <strong>Why Logistic Regression?</strong> While SVM achieved the highest accuracy (80.6%) and F1 (0.6977), Logistic Regression was selected for deployment because: (1) it produces calibrated probability estimates directly interpretable as risk probabilities; (2) it supports SHAP LinearExplainer for per-patient clinical transparency; (3) its coefficients are directly auditable by clinical governance teams; (4) its linear decision boundary reduces the risk of overfitting on a small dataset (n=223); and (5) it satisfies clinical decision-support explainability requirements.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
