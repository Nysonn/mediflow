/**
 * Clinical Decision Support Notes — Static Lookup Table
 *
 * Drives the Zone D auto-generated bullet points on the Assessment Result page.
 * These notes are STATIC — never generated dynamically with AI/LLM inference.
 *
 * Each note is selected based on the top SHAP feature contributors for the
 * current patient's prediction.
 *
 * References:
 * - WHO PPH Prevention Guidelines — AMTSL (WHO/RHR/12.30)
 * - WHO Safe Childbirth Checklist (WHO/HIS/PSP/2015.2)
 * - NICE Guideline NG121 — Intrapartum care
 * - FIGO Guidelines on PPH Management (2012)
 */

export interface ClinicalNote {
  condition: string;
  note: string;
  urgency: 'high' | 'medium' | 'standard';
}

export const CLINICAL_NOTES_LOOKUP: Record<string, ClinicalNote[]> = {
  delivery_method_clean_lscs: [
    {
      condition: 'lscs',
      note: 'Surgical delivery (LSCS) is the single strongest predictor of severe PPH in this cohort (OR 10.68). Ensure haematology cross-match is current, oxytocin infusion is prepared, and senior obstetric cover is present in theatre.',
      urgency: 'high',
    },
    {
      condition: 'not_lscs',
      note: 'Normal vaginal delivery or instrumental delivery — apply Active Management of the Third Stage of Labour (AMTSL) per WHO PPH prevention guidelines. Administer uterotonics within 1 minute of birth.',
      urgency: 'standard',
    },
    {
      condition: 'forceps',
      note: 'Instrumental delivery (forceps) carries increased risk of perineal trauma and associated haemorrhage. Inspect perineum thoroughly post-delivery and ensure adequate lighting.',
      urgency: 'medium',
    },
  ],
  booked_unbooked: [
    {
      condition: 'unbooked',
      note: 'Patient was unbooked (no antenatal care) — baseline haematology, blood group, and rhesus status may be unknown. Order FBC, group and screen immediately. Unbooked status carries 3.5× higher odds of severe PPH in this cohort.',
      urgency: 'high',
    },
    {
      condition: 'booked',
      note: 'Patient attended antenatal care. Verify that antenatal haematology results are available and review any risk factors documented at booking visits.',
      urgency: 'standard',
    },
  ],
  hiv_status_num: [
    {
      condition: 'positive',
      note: 'Maternal HIV-positive status: review IV oxytocin protocol in the context of current antiretroviral medications. Misoprostol may be preferred in some ARV combinations. Confirm current viral load and CD4 count.',
      urgency: 'medium',
    },
  ],
  duration_labour_min: [
    {
      condition: 'prolonged',
      note: 'Prolonged labour (>720 minutes / 12 hours) is associated with uterine atony risk. Monitor uterine tone closely post-delivery, ensure uterotonic agents are immediately available, and consider IV oxytocin prophylaxis.',
      urgency: 'medium',
    },
  ],
  parity_num: [
    {
      condition: 'grand_multipara',
      note: 'Grand multiparity (parity ≥4) is an independent risk factor for uterine atony — the most common cause of PPH. Heightened vigilance in the immediate postpartum period is warranted. Have bimanual uterine compression technique ready.',
      urgency: 'medium',
    },
  ],
};

/**
 * Generate the 3–5 most relevant clinical notes for a given assessment.
 * Returns notes ordered by urgency (high → medium → standard).
 */
export function getRelevantClinicalNotes(assessment: {
  duration_labour_min: number;
  hiv_status_num: number;
  parity_num: number;
  booked_unbooked: number;
  delivery_method_clean_forceps: number;
  delivery_method_clean_lscs: number;
}): ClinicalNote[] {
  const notes: ClinicalNote[] = [];

  // Delivery method
  if (assessment.delivery_method_clean_lscs === 1) {
    const n = CLINICAL_NOTES_LOOKUP.delivery_method_clean_lscs.find(n => n.condition === 'lscs');
    if (n) notes.push(n);
  } else if (assessment.delivery_method_clean_forceps === 1) {
    const n = CLINICAL_NOTES_LOOKUP.delivery_method_clean_lscs.find(n => n.condition === 'forceps');
    if (n) notes.push(n);
  } else {
    const n = CLINICAL_NOTES_LOOKUP.delivery_method_clean_lscs.find(n => n.condition === 'not_lscs');
    if (n) notes.push(n);
  }

  // Booking status
  const bookingNote = CLINICAL_NOTES_LOOKUP.booked_unbooked.find(
    n => n.condition === (assessment.booked_unbooked === 1 ? 'unbooked' : 'booked')
  );
  if (bookingNote) notes.push(bookingNote);

  // HIV status
  if (assessment.hiv_status_num === 1) {
    const n = CLINICAL_NOTES_LOOKUP.hiv_status_num.find(n => n.condition === 'positive');
    if (n) notes.push(n);
  }

  // Prolonged labour
  if (assessment.duration_labour_min > 720) {
    const n = CLINICAL_NOTES_LOOKUP.duration_labour_min.find(n => n.condition === 'prolonged');
    if (n) notes.push(n);
  }

  // Grand multiparity
  if (assessment.parity_num >= 4) {
    const n = CLINICAL_NOTES_LOOKUP.parity_num.find(n => n.condition === 'grand_multipara');
    if (n) notes.push(n);
  }

  // Sort by urgency: high first, then medium, then standard
  const urgencyOrder = { high: 0, medium: 1, standard: 2 };
  return notes.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]).slice(0, 5);
}
