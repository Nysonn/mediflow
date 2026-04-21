import Plot from 'react-plotly.js';
import { getSeverityTier, PPH_COLOURS } from '../../theme/pphTheme';

interface RiskGaugeProps {
  probability: number;  // 0–1
  label?: string;
}

export const RiskGauge = ({ probability, label }: RiskGaugeProps) => {
  const pct = Math.round(probability * 100);
  const tier = getSeverityTier(probability);
  const colours = PPH_COLOURS[tier];

  const altText = `Risk gauge showing ${pct}% probability of severe PPH — ${colours.label}.`;

  return (
    <div role="img" aria-label={altText}>
      <Plot
        data={[
          {
            type: 'indicator',
            mode: 'gauge+number+delta',
            value: pct,
            title: {
              text: label ?? 'Severe PPH Probability (%)',
              font: { size: 13, color: '#1A2535' },
            },
            number: {
              suffix: '%',
              font: { size: 36, color: colours.background },
            },
            gauge: {
              axis: { range: [0, 100], ticksuffix: '%' },
              bar: { color: colours.background },
              bgcolor: '#F4F6F8',
              borderwidth: 2,
              bordercolor: '#DDE3EA',
              steps: [
                { range: [0, 33], color: PPH_COLOURS.mild.lightBackground },
                { range: [33, 66], color: PPH_COLOURS.moderate.lightBackground },
                { range: [66, 100], color: PPH_COLOURS.severe.lightBackground },
              ],
              threshold: {
                line: { color: colours.background, width: 4 },
                thickness: 0.85,
                value: pct,
              },
            },
          } as unknown as Plotly.Data,
        ]}
        layout={{
          margin: { t: 60, b: 20, l: 20, r: 20 },
          height: 220,
          paper_bgcolor: '#ffffff',
          font: { family: 'inherit', color: '#1A2535' },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />
      {/* Text label alongside colour — WCAG 1.4.1 */}
      <div className="text-center -mt-2">
        <span
          className="inline-block px-3 py-1 rounded-full text-sm font-bold"
          style={{ backgroundColor: colours.background, color: colours.text }}
        >
          {colours.label}
        </span>
      </div>
    </div>
  );
};
