import Plot from 'react-plotly.js';
import { PPH_COLOURS } from '../../theme/pphTheme';

interface PopDistributionChartProps {
  feature: 'duration_labour_min' | 'parity_num';
  patientValue: number;
  populationStats: PopulationStats;
}

export interface PopulationStats {
  features: {
    duration_labour_min: FeatureStats;
    parity_num: FeatureStats;
  };
}

interface FeatureStats {
  overall: TierStats;
  Mild: TierStats;
  Moderate: TierStats;
  Severe: TierStats;
}

interface TierStats {
  mean: number;
  std: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  min: number;
  max: number;
  n: number;
}

const FEATURE_LABELS: Record<string, string> = {
  duration_labour_min: 'Labour Duration (minutes)',
  parity_num: 'Parity (Previous Deliveries)',
};

const TIER_COLOURS: Record<string, string> = {
  Mild: PPH_COLOURS.mild.background,
  Moderate: PPH_COLOURS.moderate.background,
  Severe: PPH_COLOURS.severe.background,
};

export const PopDistributionChart = ({
  feature,
  patientValue,
  populationStats,
}: PopDistributionChartProps) => {
  const featureStats = populationStats.features[feature];
  const tiers: Array<'Mild' | 'Moderate' | 'Severe'> = ['Mild', 'Moderate', 'Severe'];

  // Build box traces from pre-computed percentile statistics (no raw data at runtime)
  const traces: Plotly.Data[] = tiers.map((tier) => {
    const s = featureStats[tier];
    return {
      type: 'box',
      name: `${tier} PPH<br>(n=${s.n})`,
      q1: [s.p25],
      median: [s.p50],
      q3: [s.p75],
      lowerfence: [s.p5],
      upperfence: [s.p95],
      mean: [s.mean],
      sd: [s.std],
      x: [tier],
      marker: { color: TIER_COLOURS[tier] },
      boxmean: true,
      hovertemplate:
        `<b>${tier} PPH</b><br>` +
        `Median: %{median}<br>` +
        `IQR: %{q1} – %{q3}<br>` +
        `5th–95th: %{lowerfence} – %{upperfence}<extra></extra>`,
    } as unknown as Plotly.Data;
  });

  // Patient marker — overlaid as scatter point
  const severeStat = featureStats['Severe'];
  // Compute approximate percentile within Severe group
  let percentileLabel = '';
  if (patientValue <= severeStat.p25) percentileLabel = '≤25th percentile (Severe group)';
  else if (patientValue <= severeStat.p50) percentileLabel = '25th–50th percentile (Severe group)';
  else if (patientValue <= severeStat.p75) percentileLabel = '50th–75th percentile (Severe group)';
  else percentileLabel = '>75th percentile (Severe group)';

  const patientTrace: Plotly.Data = {
    type: 'scatter',
    mode: 'markers',
    name: `This patient (${patientValue})`,
    x: ['Mild', 'Moderate', 'Severe'],
    y: [patientValue, patientValue, patientValue],
    marker: {
      color: '#2C3E6B',
      size: 12,
      symbol: 'diamond',
      line: { color: '#ffffff', width: 2 },
    },
    hovertemplate: `<b>This Patient</b><br>Value: ${patientValue}<br>${percentileLabel}<extra></extra>`,
  } as unknown as Plotly.Data;

  const label = FEATURE_LABELS[feature] ?? feature;
  const altText = `Box plot showing distribution of ${label} by PPH severity tier. Patient value: ${patientValue}. ${percentileLabel}.`;

  return (
    <div role="img" aria-label={altText}>
      <p className="text-xs text-base-content/40 mb-1 italic">
        Data source: Derived from Mpilo Central Hospital dataset (n=223). DOI: 10.17632/k7z2yywdn5.1
      </p>
      <Plot
        data={[...traces, patientTrace]}
        layout={{
          title: {
            text: `${label} — Patient vs. Population by PPH Severity`,
            font: { size: 13, color: '#1A2535' },
          },
          xaxis: {
            title: { text: 'PPH Severity Tier' },
          },
          yaxis: {
            title: { text: label },
          },
          legend: { orientation: 'h', y: -0.2 },
          margin: { l: 60, r: 20, t: 60, b: 80 },
          height: 340,
          plot_bgcolor: '#ffffff',
          paper_bgcolor: '#ffffff',
          font: { family: 'inherit', color: '#1A2535' },
          showlegend: true,
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />
      {/* Colour legend with text labels (WCAG 1.4.1 — colour not used alone) */}
      <div className="flex gap-3 mt-1 flex-wrap text-xs">
        {tiers.map((tier) => (
          <span key={tier} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: TIER_COLOURS[tier] }}
              aria-hidden="true"
            />
            <span>{tier} PPH</span>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3" style={{ color: '#2C3E6B' }}>◆</span>
          <span>This Patient</span>
        </span>
      </div>
    </div>
  );
};
