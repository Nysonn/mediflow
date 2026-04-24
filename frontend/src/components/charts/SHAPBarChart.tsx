import Plot from '../../lib/Plot';
import { PPH_COLOURS } from '../../theme/pphTheme';

interface SHAPBarChartProps {
  shapValues: Record<string, number>;
  patientValues: Record<string, number | string>;
  computedAt?: string;
}

// Display-friendly feature labels with LOINC codes where applicable
const FEATURE_DISPLAY: Record<string, string> = {
  duration_labour_min: 'Labour Duration (min)',
  hiv_status_num: 'HIV Status',
  parity_num: 'Parity',
  booked_unbooked: 'Booking Status',
  delivery_method_clean_LSCS: 'Delivery: LSCS',
};

const FEATURE_LOINC: Record<string, string> = {
  hiv_status_num: 'LOINC 55277-8',
};

export const SHAPBarChart = ({ shapValues, patientValues, computedAt }: SHAPBarChartProps) => {
  // Sort features by absolute SHAP value descending (strongest contributor at top)
  const sorted = Object.entries(shapValues).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1])
  );

  const featureLabels = sorted.map(([feat]) => {
    const display = FEATURE_DISPLAY[feat] ?? feat;
    const val = patientValues[feat] ?? '';
    const loinc = FEATURE_LOINC[feat] ? ` [${FEATURE_LOINC[feat]}]` : '';
    return `${display}${loinc} = ${val}`;
  });

  const shapVals = sorted.map(([, v]) => v);
  const barColours = shapVals.map((v) =>
    v >= 0 ? PPH_COLOURS.severe.background : '#1565C0'
  );

  const maxAbs = Math.max(...shapVals.map(Math.abs), 0.01);

  const topFeature = sorted[0];
  const altText = topFeature
    ? `SHAP feature contribution chart showing ${sorted.length} features. Top contributor: ${FEATURE_DISPLAY[topFeature[0]] ?? topFeature[0]} with SHAP value ${topFeature[1].toFixed(3)}.`
    : 'SHAP feature contribution chart.';

  return (
    <div role="img" aria-label={altText}>
      <p className="text-xs text-base-content/40 mb-1 italic">
        Data source: Computed from patient input submitted{' '}
        {computedAt ? new Date(computedAt).toLocaleString() : 'this session'}
      </p>
      <Plot
        data={[
          {
            type: 'bar',
            orientation: 'h',
            x: shapVals,
            y: featureLabels,
            marker: { color: barColours },
            hovertemplate:
              '<b>%{y}</b><br>SHAP value: %{x:.4f}<extra></extra>',
          },
        ]}
        layout={{
          title: {
            text: 'Why the AI reached this prediction — Feature Contributions',
            font: { size: 13, color: '#1A2535' },
          },
          xaxis: {
            title: { text: 'SHAP Contribution Value (log-odds)' },
            range: [-maxAbs * 1.2, maxAbs * 1.2],
            zeroline: true,
            zerolinecolor: '#1A2535',
            zerolinewidth: 2,
          },
          yaxis: {
            automargin: true,
          },
          margin: { l: 240, r: 20, t: 60, b: 50 },
          height: 320,
          plot_bgcolor: '#ffffff',
          paper_bgcolor: '#ffffff',
          font: { family: 'inherit', color: '#1A2535' },
          annotations: [
            {
              x: 0,
              y: -0.18,
              xref: 'paper',
              yref: 'paper',
              text: 'Red = raises severity risk  |  Blue = lowers severity risk',
              showarrow: false,
              font: { size: 10, color: '#6B7A8D' },
              align: 'center',
            },
          ],
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />
      {/* Accessible text labels — colour is never used alone (WCAG 1.4.1) */}
      <div className="flex gap-4 mt-1 text-xs">
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: PPH_COLOURS.severe.background }}
            aria-hidden="true"
          />
          <span style={{ color: PPH_COLOURS.severe.background }}>Raises severe PPH risk</span>
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: '#1565C0' }}
            aria-hidden="true"
          />
          <span style={{ color: '#1565C0' }}>Lowers severe PPH risk</span>
        </span>
      </div>
    </div>
  );
};
