package models

import "time"

// Assessment maps to the assessments table.
type Assessment struct {
	ID                      string    `db:"id"                         json:"id"`
	PatientID               string    `db:"patient_id"                 json:"patient_id"`
	AssessedByUserID        string    `db:"assessed_by_user_id"        json:"assessed_by_user_id"`
	DurationLabourMin       float64   `db:"duration_labour_min"        json:"duration_labour_min"`
	HIVStatusNum            float64   `db:"hiv_status_num"             json:"hiv_status_num"`
	ParityNum               int       `db:"parity_num"                 json:"parity_num"`
	BookedUnbooked          int       `db:"booked_unbooked"            json:"booked_unbooked"`
	DeliveryMethodCleanLSCS int       `db:"delivery_method_clean_lscs" json:"delivery_method_clean_lscs"`
	Prediction              int       `db:"prediction"                 json:"prediction"`
	ProbabilityNoPPH        float64   `db:"probability_no_pph"         json:"probability_no_pph"`
	ProbabilitySeverePPH    float64   `db:"probability_severe_pph"     json:"probability_severe_pph"`
	RiskLevel               string    `db:"risk_level"                 json:"risk_level"`
	CreatedAt               time.Time `db:"created_at"                 json:"created_at"`
}

// AssessmentWithUser embeds Assessment and adds the name of the clinician who ran it,
// populated via a JOIN with the users table.
type AssessmentWithUser struct {
	Assessment
	AssessedByName string `db:"assessed_by_name" json:"assessed_by_name"`
}

// CreateAssessmentInput holds the 5 model input fields provided by the clinician.
// The output fields (prediction, probabilities, risk_level) are filled by the model service.
type CreateAssessmentInput struct {
	DurationLabourMin       float64 `json:"duration_labour_min"        form:"duration_labour_min"`
	HIVStatusNum            float64 `json:"hiv_status_num"             form:"hiv_status_num"`
	ParityNum               int     `json:"parity_num"                 form:"parity_num"`
	BookedUnbooked          int     `json:"booked_unbooked"            form:"booked_unbooked"`
	DeliveryMethodCleanLSCS int     `json:"delivery_method_clean_lscs" form:"delivery_method_clean_lscs"`
}

// ModelPredictRequest is the exact JSON body sent to the Python model service's POST /predict.
type ModelPredictRequest struct {
	DurationLabourMin       float64 `json:"duration_labour_min"`
	HIVStatusNum            float64 `json:"hiv_status_num"`
	ParityNum               int     `json:"parity_num"`
	BookedUnbooked          int     `json:"booked_unbooked"`
	DeliveryMethodCleanLSCS int     `json:"delivery_method_clean_LSCS"`
}

// ModelPredictResponse is the exact JSON body returned by the Python model service's POST /predict.
type ModelPredictResponse struct {
	Prediction           int     `json:"prediction"`
	ProbabilityNoPPH     float64 `json:"probability_no_pph"`
	ProbabilitySeverePPH float64 `json:"probability_severe_pph"`
	RiskLevel            string  `json:"risk_level"`
}

// ClinicianStats holds aggregated statistics scoped to a specific clinician.
type ClinicianStats struct {
	MyPatients     int
	MyAssessments  int
	MyHighRisk     int
	MyLowRisk      int
	RecentPatients []PatientWithUser
}

// AssessmentResultPage carries an assessment and its patient for the result display page.
type AssessmentResultPage struct {
	Assessment *AssessmentWithUser
	Patient    *PatientWithUser
}
