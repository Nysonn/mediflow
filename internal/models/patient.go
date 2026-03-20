package models

import "time"

// Patient maps to the patients table.
type Patient struct {
	ID              string    `db:"id"                json:"id"`
	PatientIDNumber string    `db:"patient_id_number" json:"patient_id_number"`
	FullName        string    `db:"full_name"         json:"full_name"`
	Age             int       `db:"age"               json:"age"`
	DateOfAdmission time.Time `db:"date_of_admission" json:"date_of_admission"`
	AddedByUserID   string    `db:"added_by_user_id"  json:"added_by_user_id"`
	CreatedAt       time.Time `db:"created_at"        json:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"        json:"updated_at"`
}

// PatientWithUser embeds Patient and adds the name of the user who added the record,
// populated via a JOIN with the users table.
type PatientWithUser struct {
	Patient
	AddedByName string `db:"added_by_name" json:"added_by_name"`
	LatestRisk  string `db:"-"             json:"latest_risk"` // "HIGH", "LOW", or ""
}

// CreatePatientInput holds the user-provided fields when registering a new patient.
type CreatePatientInput struct {
	PatientIDNumber string    `json:"patient_id_number" form:"patient_id_number"`
	FullName        string    `json:"full_name"         form:"full_name"`
	Age             int       `json:"age"               form:"age"`
	DateOfAdmission time.Time `json:"date_of_admission" form:"date_of_admission"`
}

// UpdatePatientInput holds optional fields for a partial patient update.
// A nil pointer means "leave this field unchanged".
type UpdatePatientInput struct {
	PatientIDNumber *string    `json:"patient_id_number,omitempty" form:"patient_id_number"`
	FullName        *string    `json:"full_name,omitempty"         form:"full_name"`
	Age             *int       `json:"age,omitempty"               form:"age"`
	DateOfAdmission *time.Time `json:"date_of_admission,omitempty" form:"date_of_admission"`
}

// PatientListPage carries paginated patient data for the patients list template.
type PatientListPage struct {
	Patients   []PatientWithUser
	TotalCount int
	Page       int
	PageSize   int
	TotalPages int
	Search     string
	HasNext    bool
	HasPrev    bool
}

// PatientDetailPage carries a patient and their full assessment history for the detail template.
type PatientDetailPage struct {
	Patient           *PatientWithUser
	Assessments       []AssessmentWithUser
	LatestRisk        string  // "HIGH", "LOW", or "" when no assessments
	LatestProbability float64 // probability_severe_pph × 100 of the most recent assessment
}
