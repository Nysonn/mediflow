/**
 * Abnormality Flag Thresholds — for Zone B patient input summary.
 *
 * Each entry defines when a clinical flag indicator (coloured dot + label)
 * should appear alongside a feature value on the Assessment Result page.
 *
 * Adapted to the 5 model features used by MediFlow's Logistic Regression model.
 * Colour semantics: red = severe/immediate, amber = elevated risk / monitor.
 *
 * Reference: WHO PPH Prevention Guidelines (WHO/RHR/12.30),
 *            NICE Guideline NG121 — Intrapartum care.
 */

export type FlagSeverity = 'red' | 'amber';

export interface AbnormalityFlag {
  feature: string;
  condition: (v: number | string) => boolean;
  severity: FlagSeverity;
  note: string;
}

export const ABNORMALITY_FLAGS: AbnormalityFlag[] = [
  {
    feature: 'delivery_method_clean_forceps',
    condition: (v) => v === 1,
    severity: 'amber',
    note: 'Instrumental (forceps) delivery — increased perineal trauma risk',
  },
  {
    feature: 'delivery_method_clean_lscs',
    condition: (v) => v === 1,
    severity: 'red',
    note: 'LSCS delivery — highest PPH risk (OR 10.68)',
  },
  {
    feature: 'booked_unbooked',
    condition: (v) => v === 1,
    severity: 'amber',
    note: 'Unbooked — no antenatal care (OR 3.54)',
  },
  {
    feature: 'hiv_status_num',
    condition: (v) => v === 1,
    severity: 'amber',
    note: 'HIV-positive — review medication protocol',
  },
  {
    feature: 'duration_labour_min',
    condition: (v) => Number(v) > 720,
    severity: 'amber',
    note: 'Prolonged labour (>12 hours)',
  },
  {
    feature: 'parity_num',
    condition: (v) => Number(v) >= 4,
    severity: 'amber',
    note: 'Grand multiparity (parity ≥4)',
  },
];
