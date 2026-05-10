import Plot from '../../lib/Plot';
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
      {/* Arc-only gauge — number rendered in HTML below for full readability control */}
      <Plot
        data={[
          {
            type: 'indicator',
            mode: 'gauge',
            value: pct,
            title: {
              text: label ?? 'Severe PPH Probability (%)',
              font: { size: 13, color: '#1A2535' },
            },
            gauge: {
              axis: { range: [0, 100], ticksuffix: '%', tickfont: { size: 10 } },
              bar: { color: colours.background, thickness: 0.25 },
              bgcolor: '#F4F6F8',
              borderwidth: 2,
              bordercolor: '#DDE3EA',
              steps: [
                { range: [0, 33], color: PPH_COLOURS.mild.lightBackground },
                { range: [33, 66], color: PPH_COLOURS.moderate.lightBackground },
                { range: [66, 100], color: PPH_COLOURS.severe.lightBackground },
              ],
              threshold: {
                line: { color: colours.border, width: 3 },
                thickness: 0.85,
                value: pct,
              },
            },
          } as unknown as Plotly.Data,
        ]}
        layout={{
          margin: { t: 52, b: 0, l: 18, r: 18 },
          height: 150,
          paper_bgcolor: 'rgba(0,0,0,0)',
          font: { family: 'inherit', color: '#1A2535' },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />

      {/* Large readable percentage + severity badge — WCAG 1.4.3 contrast compliant */}
      <div className="text-center -mt-6 space-y-2">
        <div className="flex items-baseline justify-center gap-0.5">
          <span
            className="text-5xl font-extrabold tabular-nums leading-none"
            style={{ color: colours.border }}
          >
            {pct}
          </span>
          <span
            className="text-2xl font-bold leading-none"
            style={{ color: colours.border }}
          >
            %
          </span>
        </div>
        <span
          className="inline-block px-3 py-1 rounded-full text-sm font-bold tracking-wide"
          style={{ backgroundColor: colours.background, color: colours.text }}
        >
          {colours.label}
        </span>
      </div>
    </div>
  );
};
