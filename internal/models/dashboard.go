package models

// DashboardStats holds the aggregated statistics displayed on the admin/overview dashboard.
type DashboardStats struct {
	TotalUsers        int               `json:"total_users"`
	TotalDoctors      int               `json:"total_doctors"`
	TotalMidwives     int               `json:"total_midwives"`
	TotalNurses       int               `json:"total_nurses"`
	TotalPatients     int               `json:"total_patients"`
	TotalAssessments  int               `json:"total_assessments"`
	HighRiskCount     int               `json:"high_risk_count"`
	LowRiskCount      int               `json:"low_risk_count"`
	RecentPatients    []PatientWithUser `json:"recent_patients"`
}
