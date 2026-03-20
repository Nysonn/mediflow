package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"mediflow/internal/models"
)

// PatientService handles all database operations for patients and their assessments.
type PatientService struct {
	db *pgxpool.Pool
}

// NewPatientService creates a PatientService backed by the provided connection pool.
func NewPatientService(db *pgxpool.Pool) *PatientService {
	return &PatientService{db: db}
}

const patientSelectCols = `
	p.id, p.patient_id_number, p.full_name, p.age,
	p.date_of_admission, p.added_by_user_id,
	p.created_at, p.updated_at`

// scanPatientWithUser scans a row that includes the patient columns plus added_by_name.
func scanPatientWithUser(row pgx.Row) (*models.PatientWithUser, error) {
	var pw models.PatientWithUser
	err := row.Scan(
		&pw.ID, &pw.PatientIDNumber, &pw.FullName, &pw.Age,
		&pw.DateOfAdmission, &pw.AddedByUserID,
		&pw.CreatedAt, &pw.UpdatedAt,
		&pw.AddedByName,
	)
	if err != nil {
		return nil, err
	}
	return &pw, nil
}

// CreatePatient inserts a new patient record and returns it.
// Returns a descriptive error if the patient_id_number already exists.
func (s *PatientService) CreatePatient(
	ctx context.Context,
	input models.CreatePatientInput,
	addedByUserID string,
) (*models.Patient, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		INSERT INTO patients (patient_id_number, full_name, age, date_of_admission, added_by_user_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, patient_id_number, full_name, age, date_of_admission, added_by_user_id, created_at, updated_at`

	var p models.Patient
	err := s.db.QueryRow(ctx, query,
		input.PatientIDNumber, input.FullName, input.Age, input.DateOfAdmission, addedByUserID,
	).Scan(
		&p.ID, &p.PatientIDNumber, &p.FullName, &p.Age,
		&p.DateOfAdmission, &p.AddedByUserID, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, fmt.Errorf("A patient with this ID number already exists")
		}
		return nil, fmt.Errorf("create patient: %w", err)
	}
	return &p, nil
}

// GetPatientByID fetches a single patient with the name of the user who added them.
func (s *PatientService) GetPatientByID(ctx context.Context, id string) (*models.PatientWithUser, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `
		SELECT ` + patientSelectCols + `,
			COALESCE(u.full_name, '') AS added_by_name
		FROM patients p
		LEFT JOIN users u ON p.added_by_user_id = u.id
		WHERE p.id = $1`

	return scanPatientWithUser(s.db.QueryRow(ctx, query, id))
}

// GetAllPatients returns a paginated list of patients with optional search, total count,
// and the latest assessment risk level per patient merged in.
func (s *PatientService) GetAllPatients(
	ctx context.Context,
	search string,
	page int,
	pageSize int,
) ([]models.PatientWithUser, int, error) {
	if s.db == nil {
		return nil, 0, fmt.Errorf("database not available")
	}

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize

	// Total count for pagination
	countQuery := `
		SELECT COUNT(*)
		FROM patients p
		WHERE ($1 = '' OR p.full_name ILIKE '%' || $1 || '%' OR p.patient_id_number ILIKE '%' || $1 || '%')`

	var total int
	if err := s.db.QueryRow(ctx, countQuery, search).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count patients: %w", err)
	}

	// Paginated patients with adder name
	listQuery := `
		SELECT ` + patientSelectCols + `,
			COALESCE(u.full_name, '') AS added_by_name
		FROM patients p
		LEFT JOIN users u ON p.added_by_user_id = u.id
		WHERE ($1 = '' OR p.full_name ILIKE '%' || $1 || '%' OR p.patient_id_number ILIKE '%' || $1 || '%')
		ORDER BY p.created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := s.db.Query(ctx, listQuery, search, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list patients: %w", err)
	}
	defer rows.Close()

	patients := make([]models.PatientWithUser, 0)
	idIndex := make(map[string]int) // patient_id → slice index, for risk merging

	for rows.Next() {
		var pw models.PatientWithUser
		if err := rows.Scan(
			&pw.ID, &pw.PatientIDNumber, &pw.FullName, &pw.Age,
			&pw.DateOfAdmission, &pw.AddedByUserID,
			&pw.CreatedAt, &pw.UpdatedAt,
			&pw.AddedByName,
		); err != nil {
			return nil, 0, fmt.Errorf("scan patient: %w", err)
		}
		idIndex[pw.ID] = len(patients)
		patients = append(patients, pw)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	// Merge latest risk level for each patient on this page
	if len(patients) > 0 {
		patientIDs := make([]string, len(patients))
		for i, p := range patients {
			patientIDs[i] = p.ID
		}

		riskRows, err := s.db.Query(ctx, `
			SELECT DISTINCT ON (patient_id) patient_id, risk_level
			FROM assessments
			WHERE patient_id = ANY($1)
			ORDER BY patient_id, created_at DESC`,
			patientIDs,
		)
		if err == nil {
			defer riskRows.Close()
			for riskRows.Next() {
				var pid, risk string
				if riskRows.Scan(&pid, &risk) == nil {
					if idx, ok := idIndex[pid]; ok {
						patients[idx].LatestRisk = risk
					}
				}
			}
		}
	}

	return patients, total, nil
}

// UpdatePatient applies non-nil fields from UpdatePatientInput to the patient record.
func (s *PatientService) UpdatePatient(
	ctx context.Context,
	id string,
	input models.UpdatePatientInput,
) (*models.Patient, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}

	setClauses := []string{"updated_at = NOW()"}
	args := []interface{}{}
	argIdx := 1

	if input.PatientIDNumber != nil {
		setClauses = append(setClauses, fmt.Sprintf("patient_id_number = $%d", argIdx))
		args = append(args, *input.PatientIDNumber)
		argIdx++
	}
	if input.FullName != nil {
		setClauses = append(setClauses, fmt.Sprintf("full_name = $%d", argIdx))
		args = append(args, *input.FullName)
		argIdx++
	}
	if input.Age != nil {
		setClauses = append(setClauses, fmt.Sprintf("age = $%d", argIdx))
		args = append(args, *input.Age)
		argIdx++
	}
	if input.DateOfAdmission != nil {
		setClauses = append(setClauses, fmt.Sprintf("date_of_admission = $%d", argIdx))
		args = append(args, *input.DateOfAdmission)
		argIdx++
	}

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE patients
		SET %s
		WHERE id = $%d
		RETURNING id, patient_id_number, full_name, age, date_of_admission, added_by_user_id, created_at, updated_at`,
		strings.Join(setClauses, ", "), argIdx,
	)

	var p models.Patient
	err := s.db.QueryRow(ctx, query, args...).Scan(
		&p.ID, &p.PatientIDNumber, &p.FullName, &p.Age,
		&p.DateOfAdmission, &p.AddedByUserID, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, fmt.Errorf("A patient with this ID number already exists")
		}
		return nil, fmt.Errorf("update patient: %w", err)
	}
	return &p, nil
}

// GetPatientWithAssessments fetches the patient detail and all assessments ordered newest first.
func (s *PatientService) GetPatientWithAssessments(
	ctx context.Context,
	patientID string,
) (*models.PatientWithUser, []models.AssessmentWithUser, error) {
	if s.db == nil {
		return nil, nil, fmt.Errorf("database not available")
	}

	patient, err := s.GetPatientByID(ctx, patientID)
	if err != nil {
		return nil, nil, err
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
		return nil, nil, fmt.Errorf("fetch assessments: %w", err)
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
			return nil, nil, fmt.Errorf("scan assessment: %w", err)
		}
		a.CreatedAt = createdAt
		assessments = append(assessments, a)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	return patient, assessments, nil
}
