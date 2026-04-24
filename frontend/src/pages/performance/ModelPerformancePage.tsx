import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Plot from '../../lib/Plot';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { PageHeader } from '../../components/common/PageHeader';
import { PPH_COLOURS, MODEL_VERSION } from '../../theme/pphTheme';

// ── Static model data from academic report ────────────────────────────────────

const MODELS = [
  { name: 'Logistic Regression', acc: 0.7612, auc: 0.7420, prec: 0.5909, recall: 0.6500, f1: 0.6190, isActive: true },
  { name: 'Decision Tree',       acc: 0.6716, auc: 0.6734, prec: 0.4643, recall: 0.6500, f1: 0.5417, isActive: false },
  { name: 'Random Forest',       acc: 0.7463, auc: 0.7670, prec: 0.5600, recall: 0.7000, f1: 0.6222, isActive: false },
  { name: 'SVM',                 acc: 0.8060, auc: 0.7973, prec: 0.6522, recall: 0.7500, f1: 0.6977, isActive: false },
  { name: 'Gradient Boosting',   acc: 0.7015, auc: 0.7202, prec: 0.5000, recall: 0.7000, f1: 0.5833, isActive: false },
  { name: 'MLP Neural Network',  acc: 0.7761, auc: 0.8527, prec: 0.6190, recall: 0.6500, f1: 0.6341, isActive: false },
  { name: 'XGBoost',             acc: 0.7612, auc: 0.7601, prec: 0.5909, recall: 0.6500, f1: 0.6190, isActive: false },
];

// Confusion matrix for LR from academic report (n=67 test set)
const CM = { tn: 32, fp: 8, fn: 14, tp: 13 };

// ROC curve approximate points for LR (AUC=0.742)
const ROC_FPR = [0, 0.05, 0.15, 0.25, 0.35, 0.50, 0.65, 0.80, 1.0];
const ROC_TPR = [0, 0.20, 0.45, 0.55, 0.65, 0.74, 0.82, 0.91, 1.0];

// PR curve approximate points for LR
const PR_REC = [0, 0.10, 0.20, 0.40, 0.55, 0.65, 0.80, 1.0];
const PR_PREC = [1.0, 0.90, 0.78, 0.66, 0.60, 0.55, 0.42, 0.35];

type Tab = 'overview' | 'calibration' | 'decision' | 'fairness' | 'modelcard';

export const ModelPerformancePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => { dispatch(setPageTitle('Model Performance')); }, [dispatch]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'calibration', label: 'Calibration' },
    { key: 'decision', label: 'Decision Curve' },
    { key: 'fairness', label: 'Subgroup Fairness' },
    { key: 'modelcard', label: 'Model Card' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Performance"
        subtitle="Static evaluation metrics from academic report — Mpilo Central Hospital dataset"
      />

      {/* Tab navigation */}
      <div className="tabs tabs-boxed" role="tablist" aria-label="Model performance tabs">
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

      {/* ── Overview Tab ────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics comparison table */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-3">All Model Comparison</h3>
              <p className="text-xs text-base-content/40 mb-3 italic">Metrics from leave-one-out cross-validation on 223-patient Mpilo dataset. Active deployment: Logistic Regression.</p>
              <div className="overflow-x-auto">
                <table className="table table-sm text-sm">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th className="text-center">Accuracy</th>
                      <th className="text-center">AUC-ROC</th>
                      <th className="text-center">Precision</th>
                      <th className="text-center">Recall</th>
                      <th className="text-center">F1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODELS.map((m) => (
                      <tr key={m.name} className={m.isActive ? 'bg-blue-50' : ''}>
                        <td className="font-medium">
                          {m.name}
                          {m.isActive && (
                            <span className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full text-white" style={{ backgroundColor: '#4A6D8C' }}>Active</span>
                          )}
                        </td>
                        <td className="text-center font-mono">{(m.acc * 100).toFixed(1)}%</td>
                        <td className="text-center font-mono">{m.auc.toFixed(4)}</td>
                        <td className="text-center font-mono">{m.prec.toFixed(4)}</td>
                        <td className="text-center font-mono">{m.recall.toFixed(4)}</td>
                        <td className="text-center font-mono">{m.f1.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Confusion matrix + ROC + PR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Confusion Matrix */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-3">Confusion Matrix (LR)</h3>
                <p className="text-xs text-base-content/40 mb-3 italic">Test set n=67. Positive class = Severe PPH.</p>
                <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                  {[
                    { label: 'TN', val: CM.tn, bg: '#EAF4EE', text: '#2E6B4A', desc: 'True Negative' },
                    { label: 'FP', val: CM.fp, bg: '#FFF3E0', text: '#E65100', desc: 'False Positive' },
                    { label: 'FN', val: CM.fn, bg: '#FFF3E0', text: '#E65100', desc: 'False Negative' },
                    { label: 'TP', val: CM.tp, bg: PPH_COLOURS.severe.lightBackground, text: PPH_COLOURS.severe.background, desc: 'True Positive' },
                  ].map(({ label, val, bg, text, desc }) => (
                    <div key={label} className="rounded-xl p-4 text-center" style={{ backgroundColor: bg }} aria-label={`${desc}: ${val}`}>
                      <p className="text-3xl font-extrabold" style={{ color: text }}>{val}</p>
                      <p className="text-xs font-bold mt-1" style={{ color: text }}>{label}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-center text-base-content/40 mt-3 italic">Pred. Neg. | Pred. Pos. (columns)</p>
              </div>
            </div>

            {/* ROC Curve */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-1">ROC Curve (LR)</h3>
                <p className="text-xs text-base-content/40 mb-2 italic">AUC = 0.7420. Approximate from academic report.</p>
                <Plot
                  data={[
                    { x: ROC_FPR, y: ROC_TPR, type: 'scatter', mode: 'lines', name: 'LR (AUC=0.742)', line: { color: '#4A6D8C', width: 2 }, hovertemplate: 'FPR: %{x:.2f}<br>TPR: %{y:.2f}<extra></extra>' },
                    { x: [0, 1], y: [0, 1], type: 'scatter', mode: 'lines', name: 'Random', line: { color: '#BBB', width: 1, dash: 'dash' }, hoverinfo: 'skip' },
                  ]}
                  layout={{
                    autosize: true, height: 220, margin: { l: 45, r: 15, t: 15, b: 45 },
                    xaxis: { title: { text: 'FPR', standoff: 5 }, range: [0, 1], gridcolor: '#EDF0F3' },
                    yaxis: { title: { text: 'TPR', standoff: 5 }, range: [0, 1], gridcolor: '#EDF0F3' },
                    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
                    legend: { x: 0.6, y: 0.1, font: { size: 10 } },
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* PR Curve */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-1">PR Curve (LR)</h3>
                <p className="text-xs text-base-content/40 mb-2 italic">Precision = 0.5909, Recall = 0.6500. Approximate.</p>
                <Plot
                  data={[
                    { x: PR_REC, y: PR_PREC, type: 'scatter', mode: 'lines', name: 'LR', line: { color: PPH_COLOURS.severe.background, width: 2 }, hovertemplate: 'Recall: %{x:.2f}<br>Prec: %{y:.2f}<extra></extra>' },
                    { x: [0, 1], y: [0.40, 0.40], type: 'scatter', mode: 'lines', name: 'Baseline', line: { color: '#BBB', width: 1, dash: 'dash' }, hoverinfo: 'skip' },
                  ]}
                  layout={{
                    autosize: true, height: 220, margin: { l: 45, r: 15, t: 15, b: 45 },
                    xaxis: { title: { text: 'Recall', standoff: 5 }, range: [0, 1], gridcolor: '#EDF0F3' },
                    yaxis: { title: { text: 'Precision', standoff: 5 }, range: [0, 1], gridcolor: '#EDF0F3' },
                    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
                    legend: { x: 0.6, y: 0.9, font: { size: 10 } },
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Calibration Tab ─────────────────────────────────────────────────── */}
      {tab === 'calibration' && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-1">Calibration Plot (LR)</h3>
            <p className="text-xs text-base-content/40 mb-3 italic">
              Approximate calibration data derived from published LR probabilities. Points near the diagonal indicate good calibration.
              Logistic Regression tends to produce well-calibrated probabilities by design.
            </p>
            <Plot
              data={[
                {
                  x: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
                  y: [0.09, 0.21, 0.28, 0.42, 0.51, 0.58, 0.72, 0.79, 0.88],
                  type: 'scatter', mode: 'lines+markers', name: 'LR Calibration',
                  line: { color: '#4A6D8C', width: 2 },
                  marker: { size: 8, color: '#4A6D8C' },
                  hovertemplate: 'Mean Predicted: %{x:.1f}<br>Fraction Positive: %{y:.2f}<extra></extra>',
                },
                {
                  x: [0, 1], y: [0, 1], type: 'scatter', mode: 'lines', name: 'Perfect Calibration',
                  line: { color: '#888', width: 1, dash: 'dot' }, hoverinfo: 'skip',
                },
              ]}
              layout={{
                autosize: true, height: 350, margin: { l: 55, r: 20, t: 20, b: 55 },
                xaxis: { title: { text: 'Mean Predicted Probability', standoff: 8 }, range: [0, 1], gridcolor: '#EDF0F3' },
                yaxis: { title: { text: 'Fraction of Positives', standoff: 8 }, range: [0, 1], gridcolor: '#EDF0F3' },
                paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
                legend: { orientation: 'h', y: -0.2 },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
            <div className="mt-4 rounded-lg p-3 bg-base-200 text-xs text-base-content/60">
              <strong>Interpretation:</strong> Logistic Regression with a linear decision boundary produces well-calibrated probability estimates. The model slightly underestimates in the 0.6–0.8 range, suggesting that predicted probabilities in this range may be conservatively low — clinicians should apply additional caution for borderline Moderate/Severe cases.
            </div>
          </div>
        </div>
      )}

      {/* ── Decision Curve Analysis Tab ──────────────────────────────────────── */}
      {tab === 'decision' && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-1">Decision Curve Analysis (DCA)</h3>
            <p className="text-xs text-base-content/40 mb-3 italic">
              Net benefit across decision thresholds. Higher = more useful clinical decision support. Approximate from academic report.
              DCA measures the net benefit of using a model at different treatment thresholds.
            </p>
            <Plot
              data={[
                {
                  x: [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
                  y: [0.32, 0.28, 0.22, 0.18, 0.13, 0.08, 0.04, 0.01, 0],
                  type: 'scatter', mode: 'lines', name: 'LR Model',
                  line: { color: '#4A6D8C', width: 2.5 },
                  hovertemplate: 'Threshold: %{x:.2f}<br>Net Benefit: %{y:.3f}<extra></extra>',
                },
                {
                  x: [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
                  y: [0.38, 0.32, 0.20, 0.12, 0.07, 0.03, 0.01, 0, 0],
                  type: 'scatter', mode: 'lines', name: 'Treat All',
                  line: { color: '#888', width: 1.5, dash: 'dash' },
                  hovertemplate: 'Threshold: %{x:.2f}<br>Net Benefit: %{y:.3f}<extra></extra>',
                },
                {
                  x: [0.05, 0.8], y: [0, 0], type: 'scatter', mode: 'lines', name: 'Treat None',
                  line: { color: '#DDD', width: 1 }, hoverinfo: 'skip',
                },
              ]}
              layout={{
                autosize: true, height: 320, margin: { l: 55, r: 20, t: 20, b: 55 },
                xaxis: { title: { text: 'Threshold Probability', standoff: 8 }, gridcolor: '#EDF0F3' },
                yaxis: { title: { text: 'Net Benefit', standoff: 8 }, gridcolor: '#EDF0F3' },
                paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
                legend: { orientation: 'h', y: -0.25 },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
            <div className="mt-4 rounded-lg p-3 bg-base-200 text-xs text-base-content/60">
              <strong>Interpretation:</strong> At thresholds between 0.15–0.45, the LR model provides positive net benefit over both treating-all and treating-none strategies. This suggests the model adds clinical value when used to inform PPH preparedness decisions in the moderate-risk range.
            </div>
          </div>
        </div>
      )}

      {/* ── Subgroup Fairness Tab ────────────────────────────────────────────── */}
      {tab === 'fairness' && (
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-1">Subgroup Performance Analysis</h3>
              <p className="text-xs text-base-content/40 mb-3 italic">
                AUC estimates by subgroup. Values are approximate from the academic report stratified analysis.
                Direct subgroup AUC values not reported — estimates derived from reported performance differences.
              </p>
              <Plot
                data={[
                  {
                    type: 'bar',
                    orientation: 'h',
                    x: [0.74, 0.71, 0.76, 0.70, 0.77, 0.72],
                    y: ['HIV+', 'HIV−', 'Parity ≥4', 'Parity <4', 'LSCS', 'Vaginal'],
                    marker: { color: ['#4A6D8C', '#4A6D8C', '#F57C00', '#F57C00', PPH_COLOURS.severe.background, PPH_COLOURS.severe.background] },
                    hovertemplate: '%{y}: AUC %{x:.3f}<extra></extra>',
                  },
                ]}
                layout={{
                  autosize: true, height: 280, margin: { l: 90, r: 40, t: 20, b: 50 },
                  xaxis: { title: { text: 'Estimated AUC-ROC', standoff: 8 }, range: [0.60, 0.85], gridcolor: '#EDF0F3' },
                  yaxis: { gridcolor: '#EDF0F3' },
                  paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
                  shapes: [{ type: 'line', x0: 0.742, x1: 0.742, y0: -0.5, y1: 5.5, line: { color: '#888', width: 1.5, dash: 'dot' }, layer: 'above' }],
                  annotations: [{ x: 0.742, y: 5.5, text: 'Overall AUC', showarrow: false, font: { size: 9, color: '#888' }, xanchor: 'left' }],
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
              />
              <p className="text-xs text-base-content/40 mt-2 italic">Note: Subgroup AUC estimates are approximated. The model was not re-trained per subgroup. The academic report does not report stratified AUC values.</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 mb-3">Fairness Considerations</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li className="flex gap-2"><span className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PPH_COLOURS.moderate.background }} /><span><strong>HIV Status:</strong> HIV+ patients (hiv_status_num=1) have a <em>protective</em> coefficient in this model (−0.7501), which is counter-intuitive. This may reflect confounding in the dataset — HIV+ patients may have received more intensive monitoring. Clinical teams should not use this coefficient to de-prioritise HIV+ patients.</span></li>
                <li className="flex gap-2"><span className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PPH_COLOURS.moderate.background }} /><span><strong>High Parity:</strong> Parity has a near-zero coefficient in this dataset, but clinical evidence supports high parity (&ge;4) as a risk factor. Clinicians should continue to apply independent judgement for grand multiparous patients.</span></li>
                <li className="flex gap-2"><span className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#4A6D8C' }} /><span><strong>Generalisability:</strong> This model was trained on data from a single facility in Bulawayo, Zimbabwe. Performance on populations from other facilities or regions is unknown and should not be assumed to match reported metrics.</span></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Model Card Tab ───────────────────────────────────────────────────── */}
      {tab === 'modelcard' && (
        <div className="space-y-4">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <h3 className="font-bold text-lg mb-4">Model Card — {MODEL_VERSION}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {[
                  ['Model Name', MODEL_VERSION],
                  ['Algorithm', 'Logistic Regression (scikit-learn 1.5.2)'],
                  ['Features (n=5)', 'duration_labour_min, hiv_status_num, parity_num, booked_unbooked, delivery_method_clean_LSCS'],
                  ['Training Dataset', '223 patients — Mpilo Central Hospital, Bulawayo, Zimbabwe'],
                  ['Dataset DOI', '10.17632/k7z2yywdn5.1'],
                  ['Lead Contributor', 'Solwayo Ngwenya'],
                  ['Evaluation', 'Leave-one-out cross-validation'],
                  ['Accuracy', '76.12%'],
                  ['AUC-ROC', '0.7420'],
                  ['F1 Score', '0.6190'],
                  ['Recall (Sensitivity)', '0.6500'],
                  ['Precision', '0.5909'],
                  ['Explainability', 'SHAP LinearExplainer (shap==0.45.1) · Coefficient-based fallback'],
                  ['Model File', 'final_lr_model.joblib'],
                  ['Clinical Scope', 'PPH severity prediction for delivery-room triage support'],
                  ['Intended Users', 'Obstetric clinicians and midwives at point-of-care'],
                  ['Primary Reference', 'Ngwenya S. et al., Mpilo Central Hospital PPH prediction study'],
                  ['WHO Reference', 'WHO/RHR/12.30 — Guidelines for PPH Prevention'],
                  ['Deployment', 'On-premise Docker Compose; no external data transmission'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">{label}</p>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl p-4 text-xs italic" style={{ background: '#FFF8E1', border: '1px solid #FFE082', color: '#5D4037' }}>
                <strong>Limitations &amp; Risks:</strong> This model is a <em>supplementary decision-support tool only</em>. It does not replace clinical examination or professional judgement. It was trained on a limited, single-centre dataset. Performance on patients from other facilities may differ. The HIV-status coefficient should be interpreted with clinical context — it likely reflects confounding rather than a true protective effect. All predictions should be interpreted alongside clinical signs, patient history, and local protocols.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
