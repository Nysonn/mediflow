import api from './axios';

/** Request body for /explain and /confidence — same 5 model features as /predict */
export interface ModelXAIRequest {
  duration_labour_min: number;
  hiv_status_num: number;
  parity_num: number;
  booked_unbooked: number;
  delivery_method_clean_LSCS: number;
}

export interface ExplainResponse {
  shap_values: Record<string, number>;
  base_value: number;
  method: 'shap_linear' | 'coefficient_fallback';
  computed_at: string;
}

export interface ConfidenceResponse {
  risk: number;
  ci_low: number;
  ci_high: number;
  severity_tier: 'Mild' | 'Moderate' | 'Severe';
  n_bootstrap: number;
  computed_at: string;
}

export const modelXaiApi = {
  /**
   * Fetch SHAP feature contribution values for a single patient prediction.
   * Calls POST /api/v1/model/explain (Go proxy → Python /explain)
   */
  explain: (input: ModelXAIRequest) =>
    api.post<ExplainResponse>('/model/explain', input).then((r) => r.data),

  /**
   * Fetch bootstrap confidence interval around predicted severe PPH probability.
   * Calls POST /api/v1/model/confidence (Go proxy → Python /confidence)
   */
  confidence: (input: ModelXAIRequest) =>
    api.post<ConfidenceResponse>('/model/confidence', input).then((r) => r.data),
};
