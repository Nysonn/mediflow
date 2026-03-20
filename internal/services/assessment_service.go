package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"mediflow/internal/models"
)

// AssessmentService handles all database operations for assessments and model predictions.
type AssessmentService struct {
	db           *pgxpool.Pool
	modelService *ModelService
}

// NewAssessmentService creates an AssessmentService backed by the given pool and model service.
func NewAssessmentService(db *pgxpool.Pool, modelService *ModelService) *AssessmentService {
	return &AssessmentService{db: db, modelService: modelService}
}

// CreateAssessment calls the model service, then persists the result to the database.
// If the model service call fails, the assessment is NOT saved and the error is returned.
func (s *AssessmentService) CreateAssessment(
	ctx context.Context,
	patientID string,
	assessedByUserID string,
	input models.CreateAssessmentInput,
) (*models.Assessment, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Build the model request from input fields.
	predictReq := models.ModelPredictRequest{
		DurationLabourMin:       input.DurationLabourMin,
		HIVStatusNum:            input.HIVStatusNum,
		ParityNum:               input.ParityNum,
		BookedUnbooked:          input.BookedUnbooked,
		DeliveryMethodCleanLSCS: input.DeliveryMethodCleanLSCS,
	}

	result, err := s.modelService.Predict(ctx, predictReq)
	if err != nil {
		return nil, err
	}

	query := `
		INSERT INTO assessments (
			patient_id, assessed_by_user_id,
			duration_labour_min, hiv_status_num, parity_num,
			booked_unbooked, delivery_method_clean_lscs,
			prediction, probability_no_pph, probability_severe_pph,
			risk_level
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		RETURNING id, patient_id, assessed_by_user_id,
			duration_labour_min, hiv_status_num, parity_num,
			booked_unbooked, delivery_method_clean_lscs,
			prediction, probability_no_pph, probability_severe_pph,
			risk_level, created_at`

	var a models.Assessment
	err = s.db.QueryRow(ctx, query,
		patientID, assessedByUserID,
		input.DurationLabourMin, input.HIVStatusNum, input.ParityNum,
		input.BookedUnbooked, input.DeliveryMethodCleanLSCS,
		result.Prediction, result.ProbabilityNoPPH, result.ProbabilitySeverePPH,
		result.RiskLevel,
	).Scan(
		&a.ID, &a.PatientID, &a.AssessedByUserID,
		&a.DurationLabourMin, &a.HIVStatusNum, &a.ParityNum,
		&a.BookedUnbooked, &a.DeliveryMethodCleanLSCS,
		&a.Prediction, &a.ProbabilityNoPPH, &a.ProbabilitySeverePPH,
		&a.RiskLevel, &a.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert assessment: %w", err)
	}

	return &a, nil
}

// GetAssessmentByID fetches a single assessment with the name of the assessing clinician.
func (s *AssessmentService) GetAssessmentByID(
	ctx context.Context,
	id string,
) (*models.AssessmentWithUser, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		SELECT
			a.id, a.patient_id, a.assessed_by_user_id,
			a.duration_labour_min, a.hiv_status_num, a.parity_num,
			a.booked_unbooked, a.delivery_method_clean_lscs,
			a.prediction, a.probability_no_pph, a.probability_severe_pph,
			a.risk_level, a.created_at,
			COALESCE(u.full_name, '') AS assessed_by_name
		FROM assessments a
		LEFT JOIN users u ON a.assessed_by_user_id = u.id
		WHERE a.id = $1`

	var a models.AssessmentWithUser
	var createdAt time.Time
	err := s.db.QueryRow(ctx, query, id).Scan(
		&a.ID, &a.PatientID, &a.AssessedByUserID,
		&a.DurationLabourMin, &a.HIVStatusNum, &a.ParityNum,
		&a.BookedUnbooked, &a.DeliveryMethodCleanLSCS,
		&a.Prediction, &a.ProbabilityNoPPH, &a.ProbabilitySeverePPH,
		&a.RiskLevel, &createdAt,
		&a.AssessedByName,
	)
	if err != nil {
		return nil, err
	}
	a.CreatedAt = createdAt
	return &a, nil
}

// GetPatientAssessments returns all assessments for a patient, newest first.
func (s *AssessmentService) GetPatientAssessments(
	ctx context.Context,
	patientID string,
) ([]models.AssessmentWithUser, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}

	rows, err := s.db.Query(ctx, `
		SELECT
			a.id, a.patient_id, a.assessed_by_user_id,
			a.duration_labour_min, a.hiv_status_num, a.parity_num,
			a.booked_unbooked, a.delivery_method_clean_lscs,
			a.prediction, a.probability_no_pph, a.probability_severe_pph,
			a.risk_level, a.created_at,
			COALESCE(u.full_name, '') AS assessed_by_name
		FROM assessments a
		LEFT JOIN users u ON a.assessed_by_user_id = u.id
		WHERE a.patient_id = $1
		ORDER BY a.created_at DESC`,
		patientID,
	)
	if err != nil {
		return nil, fmt.Errorf("fetch assessments: %w", err)
	}
	defer rows.Close()

	assessments := make([]models.AssessmentWithUser, 0)
	for rows.Next() {
		var a models.AssessmentWithUser
		var createdAt time.Time
		if err := rows.Scan(
			&a.ID, &a.PatientID, &a.AssessedByUserID,
			&a.DurationLabourMin, &a.HIVStatusNum, &a.ParityNum,
			&a.BookedUnbooked, &a.DeliveryMethodCleanLSCS,
			&a.Prediction, &a.ProbabilityNoPPH, &a.ProbabilitySeverePPH,
			&a.RiskLevel, &createdAt,
			&a.AssessedByName,
		); err != nil {
			return nil, fmt.Errorf("scan assessment: %w", err)
		}
		a.CreatedAt = createdAt
		assessments = append(assessments, a)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return assessments, nil
}

// GetClinicianStats returns aggregated statistics and recent activity for a clinician.
func (s *AssessmentService) GetClinicianStats(
	ctx context.Context,
	userID string,
) (*models.ClinicianStats, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}

	var stats models.ClinicianStats

	err := s.db.QueryRow(ctx, `
		SELECT
			COUNT(DISTINCT p.id) AS my_patients,
			COUNT(a.id) AS my_assessments,
			COUNT(a.id) FILTER (WHERE a.risk_level = 'HIGH') AS my_high_risk,
			COUNT(a.id) FILTER (WHERE a.risk_level = 'LOW') AS my_low_risk
		FROM patients p
		LEFT JOIN assessments a ON a.patient_id = p.id AND a.assessed_by_user_id = $1
		WHERE p.added_by_user_id = $1`,
		userID,
	).Scan(&stats.MyPatients, &stats.MyAssessments, &stats.MyHighRisk, &stats.MyLowRisk)
	if err != nil {
		return nil, fmt.Errorf("clinician stats query: %w", err)
	}

	rows, err := s.db.Query(ctx, `
		SELECT DISTINCT ON (a.patient_id)
			p.id, p.patient_id_number, p.full_name, p.age,
			p.date_of_admission, p.added_by_user_id,
			p.created_at, p.updated_at,
			COALESCE(u.full_name, '') AS added_by_name,
			a.risk_level AS latest_risk
		FROM assessments a
		JOIN patients p ON a.patient_id = p.id
		LEFT JOIN users u ON p.added_by_user_id = u.id
		WHERE a.assessed_by_user_id = $1
		ORDER BY a.patient_id, a.created_at DESC
		LIMIT 5`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("recent patients query: %w", err)
	}
	defer rows.Close()

	stats.RecentPatients = make([]models.PatientWithUser, 0)
	for rows.Next() {
		var pw models.PatientWithUser
		if err := rows.Scan(
			&pw.ID, &pw.PatientIDNumber, &pw.FullName, &pw.Age,
			&pw.DateOfAdmission, &pw.AddedByUserID,
			&pw.CreatedAt, &pw.UpdatedAt,
			&pw.AddedByName,
			&pw.LatestRisk,
		); err != nil {
			return nil, fmt.Errorf("scan recent patient: %w", err)
		}
		stats.RecentPatients = append(stats.RecentPatients, pw)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &stats, nil
}
