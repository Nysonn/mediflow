package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// ModelXAIHandler proxies XAI requests to the Python model service.
// Endpoints: POST /api/v1/model/explain  and  POST /api/v1/model/confidence
type ModelXAIHandler struct {
	modelServiceURL string
	httpClient      *http.Client
}

// NewModelXAIHandler creates a handler that proxies to the given model service base URL.
func NewModelXAIHandler(modelServiceURL string) *ModelXAIHandler {
	return &ModelXAIHandler{
		modelServiceURL: modelServiceURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Explain proxies POST /api/v1/model/explain → Python model service POST /explain
// Returns SHAP feature contribution values for a single patient prediction.
func (h *ModelXAIHandler) Explain(c *gin.Context) {
	h.proxyToModel(c, "/explain")
}

// Confidence proxies POST /api/v1/model/confidence → Python model service POST /confidence
// Returns bootstrap confidence interval around the predicted severe PPH probability.
func (h *ModelXAIHandler) Confidence(c *gin.Context) {
	h.proxyToModel(c, "/confidence")
}

// proxyToModel forwards the request body to the model service at the given path
// and streams the response back to the client.
func (h *ModelXAIHandler) proxyToModel(c *gin.Context, path string) {
	// Read and validate the request body — only JSON is accepted.
	body, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20)) // 1 MB limit
	if err != nil {
		StandardError(c, http.StatusBadRequest, "bad_request", "Failed to read request body")
		return
	}

	// Validate that the body is valid JSON before forwarding.
	if !json.Valid(body) {
		StandardError(c, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON")
		return
	}

	targetURL := h.modelServiceURL + path

	req, err := http.NewRequestWithContext(
		c.Request.Context(),
		http.MethodPost,
		targetURL,
		bytes.NewReader(body),
	)
	if err != nil {
		StandardError(c, http.StatusInternalServerError, "proxy_error", "Failed to build upstream request")
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		StandardError(c, http.StatusServiceUnavailable, "model_unavailable",
			"The model service is currently unavailable. Please try again.")
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		StandardError(c, http.StatusInternalServerError, "proxy_error", "Failed to read model service response")
		return
	}

	c.Data(resp.StatusCode, "application/json", respBody)
}
