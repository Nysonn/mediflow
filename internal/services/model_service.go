package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"mediflow/internal/models"
)

// ModelService communicates with the Python FastAPI prediction sidecar.
type ModelService struct {
	baseURL    string
	httpClient *http.Client
}

// NewModelService creates a ModelService targeting the given base URL.
func NewModelService(baseURL string) *ModelService {
	return &ModelService{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Predict sends input features to the model sidecar and returns the prediction result.
func (s *ModelService) Predict(
	ctx context.Context,
	input models.ModelPredictRequest,
) (*models.ModelPredictResponse, error) {
	body, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("marshal predict request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+"/predict", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build predict request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("The prediction service is currently unavailable. Please try again.")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("prediction service returned status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read predict response: %w", err)
	}

	var result models.ModelPredictResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("parse predict response: %w", err)
	}

	return &result, nil
}

// HealthCheck verifies that the model sidecar is reachable and healthy.
func (s *ModelService) HealthCheck(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+"/health", nil)
	if err != nil {
		return err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("model service health check returned status %d", resp.StatusCode)
	}
	return nil
}
