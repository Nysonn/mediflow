# MediFlow — GitHub Copilot Coding Agent Instructions
## Clinical XAI Evidence Dashboard Upgrade

---

> **You are a full-stack coding agent operating inside VS Code via GitHub Copilot.**
> This document is your complete briefing. Read every section before writing a single line of code.
> Your job is to implement the MediFlow upgrade specification described below — **without breaking or duplicating any existing functionality**.

---

## 0. MANDATORY PRE-WORK — Do This Before Anything Else

### 0.1 Codebase Audit

Before writing any code or creating any files, you **must** thoroughly audit the existing MediFlow repository. Work through the following checklist completely:

**Repository to audit:** `https://github.com/Nysonn/mediflow`

```
CODEBASE AUDIT CHECKLIST (complete before any implementation)

[ ] Clone / open the repository and map the full directory tree
[ ] Identify the frontend framework (expected: React) and version
[ ] Identify the charting library in use (Recharts or Plotly.js — do NOT introduce a new one)
[ ] Identify all existing routes / pages and their file paths
[ ] Identify the existing theming / styling system (CSS modules, Tailwind, styled-components, etc.)
[ ] Locate any existing theme or colour constant files
[ ] Identify the backend framework and language (Python/Flask, FastAPI, Node, etc.)
[ ] Locate the trained ML model artefact and note its type (Random Forest, XGBoost, etc.)
[ ] Locate existing API endpoints — especially /api/predict or equivalent
[ ] Identify which Python ML / explainability libraries are already installed (shap, sklearn, etc.)
[ ] Verify whether the `shap` Python library is available; if not, note it for the user
[ ] Read the existing Individual Prediction page component(s) fully
[ ] Read the existing Batch Prediction page component(s) fully
[ ] Read the existing Model Performance page component(s) fully
[ ] Read the existing About page component(s) fully
[ ] Locate any existing dataset references — flag any that mention "stroke" or Kaggle datasets
[ ] Note all existing colour constants and where they are defined
[ ] Identify the existing PDF report generation library and approach
[ ] Identify the existing Excel export library and approach
[ ] Note the existing state management approach (useState, Redux, Context, etc.)
[ ] Note the existing HTTP client (fetch, axios, etc.)
[ ] Check for any existing SHAP, XAI, or explainability code
[ ] Check for any existing counterfactual or what-if analysis code
[ ] Check for any existing confidence interval computation
[ ] Note the existing form validation approach
```

### 0.2 Questions to Ask the User Before Starting

After completing the audit above, **stop and ask the user the following questions**. Do not proceed to implementation until you have answers. Present these as a numbered list and wait for a single consolidated reply.

```
CLARIFICATION QUESTIONS FOR THE USER

1.  CHARTING LIBRARY
    The codebase uses [X — fill in after audit]. Shall I continue with this library for all new
    charts, or do you want to switch? (Note: switching will require refactoring existing charts too.)

2.  SHAP AVAILABILITY
    Is the `shap` Python library installed in your backend environment?
    If not, shall I add it to requirements.txt / pyproject.toml?

3.  BACKEND FRAMEWORK
    The backend appears to use [X — fill in after audit]. Shall the two new endpoints
    (/api/explain and /api/confidence) follow the same pattern?

4.  MODEL ARTEFACT
    Where is the trained model artefact stored (path)? What format is it (pickle, joblib, .pkl, etc.)?
    Can you confirm its algorithm type (Random Forest, XGBoost, Gradient Boosting, other)?

5.  POPULATION STATISTICS JSON
    The spec requires a pre-computed statistics JSON (means, std, percentiles by PPH severity tier)
    derived from cleaned_data_zimbabwe.csv. Shall I generate this file as part of the implementation,
    or will you supply it separately?

6.  MODEL CARD DETAILS
    The Model Card (Part 3, Governance tab) requires:
    (a) The name and email of the clinical point of contact
    (b) The name of the Zimbabwean facility where data was collected
    (c) The exact model performance metrics (Accuracy, AUC, F1) from your test set
    Please supply these, or confirm I should leave them as clearly marked placeholders.

7.  PDF REPORT GENERATION
    The existing PDF report is generated using [X — fill in after audit]. Shall I extend this
    same library for the enhanced batch report (SHAP summary + heatmap + calibration warning)?

8.  EXISTING STROKE ARTEFACTS
    During audit I found [X references to stroke data / no stroke references — fill in].
    Shall I correct all of these as the first committed change?

9.  DEPLOYMENT ENVIRONMENT
    Is this application deployed (Vercel, Railway, Render, local, etc.)? This affects how I
    handle server-side Python (SHAP) calls — some serverless platforms do not support
    long-running Python subprocesses.

10. SAMPLE EXCEL FILE FOR BATCH UPLOAD
    The spec requires a downloadable sample Excel file showing the batch upload format.
    Shall I generate this from cleaned_data_zimbabwe.csv (using the model-ready column names),
    or do you have a template you want used?

11. SCOPE CONFIRMATION
    The spec lists features to add "if not already in MediFlow". After my audit I found that
    the following are [already present / missing — fill in after audit]:
    - Individual Prediction structured form
    - Batch CSV/XLSX upload with preview and validation
    - Model Performance multi-tab dashboard
    - About page multi-tab documentation
    - PPH risk gauge chart
    - Feature importance bar chart
    Please confirm which of these I should implement vs. skip.

12. ROLE BOUNDARY
    Shall I commit changes directly to the repository, or prepare all code for your review
    before any commits? Do you want one PR per Phase or one per major feature?
```

### 0.3 Planning Gate

Only after receiving the user's answers do you produce the **Implementation Plan** described in Section 1. The plan must be shown to the user and acknowledged before any code is written.

---

## 1. IMPLEMENTATION PLAN TEMPLATE

Present this plan to the user after answering the clarification questions. Fill in the blanks from the audit. Tick each checkbox as you complete it — **do not tick ahead**.

---

```
╔══════════════════════════════════════════════════════════════════════╗
║         MEDIFLOW UPGRADE — IMPLEMENTATION PLAN & PROGRESS           ║
╚══════════════════════════════════════════════════════════════════════╝

PHASE 0 — AUDIT & SETUP
  [ ] 0.1  Complete full codebase audit (checklist in Section 0.1)
  [ ] 0.2  Ask user clarification questions (Section 0.2) and record answers
  [ ] 0.3  Present this plan to user and receive acknowledgement
  [ ] 0.4  Fix all stroke-dataset artefacts / mislabelled references in existing code
  [ ] 0.5  Generate pre-computed population statistics JSON from cleaned_data_zimbabwe.csv
  [ ] 0.6  Generate sample Excel batch upload template (model-ready column names)
  [ ] 0.7  Create / update shared theme file with PPH severity colour constants

PHASE 1 — INDIVIDUAL PREDICTION RESULT SCREEN
  [ ] 1.1  Zone A — Patient Headline Banner
            [ ] 1.1a  Patient name/ID, maternal age, gestational age display
            [ ] 1.1b  PPH severity badge (colour-coded: Severe/Moderate/Mild)
            [ ] 1.1c  Risk probability percentage (prominent)
            [ ] 1.1d  Confidence interval display (e.g., "78% [CI: 63%–91%]")
            [ ] 1.1e  /api/confidence endpoint (bootstrap resampling, ≥100 iterations)
            [ ] 1.1f  Inline Model Transparency Card (model ID, timestamp, limitation note)
  [ ] 1.2  Zone B — Patient Biomarker Inputs Summary (Left Panel)
            [ ] 1.2a  Styled feature-value table
            [ ] 1.2b  Abnormality flag indicators (coloured dots) per clinical thresholds
            [ ] 1.2c  LOINC code superscript tooltips on applicable feature labels
            [ ] 1.2d  Non-modifiable features visually grouped and labelled
  [ ] 1.3  Zone C — XAI Visualisations (Tabbed, Centre Panel)
            [ ] 1.3a  Tab 1: SHAP Feature Contribution Bar Chart
                       [ ] /api/explain endpoint returning {feature: shap_value} JSON
                       [ ] Horizontal bar chart (red = raises severity, blue = lowers)
                       [ ] Sorted by absolute SHAP magnitude
                       [ ] Bars labelled with feature name and patient's submitted value
                       [ ] Vertical zero line at centre
                       [ ] Fallback to permutation importance if shap unavailable
            [ ] 1.3b  Tab 2: Patient vs. Population Distribution
                       [ ] Violin / box plots per continuous feature, split by severity tier
                       [ ] Patient marker overlaid on each plot
                       [ ] Percentile annotation within Severe PPH training group
                       [ ] Loaded from pre-computed statistics JSON (no full dataset at runtime)
            [ ] 1.3c  Tab 3: Counterfactual — Path to Lower Severity
                       [ ] Modifiable features table (current → target → projected tier)
                       [ ] Progress-bar-style visual per row
                       [ ] Non-modifiable factors section (clinical completeness)
                       [ ] Grid-search implementation (no DiCE or external library)
  [ ] 1.4  Zone D — Recommendations & Clinical Decision Support (Right Panel)
            [ ] 1.4a  Retain existing risk-level recommendation blocks
            [ ] 1.4b  Clinical Decision Support Notes (3–5 bullets, SHAP-templated lookup table)
            [ ] 1.4c  Lookup table covers top SHAP features: delivery_method, hiv_status,
                       gestational_age, est_blood_loss, duration_labour, parity, gravida
  [ ] 1.5  Zone E — Data Provenance & Audit Trail (Footer)
            [ ] 1.5a  Inference timestamp
            [ ] 1.5b  Model version string
            [ ] 1.5c  Session ID or input hash
            [ ] 1.5d  Clinical disclaimer text
            [ ] 1.5e  Privacy note

PHASE 2 — PATIENT TEMPORAL TREND ANALYSIS PAGE
  [ ] 2.1  New route / page scaffold (/trends or equivalent)
  [ ] 2.2  CSV upload input (visit_date + all model features per row)
  [ ] 2.3  Manual "Add Snapshot" form (up to 6 visits)
  [ ] 2.4  PPH Risk Score Trajectory — line chart
            [ ] X: visit dates; Y: predicted PPH probability (%)
            [ ] Colour-coded segments (green/amber/red by severity tier)
            [ ] Hover annotations (exact % + date)
  [ ] 2.5  Biomarker Trend Lines — multi-line chart
            [ ] Normalised (0–1) continuous features over time
            [ ] Features: est_blood_loss_ml, gestational_age_wks, duration_labour_min, birth_weight_g
  [ ] 2.6  Feature Contribution Change Table
            [ ] Columns: Feature | Visit 1 SHAP | Visit 2 SHAP | Visit 3 SHAP | Trend Arrow
  [ ] 2.7  Clinical Alert Banner
            [ ] Triggered when severity score rises >15 pp between consecutive visits
            [ ] Red banner with visit labels and urgent review message

PHASE 3 — MODEL PERFORMANCE PAGE — NEW TABS
  [ ] 3.1  Calibration Plot tab
            [ ] Reliability diagram (binned predicted prob vs actual fraction of Severe cases)
            [ ] Perfect calibration diagonal (dotted)
            [ ] Model's actual calibration curve
            [ ] Brier score displayed numerically
            [ ] Clinical value note
  [ ] 3.2  Decision Curve Analysis (DCA) tab
            [ ] Three lines: Model net benefit, Treat-All, Treat-None
            [ ] X: threshold probability; Y: net benefit
            [ ] Clinical value note
  [ ] 3.3  Subgroup Fairness Analysis tab
            [ ] Precision/Recall/F1 bar charts by: Age band, HIV status, Delivery method, Booking status
            [ ] Red highlight where recall < 0.70
            [ ] Fairness disclaimer
  [ ] 3.4  Model Card (Governance) tab
            [ ] Model Name & Version
            [ ] Intended Use statement
            [ ] Out-of-Scope Uses statement
            [ ] Training Dataset description
            [ ] Features used list
            [ ] Performance Summary (from actual model)
            [ ] Known Limitations (4 items from spec)
            [ ] Validation Status
            [ ] Last Updated (from model artefact metadata)
            [ ] Point of Contact (from user's answer)

PHASE 4 — BATCH PREDICTION PAGE ADDITIONS
  [ ] 4.1  Subgroup Risk Distribution Heatmap
            [ ] Rows: delivery_method_clean (NVD/LSCS/FORCEPS)
            [ ] Columns: age bands (≤24 / 25–34 / 35+)
            [ ] Cell colour: average predicted PPH severity
  [ ] 4.2  Risk Score Histogram with Threshold Slider
            [ ] Full distribution of predicted PPH probabilities
            [ ] Vertical dashed line at threshold (default 0.5)
            [ ] Adjustable slider; patient counts shown above/below threshold
  [ ] 4.3  Downloadable Report Enhancement
            [ ] SHAP summary bar chart (global feature importance) in PDF
            [ ] Subgroup heatmap in PDF
            [ ] Calibration warning if batch cohort falls outside validated ranges
  [ ] 4.4  Sample Excel template download link
            [ ] File uses model-ready column names (age_years, gestational_age_wks, etc.)
            [ ] One example row of plausible data included

PHASE 5 — GLOBAL UI/UX CLINICAL STANDARDS
  [ ] 5.1  PPH Colour Semantics — enforce across all pages
            [ ] Severe PPH: #D32F2F (white text)
            [ ] Moderate PPH: #F57C00 (white text)
            [ ] Mild PPH: #388E3C (white text)
            [ ] All defined in single shared theme file — zero inline hardcoding
            [ ] Reference and cite relevant health informatics standards (HL7 FHIR, 
                WHO colour guidance for alert severity) in code comments
  [ ] 5.2  Chart Requirements — apply to every chart on every page
            [ ] Chart title on all charts
            [ ] Axis labels with units on all charts
            [ ] Data source line below each chart
            [ ] Hover tooltips with exact values on all charts
  [ ] 5.3  Accessibility
            [ ] Text label alongside every colour indicator (colour never used alone)
            [ ] Alt-text descriptions on all charts for screen readers
  [ ] 5.4  Missing / Out-of-Range Data Warnings
            [ ] Yellow banner for any empty or out-of-range field on any input form
            [ ] Ranges: age 15–44, gestational_age 22–43, est_blood_loss 500–3000,
                birth_weight 200–4900, duration_labour > 0
            [ ] Never silently impute — always warn first

PHASE 6 — ABOUT PAGE NEW TABS
  [ ] 6.1  Dataset Details tab
            [ ] Dataset name, source, total records, class note
            [ ] Full feature definitions table (clinical def, type, range, LOINC code)
  [ ] 6.2  Model Architecture tab
            [ ] Algorithm used (verify from model artefact)
            [ ] Hyperparameters (from model metadata)
            [ ] Train/test split and cross-validation strategy
            [ ] Preprocessing steps (encoding, scaling, imputation, class balancing)
            [ ] SHAP explainer type

PHASE 7 — MISSING CORE FEATURES (only if audit confirms absent)
  [ ] 7.1  Individual Prediction structured form (if absent)
  [ ] 7.2  Batch CSV/XLSX upload with preview and column validation (if absent)
  [ ] 7.3  Model Performance multi-tab dashboard — headline metrics (if absent)
  [ ] 7.4  About page multi-tab documentation (if absent)
  [ ] 7.5  PPH risk gauge chart (if absent)
  [ ] 7.6  Feature importance horizontal bar chart (if absent)
  [ ] 7.7  Confusion matrix heatmap (if absent)
  [ ] 7.8  ROC curve (if absent)
  [ ] 7.9  Precision-recall curve (if absent)
  [ ] 7.10 Risk distribution pie chart (if absent)
  [ ] 7.11 Box plots — Age and Blood Loss by PPH severity tier (if absent)
  [ ] 7.12 Prediction-probability histogram with threshold marker (if absent)

PHASE 8 — FINAL QA & REVIEW
  [ ] 8.1  Verify no existing functionality is broken
  [ ] 8.2  Verify no stroke-related references remain anywhere in the codebase
  [ ] 8.3  Verify all colours sourced from shared theme file (grep for hardcoded hex)
  [ ] 8.4  Verify all charts have titles, axis labels, data source lines, and tooltips
  [ ] 8.5  Verify all new API endpoints return correct JSON structure
  [ ] 8.6  Verify accessibility: text labels alongside all colour indicators
  [ ] 8.7  Verify missing-data banners appear on all input forms
  [ ] 8.8  Verify SHAP values compute live (not static) on prediction submission
  [ ] 8.9  Verify counterfactual grid search runs without external libraries
  [ ] 8.10 Verify population statistics loaded from static JSON (no runtime CSV read)
  [ ] 8.11 Smoke-test all new routes / pages
  [ ] 8.12 Smoke-test batch upload with sample Excel file
```

---

## 2. DOMAIN CONTEXT — READ AND RETAIN

### 2.1 What MediFlow Is

MediFlow is a **clinical decision-support web application** for obstetric settings in sub-Saharan Africa. It assists obstetricians and midwives in assessing **Postpartum Haemorrhage (PPH)** risk and severity in individual patients.

> ⚠ **MediFlow is NOT a stroke prediction application.** If you encounter any reference to stroke, the Kaggle stroke dataset, or stroke-related features anywhere in the codebase, treat this as a critical bug and correct it immediately in Phase 0.

### 2.2 The Dataset

| Property | Value |
|---|---|
| File | `cleaned_data_zimbabwe.csv` |
| Records | 223 obstetric patients |
| All records | Confirmed PPH cases (est_blood_loss_ml ≥ 500 ml) |
| Prediction task | PPH severity stratification (not binary PPH presence) |
| Source | Zimbabwean maternal health facility records |

**PPH Severity Tiers:**

| Tier | Blood Loss | Approx. % of dataset |
|---|---|---|
| Mild | 500–999 ml | ~52.9% |
| Moderate | 1,000–1,499 ml | ~30.0% |
| Severe | ≥1,500 ml | ~17.0% (includes major haemorrhage ≥2,000 ml at 7.2%) |

### 2.3 Dataset Column Reference

Use this table for all feature labels, clinical notes, and LOINC superscripts:

| Column (model-ready) | Clinical Meaning | Type | Range / Categories | LOINC |
|---|---|---|---|---|
| `age_years` | Maternal age at delivery | Continuous | 15–44 years | 21612-7 |
| `gestational_age_wks` | Gestational age at delivery | Continuous | 22–43 weeks | 11885-1 |
| `booked` | Received antenatal care booking | Binary | booked / unbooked | — |
| `gravida_num` | Total pregnancies (incl. current) | Continuous | 1–9 | 11996-6 |
| `parity_num` | Previous deliveries (≥20 weeks) | Continuous | 0–8 | 11977-6 |
| `children_alive` | Living children at admission | Continuous | 0–7 | — |
| `past_obst_complications` | History of prior obstetric complications | Categorical/Binary | nil / various | — |
| `abnormalities` | Complications in current pregnancy | Categorical/Text | nil / PIH, APH, Fetal distress, etc. | — |
| `duration_labour_min` | Duration of labour in minutes | Continuous | Varies | — |
| `delivery_method_clean` | Mode of delivery | Categorical | NVD, LSCS, FORCEPS, ABORTION | 72149-8 |
| `est_blood_loss_ml` | Estimated blood loss at delivery (ml) | Continuous | 500–3,000 ml | — |
| `perineum` | Perineal outcome / injury | Categorical | Intact, Episiotomy, 1st–4th degree tear, Lacerations, etc. | — |
| `birth_weight_g` | Neonatal birth weight | Continuous | 200–4,900 g | 8339-4 |
| `sex_of_baby` | Sex of neonate | Binary | Boy / Girl | 76689-9 |
| `hiv_status_num` | Maternal HIV status | Binary/Categorical | 0=Negative, 1=Positive, Unknown | 55277-8 |
| `pph` | PPH flag (all = 1 in this dataset) | Binary | 1 (all records) | — |

### 2.4 Modifiable vs. Non-Modifiable Features

For counterfactual analysis and clinical grouping:

| Modifiable (clinician can act on) | Non-Modifiable (fixed) |
|---|---|
| `duration_labour_min` | `hiv_status_num` |
| `booked` (antenatal booking) | `past_obst_complications` |
| `delivery_method_clean` | `sex_of_baby` |
| `gravida_num` (management context) | `age_years` |
| — | `parity_num` |

---

## 3. ARCHITECTURE & API SPECIFICATION

### 3.1 New Backend Endpoints

#### `POST /api/explain`

Accepts the same patient feature payload as `/api/predict`.  
Returns SHAP values per feature computed live against the trained model.

```json
// Request body (same schema as /api/predict)
{
  "age_years": 28,
  "gestational_age_wks": 36,
  "booked": "booked",
  "gravida_num": 3,
  "parity_num": 2,
  "children_alive": 2,
  "past_obst_complications": "nil",
  "abnormalities": "nil",
  "duration_labour_min": 480,
  "delivery_method_clean": "NVD",
  "est_blood_loss_ml": 900,
  "perineum": "Episiotomy",
  "birth_weight_g": 3200,
  "sex_of_baby": "Girl",
  "hiv_status_num": 0
}

// Response
{
  "shap_values": {
    "age_years": -0.12,
    "gestational_age_wks": 0.34,
    "booked": -0.08,
    "gravida_num": 0.05,
    "parity_num": -0.03,
    "children_alive": 0.01,
    "past_obst_complications": 0.09,
    "abnormalities": 0.22,
    "duration_labour_min": 0.41,
    "delivery_method_clean": -0.15,
    "est_blood_loss_ml": 0.67,
    "perineum": 0.04,
    "birth_weight_g": -0.07,
    "sex_of_baby": 0.02,
    "hiv_status_num": 0.11
  },
  "base_value": 0.32,
  "computed_at": "2025-01-15T14:23:01Z"
}
```

**Implementation:**
```python
import shap

# Use TreeExplainer for tree-based models (Random Forest, XGBoost, GBM)
# Use KernelExplainer as fallback for other model types
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(patient_features_array)
```

Fallback if `shap` is unavailable: compute per-feature permutation importance on the single patient record (permute each feature 10 times, record prediction change).

#### `POST /api/confidence`

Accepts the same patient feature payload.  
Returns bootstrap confidence interval around the predicted probability.

```json
// Response
{
  "risk": 0.78,
  "ci_low": 0.63,
  "ci_high": 0.91,
  "severity_tier": "Moderate",
  "n_bootstrap": 100,
  "computed_at": "2025-01-15T14:23:01Z"
}
```

**Implementation:**
- If model is an ensemble (RandomForest etc.): collect individual estimator `predict_proba` outputs; compute 2.5th and 97.5th percentiles as CI.
- If not an ensemble: resample the training set 100 times with replacement; retrain a shallow surrogate or use the model's own predict_proba distribution over bootstrap samples.

### 3.2 Pre-Computed Statistics JSON

Generate this file once from `cleaned_data_zimbabwe.csv` and store it as `population_stats.json` in the frontend's `/public` or `/src/data/` directory (match existing conventions).

```json
{
  "generated_at": "2025-01-15T00:00:00Z",
  "n_records": 223,
  "severity_tiers": {
    "Mild": { "n": 118, "blood_loss_range": "500-999ml" },
    "Moderate": { "n": 67, "blood_loss_range": "1000-1499ml" },
    "Severe": { "n": 38, "blood_loss_range": ">=1500ml" }
  },
  "features": {
    "age_years": {
      "overall": { "mean": 0, "std": 0, "p5": 0, "p25": 0, "p50": 0, "p75": 0, "p95": 0 },
      "Mild":     { "mean": 0, "std": 0, "p5": 0, "p25": 0, "p50": 0, "p75": 0, "p95": 0 },
      "Moderate": { "mean": 0, "std": 0, "p5": 0, "p25": 0, "p50": 0, "p75": 0, "p95": 0 },
      "Severe":   { "mean": 0, "std": 0, "p5": 0, "p25": 0, "p50": 0, "p75": 0, "p95": 0 }
    }
    // ... repeat for: gestational_age_wks, gravida_num, parity_num, duration_labour_min,
    //     est_blood_loss_ml, birth_weight_g
  }
}
```

Script to generate this file (run once, commit the output):

```python
import pandas as pd
import json
import numpy as np

df = pd.read_csv("cleaned_data_zimbabwe.csv")

def severity(blood_loss):
    if blood_loss < 1000:
        return "Mild"
    elif blood_loss < 1500:
        return "Moderate"
    else:
        return "Severe"

df["severity_tier"] = df["est_blood_loss_ml"].apply(severity)

continuous_features = [
    "age_years", "gestational_age_wks", "gravida_num", "parity_num",
    "duration_labour_min", "est_blood_loss_ml", "birth_weight_g"
]

tiers = ["Mild", "Moderate", "Severe"]
stats = {"features": {}}

for feature in continuous_features:
    stats["features"][feature] = {}
    for tier in ["overall"] + tiers:
        subset = df if tier == "overall" else df[df["severity_tier"] == tier]
        col = subset[feature].dropna()
        stats["features"][feature][tier] = {
            "mean": round(col.mean(), 2),
            "std": round(col.std(), 2),
            "p5":  round(col.quantile(0.05), 2),
            "p25": round(col.quantile(0.25), 2),
            "p50": round(col.quantile(0.50), 2),
            "p75": round(col.quantile(0.75), 2),
            "p95": round(col.quantile(0.95), 2),
        }

with open("population_stats.json", "w") as f:
    json.dump(stats, f, indent=2)

print("Done.")
```

### 3.3 Counterfactual Grid Search — Implementation Pattern

No external counterfactual library. Implement inline:

```python
def find_counterfactual(patient_features: dict, model, feature_name: str,
                        target_direction: str, steps: int = 20) -> dict:
    """
    Grid search from patient's current value toward population median.
    Returns first value at which the predicted severity tier changes.
    """
    current_value = patient_features[feature_name]
    population_median = POPULATION_MEDIANS[feature_name]  # from population_stats.json

    step_values = np.linspace(current_value, population_median, steps)
    current_tier = predict_tier(patient_features, model)

    for value in step_values:
        modified = {**patient_features, feature_name: value}
        new_tier = predict_tier(modified, model)
        if new_tier != current_tier:
            return {
                "feature": feature_name,
                "current_value": current_value,
                "suggested_target": round(value, 1),
                "current_tier": current_tier,
                "projected_tier": new_tier,
            }
    return None  # No tier change found within range
```

---

## 4. FRONTEND COMPONENT SPECIFICATIONS

### 4.1 Shared Theme File

Create or update the shared theme/colour constants file. **All colour usage across the entire application must reference this file.** Never hardcode hex values inline.

```javascript
// theme.js or theme.ts — adapt to existing project conventions

export const PPH_COLOURS = {
  severe: {
    background: "#D32F2F",
    text: "#FFFFFF",
    label: "Severe PPH",
  },
  moderate: {
    background: "#F57C00",
    text: "#FFFFFF",
    label: "Moderate PPH",
  },
  mild: {
    background: "#388E3C",
    text: "#FFFFFF",
    label: "Mild PPH",
  },
};

// Reference: These colours align with WHO traffic-light severity frameworks
// and are consistent with HL7 FHIR R4 flag category coding for clinical alerts.
// WHO Safe Childbirth Checklist and clinical decision support colour semantics:
// Red = life-threatening / immediate action, Amber = elevated risk / monitor,
// Green = lower risk / standard care. See: WHO/RHR/15.01.
// HL7 FHIR Flag.category: http://hl7.org/fhir/R4/flag.html
```

### 4.2 Clinical Decision Support Notes — Lookup Table

This lookup table drives Zone D auto-generated bullet points. It is a **static template** — never generate these dynamically with AI. Extend the table if additional features become top SHAP contributors.

```javascript
// clinicalNotes.js
export const CLINICAL_NOTES_LOOKUP = {
  delivery_method_clean: {
    LSCS: "Surgical delivery (LSCS) is associated with elevated intraoperative blood loss — ensure haematology cross-match is current and oxytocin infusion is prepared.",
    FORCEPS: "Instrumental delivery (forceps) carries increased risk of perineal trauma and associated haemorrhage — inspect perineum thoroughly post-delivery.",
    NVD: "Normal vaginal delivery — apply active management of the third stage of labour (AMTSL) per WHO PPH prevention guidelines.",
  },
  hiv_status_num: {
    1: "Maternal HIV-positive status: review IV oxytocin protocol in context of current antiretroviral medications. Misoprostol may be preferred in some ARV combinations.",
  },
  gestational_age_wks: {
    preterm: "Preterm delivery (<37 weeks) is associated with uterine atony risk — ensure uterotonics are immediately available.",
  },
  booked: {
    unbooked: "Patient was unbooked (no antenatal care) — baseline haematology may be unknown. Order FBC and group & screen immediately.",
  },
  duration_labour_min: {
    prolonged: "Prolonged labour (>720 minutes) is associated with uterine atony — monitor uterine tone closely post-delivery and have oxytocin infusion ready.",
  },
  parity_num: {
    high: "Grand multiparity (parity ≥4) is an independent risk factor for uterine atony — heightened vigilance for PPH in the immediate postpartum period.",
  },
  gravida_num: {
    high: "High gravida count — take a detailed obstetric history if not already done, including previous PPH episodes.",
  },
  est_blood_loss_ml: {
    moderate: "Estimated blood loss in the moderate range — initiate IV access if not already in place and prepare blood products.",
    severe: "Estimated blood loss ≥1,500 ml — activate massive haemorrhage protocol immediately. Call for senior obstetric and anaesthetic support.",
  },
};
```

### 4.3 Zone B — Abnormality Flag Thresholds

```javascript
// abnormalityFlags.js
export const ABNORMALITY_FLAGS = [
  {
    feature: "gestational_age_wks",
    condition: (v) => v < 37,
    severity: "amber",
    note: "Preterm delivery",
  },
  {
    feature: "est_blood_loss_ml",
    condition: (v) => v >= 1500,
    severity: "red",
    note: "Severe PPH threshold",
  },
  {
    feature: "est_blood_loss_ml",
    condition: (v) => v >= 1000 && v < 1500,
    severity: "amber",
    note: "Moderate PPH threshold",
  },
  {
    feature: "hiv_status_num",
    condition: (v) => v === 1,
    severity: "amber",
    note: "HIV-positive — review medication protocol",
  },
  {
    feature: "duration_labour_min",
    condition: (v) => v > 720,
    severity: "amber",
    note: "Prolonged labour",
  },
  {
    feature: "parity_num",
    condition: (v) => v >= 4,
    severity: "amber",
    note: "Grand multiparity",
  },
  {
    feature: "booked",
    condition: (v) => v === "unbooked",
    severity: "amber",
    note: "No antenatal care",
  },
];
```

### 4.4 SHAP Bar Chart — Component Requirements

```
SHAPBarChart component:
  Props:
    - shapValues: { [featureName: string]: number }
    - patientValues: { [featureName: string]: any }
    - title?: string

  Requirements:
    - Horizontal bar chart
    - Bars to the right (positive SHAP): colour PPH_COLOURS.severe.background (#D32F2F)
    - Bars to the left (negative SHAP): #1565C0 (deep blue)
    - Sort bars by Math.abs(shapValue) descending — strongest contributor at top
    - Each bar labelled: "{feature_display_name} ({patient_value})"
    - Vertical zero line at x=0
    - X-axis label: "SHAP Contribution Value"
    - Y-axis: feature names
    - Chart title: "Why the AI reached this prediction — Feature Contributions"
    - Subtitle: "SHAP values show how much each factor raised or lowered the predicted
                 PPH severity for this specific patient."
    - Data source line: "Computed from patient input submitted {timestamp}"
    - Tooltip: shows exact SHAP value and patient value on hover
    - Alt text: "SHAP feature contribution chart showing [N] features. 
                 Top contributor: {feature} with value {shap}."
    - Use existing charting library (check audit result)
```

### 4.5 Batch Sample Excel File

Generate a sample Excel file with these exact column headers in this order, and one example row:

```
age_years | gestational_age_wks | booked | gravida_num | parity_num | children_alive |
past_obst_complications | abnormalities | duration_labour_min | delivery_method_clean |
est_blood_loss_ml | perineum | birth_weight_g | sex_of_baby | hiv_status_num
```

Example row values:
```
28 | 38 | booked | 2 | 1 | 1 | nil | nil | 360 | NVD | 600 | Intact | 3100 | Girl | 0
```

---

## 5. HARD RULES — NEVER VIOLATE THESE

1. **Do not alter existing functionality.** Extend only. If a page already has a risk gauge, do not rebuild it — add to it.

2. **Do not introduce new charting libraries.** Use whatever is already in the project (`recharts` or `plotly.js`).

3. **Do not use DiCE or any external counterfactual library.** Implement the grid search pattern specified in Section 3.3.

4. **Do not hardcode hex colour values anywhere except the shared theme file.** After writing code, run: `grep -r "#D32F2F\|#F57C00\|#388E3C" src/` — any match outside the theme file is a bug.

5. **Do not read the full CSV at runtime.** Population statistics must be pre-computed and stored in a static JSON file. The CSV is only used during the one-time stats generation step.

6. **Do not generate clinical notes with AI/LLM inference.** Clinical Decision Support Notes in Zone D must come from the static lookup table only.

7. **Do not use colour alone to convey clinical severity.** Every colour indicator must have an accompanying text label.

8. **Do not silently impute missing or out-of-range values.** Always display the yellow warning banner first.

9. **Do not commit any stroke-related terminology or dataset references.** MediFlow is a PPH application. Any stroke reference found is a critical bug.

10. **Do not treat `pph` column as a prediction target.** All records have `pph = 1`. The prediction target is PPH severity tier derived from `est_blood_loss_ml`.

11. **Maintain existing themes and visual context.** New components must feel native to the existing design — match fonts, spacing, card styles, button styles, and layout conventions exactly.

12. **Tick plan checkboxes only when the task is truly complete and tested.** Do not tick ahead or in anticipation.

---

## 6. REFERENCE DATA

### 6.1 Validated Input Ranges (for missing-data warnings)

| Feature | Min | Max | Unit |
|---|---|---|---|
| `age_years` | 15 | 44 | years |
| `gestational_age_wks` | 22 | 43 | weeks |
| `est_blood_loss_ml` | 500 | 3,000 | ml |
| `birth_weight_g` | 200 | 4,900 | g |
| `duration_labour_min` | 1 | — | minutes (must be > 0) |
| `gravida_num` | 1 | 9 | count |
| `parity_num` | 0 | 8 | count |

### 6.2 Clinical Standards Referenced

The following standards inform design decisions in this specification. Reference them in code comments where relevant:

- **WHO PPH Prevention Guidelines** — Active Management of the Third Stage of Labour (AMTSL). WHO/RHR/12.30.
- **WHO Safe Childbirth Checklist** — Colour semantics for clinical risk levels. WHO/HIS/PSP/2015.2.
- **HL7 FHIR R4 Flag Resource** — Clinical alert severity coding. http://hl7.org/fhir/R4/flag.html
- **LOINC** — Logical Observation Identifiers Names and Codes (regenstrief.org). Used for feature labelling.
- **NICE Guideline NG121** — Intrapartum care for women with existing medical conditions or obstetric complications.
- **ISO 62304** — Medical device software lifecycle (relevant to audit trail and version documentation).

### 6.3 Model Version String

Use this string consistently wherever a model version is displayed:

```
MediFlow-PPH-v1.0
```

---

## 7. COMMIT STRATEGY

- One commit per completed sub-phase (e.g., "feat: Zone A patient headline banner — Phase 1.1")
- Commit message format: `feat|fix|chore: [description] — Phase [X.Y]`
- Never commit broken builds
- Never commit with hardcoded colours outside the theme file
- Phase 0 (audit + stroke fix + theme file) must be its own commit before any feature work begins

---

## 8. FINAL NOTE TO THE AGENT

You are building a clinical tool used in obstetric emergencies in Zimbabwe. Every label, note, and data display has potential clinical consequences. Accuracy of domain language, correctness of the PPH context, and reliability of the XAI outputs are paramount.

When in doubt about clinical terminology or feature interpretation, refer to the dataset column table in Section 2.3 of this document. Do not invent clinical interpretations.

If you encounter any ambiguity not covered by this document or the user's answers to the clarification questions, **stop and ask the user** rather than making assumptions.

---

*End of Agent Briefing Document*  
*MediFlow Clinical XAI Evidence Dashboard — Upgrade Specification v1.0*  
*Feed this file to GitHub Copilot alongside the full MediFlow codebase.*