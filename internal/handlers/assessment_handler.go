package handlers

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"mediflow/internal/models"
	"mediflow/internal/services"
)

// AssessmentHandler handles all assessment-related routes.
type AssessmentHandler struct {
	assessmentService *services.AssessmentService
	patientService    *services.PatientService
}

// NewAssessmentHandler creates an AssessmentHandler.
func NewAssessmentHandler(
	assessmentService *services.AssessmentService,
	patientService *services.PatientService,
) *AssessmentHandler {
	return &AssessmentHandler{
		assessmentService: assessmentService,
		patientService:    patientService,
	}
}

// createAssessmentRequest is the JSON body for POST /api/v1/patients/:id/assessments.
type createAssessmentRequest struct {
	DurationLabourMin       float64 `json:"duration_labour_min"`
	HIVStatusNum            float64 `json:"hiv_status_num"`
	ParityNum               int     `json:"parity_num"`
	BookedUnbooked          int     `json:"booked_unbooked"`
	DeliveryMethodCleanLSCS int     `json:"delivery_method_clean_lscs"`
}

// CreateAssessment runs the ML prediction and saves the result.
// POST /api/v1/patients/:id/assessments
func (h *AssessmentHandler) CreateAssessment(c *gin.Context) {
	patientID := c.Param("id")

	var req createAssessmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		StandardError(c, http.StatusBadRequest, "bad_request", "Invalid JSON body")
		return
	}

	fieldErrors := map[string]string{}

	if req.DurationLabourMin <= 0 || req.DurationLabourMin >= 10000 {
		fieldErrors["duration_labour_min"] = "Duration must be a number greater than 0 and less than 10000"
	}
	if req.HIVStatusNum != 0 && req.HIVStatusNum != 1 {
		fieldErrors["hiv_status_num"] = "HIV status must be 0 (Negative) or 1 (Positive)"
	}
	if req.ParityNum < 0 || req.ParityNum > 20 {
		fieldErrors["parity_num"] = "Parity must be between 0 and 20"
	}
	if req.BookedUnbooked != 0 && req.BookedUnbooked != 1 {
		fieldErrors["booked_unbooked"] = "Booking status must be 0 (Booked) or 1 (Unbooked)"
	}
	if req.DeliveryMethodCleanLSCS != 0 && req.DeliveryMethodCleanLSCS != 1 {
		fieldErrors["delivery_method_clean_lscs"] = "Delivery method must be 0 (Vaginal) or 1 (LSCS)"
	}

	if len(fieldErrors) > 0 {
		ValidationError(c, fieldErrors)
		return
	}

	userID, _ := c.Get("userID")
	input := models.CreateAssessmentInput{
		DurationLabourMin:       req.DurationLabourMin,
		HIVStatusNum:            req.HIVStatusNum,
		ParityNum:               req.ParityNum,
		BookedUnbooked:          req.BookedUnbooked,
		DeliveryMethodCleanLSCS: req.DeliveryMethodCleanLSCS,
	}

	assessment, err := h.assessmentService.CreateAssessment(
		c.Request.Context(),
		patientID,
		userID.(string),
		input,
	)
	if err != nil {
		log.Printf("CreateAssessment: %v", err)
		StandardError(c, http.StatusServiceUnavailable, "model_unavailable", "The prediction service is currently unavailable")
		return
	}

	// Fetch the full assessment with assessed_by_name.
	full, err := h.assessmentService.GetAssessmentByID(c.Request.Context(), assessment.ID)
	if err != nil {
		log.Printf("CreateAssessment: fetch full: %v", err)
		// Return the basic assessment without the name.
		c.JSON(http.StatusCreated, gin.H{"assessment": assessment})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"assessment": full})
}

// ListAssessments returns all assessments for a patient.
// GET /api/v1/patients/:id/assessments
func (h *AssessmentHandler) ListAssessments(c *gin.Context) {
	patientID := c.Param("id")

	assessments, err := h.assessmentService.GetPatientAssessments(c.Request.Context(), patientID)
	if err != nil {
		log.Printf("ListAssessments: %v", err)
		StandardError(c, http.StatusInternalServerError, "internal_error", "Failed to fetch assessments")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"assessments": assessments,
		"total":       len(assessments),
	})
}

// GetAssessment returns a single assessment.
// GET /api/v1/patients/:id/assessments/:assessmentID
func (h *AssessmentHandler) GetAssessment(c *gin.Context) {
	patientID := c.Param("id")
	assessmentID := c.Param("assessmentID")

	assessment, err := h.assessmentService.GetAssessmentByID(c.Request.Context(), assessmentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			StandardError(c, http.StatusNotFound, "not_found", "Assessment not found")
			return
		}
		log.Printf("GetAssessment: %v", err)
		StandardError(c, http.StatusInternalServerError, "internal_error", "Failed to fetch assessment")
		return
	}

	if assessment.PatientID != patientID {
		StandardError(c, http.StatusNotFound, "not_found", "Assessment not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{"assessment": assessment})
}
