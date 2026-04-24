import Plot from '../../lib/Plot';

interface FeatureImportanceChartProps {
  /** Whether LSCS was selected (1) or not (0) */
  deliveryLSCS: number;
}

/**
 * Static feature importance bar chart derived from Logistic Regression
 * odds ratios reported in the MediFlow academic report (March 2026).
 *
 * Values: normalised coefficients from the fitted LR model.
 * Source: Mpilo Central Hospital dataset (n=223), DOI: 10.17632/k7z2yywdn5.1
 */
const LR_COEFFICIENTS: Record<string, number> = {
  'Delivery: LSCS': 2.3684,
  'Booking: Unbooked': 1.2642,
  'Parity': 0.0083,
  'Labour Duration (min)': 0.0004,
  'HIV Status': -0.7501,
};

export const FeatureImportanceChart = ({ deliveryLSCS }: FeatureImportanceChartProps) => {
  const entries = Object.entries(LR_COEFFICIENTS).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1])
  );

  const labels = entries.map(([k]) => k);
  const values = entries.map(([, v]) => v);
  const colours = values.map((v) => (v >= 0 ? '#D32F2F' : '#1565C0'));

  // Highlight the patient's highest-risk feature
  const highlightIdx = deliveryLSCS === 1 ? labels.indexOf('Delivery: LSCS') : -1;
  const opacities = labels.map((_, i) => (highlightIdx >= 0 && i !== highlightIdx ? 0.55 : 1));

  return (
    <div role="img" aria-label="Feature importance bar chart showing logistic regression coefficients for 5 model features. Delivery method (LSCS) has the largest positive coefficient.">
      <p className="text-xs text-base-content/40 mb-1 italic">
        Data source: LR coefficients from Mpilo Central Hospital dataset (n=223). DOI: 10.17632/k7z2yywdn5.1
      </p>
      <Plot
        data={[
          {
            type: 'bar',
            orientation: 'h',
            x: values,
            y: labels,
            marker: { color: colours, opacity: opacities },
            hovertemplate: '<b>%{y}</b><br>LR Coefficient: %{x:.4f}<extra></extra>',
          },
        ]}
        layout={{
          title: {
            text: 'Model Feature Importance — LR Coefficients',
            font: { size: 13, color: '#1A2535' },
          },
          xaxis: {
            title: { text: 'Logistic Regression Coefficient' },
            zeroline: true,
            zerolinecolor: '#1A2535',
            zerolinewidth: 2,
          },
          yaxis: { automargin: true },
          margin: { l: 180, r: 20, t: 50, b: 50 },
          height: 260,
          plot_bgcolor: '#ffffff',
          paper_bgcolor: '#ffffff',
          font: { family: 'inherit', color: '#1A2535' },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />
      <div className="flex gap-4 mt-1 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#D32F2F' }} aria-hidden="true" />
          <span style={{ color: '#D32F2F' }}>Increases risk</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#1565C0' }} aria-hidden="true" />
          <span style={{ color: '#1565C0' }}>Decreases risk</span>
        </span>
      </div>
    </div>
  );
};
