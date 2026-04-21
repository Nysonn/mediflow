/**
 * PPH Severity Colour Constants — Single Source of Truth
 *
 * ALL colour usage for PPH severity across the entire MediFlow application
 * MUST reference this file. Never hardcode these hex values inline.
 *
 * Colour semantics align with:
 * - WHO Safe Childbirth Checklist traffic-light severity framework (WHO/HIS/PSP/2015.2)
 * - HL7 FHIR R4 Flag.category clinical alert severity coding
 *   http://hl7.org/fhir/R4/flag.html
 * - WHO PPH Prevention Guidelines — Active Management of the Third Stage of Labour
 *   WHO/RHR/12.30
 *
 * Red    = life-threatening / immediate action required
 * Amber  = elevated risk / heightened monitoring
 * Green  = lower risk / standard care protocols
 */

export const PPH_COLOURS = {
  severe: {
    background: '#D32F2F',
    text: '#FFFFFF',
    label: 'Severe PPH',
    lightBackground: '#FFEBEE',
    border: '#B71C1C',
  },
  moderate: {
    background: '#F57C00',
    text: '#FFFFFF',
    label: 'Moderate PPH',
    lightBackground: '#FFF3E0',
    border: '#E65100',
  },
  mild: {
    background: '#388E3C',
    text: '#FFFFFF',
    label: 'Mild PPH',
    lightBackground: '#E8F5E9',
    border: '#1B5E20',
  },
} as const;

/**
 * Derive PPH severity tier from predicted probability.
 *
 * Thresholds:
 *   < 0.33  → Mild   (lower risk)
 *   0.33 – 0.66 → Moderate (elevated risk)
 *   > 0.66  → Severe (life-threatening)
 */
export type SeverityTier = 'mild' | 'moderate' | 'severe';

export function getSeverityTier(probability: number): SeverityTier {
  if (probability > 0.66) return 'severe';
  if (probability >= 0.33) return 'moderate';
  return 'mild';
}

export function getSeverityColours(probability: number) {
  return PPH_COLOURS[getSeverityTier(probability)];
}

/** Model version string — used wherever model version is displayed. */
export const MODEL_VERSION = 'MediFlow-PPH-v1.0';
