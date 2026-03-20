package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"mediflow/internal/models"
	"mediflow/internal/services"
)

// DashboardHandler serves the clinician dashboard endpoint.
type DashboardHandler struct {
	assessmentService *services.AssessmentService
	patientService    *services.PatientService
}

// NewDashboardHandler creates a DashboardHandler.
func NewDashboardHandler(
	assessmentService *services.AssessmentService,
	patientService *services.PatientService,
) *DashboardHandler {
	return &DashboardHandler{
		assessmentService: assessmentService,
		patientService:    patientService,
	}
}

// GetDashboard returns clinician-scoped statistics.
// GET /api/v1/dashboard
func (h *DashboardHandler) GetDashboard(c *gin.Context) {
	userID, _ := c.Get("userID")

	stats, err := h.assessmentService.GetClinicianStats(c.Request.Context(), userID.(string))
	if err != nil {
		log.Printf("GetDashboard: GetClinicianStats: %v", err)
		stats = &models.ClinicianStats{
			RecentPatients: []models.PatientWithUser{},
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"my_patients":     stats.MyPatients,
		"my_assessments":  stats.MyAssessments,
		"my_high_risk":    stats.MyHighRisk,
		"my_low_risk":     stats.MyLowRisk,
		"recent_patients": stats.RecentPatients,
	})
}
