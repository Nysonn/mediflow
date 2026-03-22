package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
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
	patientIndex := make(map[string]int)
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
		patientIndex[pw.ID] = len(stats.RecentPatients)
		pw.Assessments = make([]models.AssessmentWithUser, 0)
		stats.RecentPatients = append(stats.RecentPatients, pw)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Fetch full assessment history for each recent patient
	if len(stats.RecentPatients) > 0 {
		patientIDs := make([]string, len(stats.RecentPatients))
		for i, p := range stats.RecentPatients {
			patientIDs[i] = p.ID
		}
		aRows, err := s.db.Query(ctx, `
			SELECT
				a.id, a.patient_id, a.assessed_by_user_id,
				a.duration_labour_min, a.hiv_status_num, a.parity_num,
				a.booked_unbooked, a.delivery_method_clean_lscs,
				a.prediction, a.probability_no_pph, a.probability_severe_pph,
				a.risk_level, a.created_at,
				COALESCE(u.full_name, '') AS assessed_by_name
			FROM assessments a
			LEFT JOIN users u ON a.assessed_by_user_id = u.id
			WHERE a.patient_id = ANY($1)
			ORDER BY a.patient_id, a.created_at DESC`,
			patientIDs,
		)
		if err != nil {
			return nil, fmt.Errorf("fetch assessments for recent patients: %w", err)
		}
		defer aRows.Close()
		for aRows.Next() {
			var a models.AssessmentWithUser
			var createdAt time.Time
			if err := aRows.Scan(
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
			if idx, ok := patientIndex[a.PatientID]; ok {
				stats.RecentPatients[idx].Assessments = append(stats.RecentPatients[idx].Assessments, a)
			}
		}
		if err := aRows.Err(); err != nil {
			return nil, err
		}
	}

	return &stats, nil
}

// UpdateAssessment re-runs the ML model with new inputs and overwrites the stored assessment record.
// If the model call fails, the existing record is left untouched.
func (s *AssessmentService) UpdateAssessment(
	ctx context.Context,
	assessmentID string,
	input models.CreateAssessmentInput,
) (*models.AssessmentWithUser, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}

	result, err := s.modelService.Predict(ctx, models.ModelPredictRequest{
		DurationLabourMin:       input.DurationLabourMin,
		HIVStatusNum:            input.HIVStatusNum,
		ParityNum:               input.ParityNum,
		BookedUnbooked:          input.BookedUnbooked,
		DeliveryMethodCleanLSCS: input.DeliveryMethodCleanLSCS,
	})
	if err != nil {
		return nil, fmt.Errorf("model prediction failed: %w", err)
	}

	var id string
	err = s.db.QueryRow(ctx, `
		UPDATE assessments
		SET duration_labour_min        = $1,
		    hiv_status_num             = $2,
		    parity_num                 = $3,
		    booked_unbooked            = $4,
		    delivery_method_clean_lscs = $5,
		    prediction                 = $6,
		    probability_no_pph         = $7,
		    probability_severe_pph     = $8,
		    risk_level                 = $9
		WHERE id = $10
		RETURNING id`,
		input.DurationLabourMin, input.HIVStatusNum, input.ParityNum,
		input.BookedUnbooked, input.DeliveryMethodCleanLSCS,
		result.Prediction, result.ProbabilityNoPPH, result.ProbabilitySeverePPH,
		result.RiskLevel,
		assessmentID,
	).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("update assessment: %w", err)
	}

	return s.GetAssessmentByID(ctx, id)
}

// CreatePatientWithAssessment creates a patient and runs an assessment in a single atomic operation.
// The ML model is called first; if it fails, nothing is written to the database.
func (s *AssessmentService) CreatePatientWithAssessment(
	ctx context.Context,
	patientInput models.CreatePatientInput,
	assessmentInput models.CreateAssessmentInput,
	addedByUserID string,
) (*models.PatientWithUser, *models.AssessmentWithUser, error) {
	if s.db == nil {
		return nil, nil, fmt.Errorf("database not available")
	}

	// Call the model first — no DB writes happen until this succeeds.
	result, err := s.modelService.Predict(ctx, models.ModelPredictRequest{
		DurationLabourMin:       assessmentInput.DurationLabourMin,
		HIVStatusNum:            assessmentInput.HIVStatusNum,
		ParityNum:               assessmentInput.ParityNum,
		BookedUnbooked:          assessmentInput.BookedUnbooked,
		DeliveryMethodCleanLSCS: assessmentInput.DeliveryMethodCleanLSCS,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("model prediction failed: %w", err)
	}

	// Begin transaction so patient + assessment are created atomically.
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var p models.Patient
	err = tx.QueryRow(ctx, `
		INSERT INTO patients (patient_id_number, full_name, age, date_of_admission, added_by_user_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, patient_id_number, full_name, age, date_of_admission, added_by_user_id, created_at, updated_at`,
		patientInput.PatientIDNumber, patientInput.FullName, patientInput.Age, patientInput.DateOfAdmission, addedByUserID,
	).Scan(
		&p.ID, &p.PatientIDNumber, &p.FullName, &p.Age,
		&p.DateOfAdmission, &p.AddedByUserID, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, nil, fmt.Errorf("duplicate_patient_id")
		}
		return nil, nil, fmt.Errorf("insert patient: %w", err)
	}

	var a models.Assessment
	err = tx.QueryRow(ctx, `
		INSERT INTO assessments (
			patient_id, assessed_by_user_id,
			duration_labour_min, hiv_status_num, parity_num,
			booked_unbooked, delivery_method_clean_lscs,
			prediction, probability_no_pph, probability_severe_pph, risk_level
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, patient_id, assessed_by_user_id,
			duration_labour_min, hiv_status_num, parity_num,
			booked_unbooked, delivery_method_clean_lscs,
			prediction, probability_no_pph, probability_severe_pph, risk_level, created_at`,
		p.ID, addedByUserID,
		assessmentInput.DurationLabourMin, assessmentInput.HIVStatusNum, assessmentInput.ParityNum,
		assessmentInput.BookedUnbooked, assessmentInput.DeliveryMethodCleanLSCS,
		result.Prediction, result.ProbabilityNoPPH, result.ProbabilitySeverePPH, result.RiskLevel,
	).Scan(
		&a.ID, &a.PatientID, &a.AssessedByUserID,
		&a.DurationLabourMin, &a.HIVStatusNum, &a.ParityNum,
		&a.BookedUnbooked, &a.DeliveryMethodCleanLSCS,
		&a.Prediction, &a.ProbabilityNoPPH, &a.ProbabilitySeverePPH,
		&a.RiskLevel, &a.CreatedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("insert assessment: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("commit transaction: %w", err)
	}

	// Fetch the clinician name for the response (same user added both records).
	var addedByName string
	s.db.QueryRow(ctx, `SELECT full_name FROM users WHERE id = $1`, addedByUserID).Scan(&addedByName) //nolint:errcheck

	pw := &models.PatientWithUser{
		Patient:     p,
		AddedByName: addedByName,
		LatestRisk:  result.RiskLevel,
	}
	aw := &models.AssessmentWithUser{
		Assessment:     a,
		AssessedByName: addedByName,
	}
	return pw, aw, nil
}
