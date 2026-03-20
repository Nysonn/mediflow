package handlers

import (
	"errors"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"mediflow/internal/models"
	"mediflow/internal/services"
)

// PatientHandler handles all patient-related routes.
type PatientHandler struct {
	patientService *services.PatientService
}

// NewPatientHandler creates a PatientHandler.
func NewPatientHandler(patientService *services.PatientService) *PatientHandler {
	return &PatientHandler{patientService: patientService}
}

var validPatientID = regexp.MustCompile(`^[A-Za-z0-9\-]+$`)

// ListPatients returns a paginated list of patients.
// GET /api/v1/patients?search=&page=1&page_size=15
func (h *PatientHandler) ListPatients(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))

	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}

	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if pageSize < 1 {
		pageSize = 15
	}

	patients, total, err := h.patientService.GetAllPatients(c.Request.Context(), search, page, pageSize)
	if err != nil {
		log.Printf("ListPatients: %v", err)
		StandardError(c, http.StatusInternalServerError, "internal_error", "Failed to fetch patients")
		return
	}

	totalPages := (total + pageSize - 1) / pageSize
	if totalPages < 1 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"patients":    patients,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": totalPages,
	})
}

// createPatientRequest is the JSON body for POST /api/v1/patients.
type createPatientRequest struct {
	PatientIDNumber string `json:"patient_id_number"`
	FullName        string `json:"full_name"`
	Age             int    `json:"age"`
	DateOfAdmission string `json:"date_of_admission"` // "YYYY-MM-DD"
}

// CreatePatient registers a new patient.
// POST /api/v1/patients
func (h *PatientHandler) CreatePatient(c *gin.Context) {
	var req createPatientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		StandardError(c, http.StatusBadRequest, "bad_request", "Invalid JSON body")
		return
	}

	req.PatientIDNumber = strings.TrimSpace(req.PatientIDNumber)
	req.FullName = strings.TrimSpace(req.FullName)

	fieldErrors := map[string]string{}

	if req.PatientIDNumber == "" {
		fieldErrors["patient_id_number"] = "Patient ID number is required"
	} else if !validPatientID.MatchString(req.PatientIDNumber) {
		fieldErrors["patient_id_number"] = "Only letters, numbers, and hyphens are allowed"
	}

	if req.FullName == "" {
		fieldErrors["full_name"] = "Full name is required"
	} else if len(req.FullName) < 2 {
		fieldErrors["full_name"] = "Full name must be at least 2 characters"
	}

	if req.Age == 0 {
		fieldErrors["age"] = "Age is required"
	} else if req.Age < 10 || req.Age > 60 {
		fieldErrors["age"] = "Age must be between 10 and 60"
	}

	var doa time.Time
	if req.DateOfAdmission == "" {
		fieldErrors["date_of_admission"] = "Date of admission is required"
	} else {
		var parseErr error
		doa, parseErr = time.Parse("2006-01-02", req.DateOfAdmission)
		if parseErr != nil {
			fieldErrors["date_of_admission"] = "Invalid date format, expected YYYY-MM-DD"
		} else if doa.After(time.Now()) {
			fieldErrors["date_of_admission"] = "Date of admission cannot be in the future"
		}
	}

	if len(fieldErrors) > 0 {
		ValidationError(c, fieldErrors)
		return
	}

	userID, _ := c.Get("userID")
	input := models.CreatePatientInput{
		PatientIDNumber: req.PatientIDNumber,
		FullName:        req.FullName,
		Age:             req.Age,
		DateOfAdmission: doa,
	}

	patient, err := h.patientService.CreatePatient(c.Request.Context(), input, userID.(string))
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			ValidationError(c, map[string]string{"patient_id_number": "A patient with this ID number already exists"})
			return
		}
		log.Printf("CreatePatient: %v", err)
		StandardError(c, http.StatusInternalServerError, "internal_error", "Failed to save patient record")
		return
	}

	c.JSON(http.StatusCreated, patient)
}

// GetPatient returns a single patient with their assessment history.
// GET /api/v1/patients/:id
func (h *PatientHandler) GetPatient(c *gin.Context) {
	id := c.Param("id")

	patient, assessments, err := h.patientService.GetPatientWithAssessments(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			StandardError(c, http.StatusNotFound, "not_found", "Patient not found")
			return
		}
		log.Printf("GetPatient: %v", err)
		StandardError(c, http.StatusInternalServerError, "internal_error", "Failed to fetch patient")
		return
	}

	latestRisk := ""
	if len(assessments) > 0 {
		latestRisk = assessments[0].RiskLevel
	}

	c.JSON(http.StatusOK, gin.H{
		"patient":     patient,
		"assessments": assessments,
		"latest_risk": latestRisk,
	})
}

// updatePatientRequest is the JSON body for PUT /api/v1/patients/:id.
type updatePatientRequest struct {
	PatientIDNumber string `json:"patient_id_number"`
	FullName        string `json:"full_name"`
	Age             int    `json:"age"`
	DateOfAdmission string `json:"date_of_admission"` // "YYYY-MM-DD"
}

// UpdatePatient updates a patient record.
// PUT /api/v1/patients/:id
func (h *PatientHandler) UpdatePatient(c *gin.Context) {
	id := c.Param("id")

	var req updatePatientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		StandardError(c, http.StatusBadRequest, "bad_request", "Invalid JSON body")
		return
	}

	req.PatientIDNumber = strings.TrimSpace(req.PatientIDNumber)
	req.FullName = strings.TrimSpace(req.FullName)

	fieldErrors := map[string]string{}

	if req.PatientIDNumber == "" {
		fieldErrors["patient_id_number"] = "Patient ID number is required"
	} else if !validPatientID.MatchString(req.PatientIDNumber) {
		fieldErrors["patient_id_number"] = "Only letters, numbers, and hyphens are allowed"
	}

	if req.FullName == "" {
		fieldErrors["full_name"] = "Full name is required"
	} else if len(req.FullName) < 2 {
		fieldErrors["full_name"] = "Full name must be at least 2 characters"
	}

	if req.Age == 0 {
		fieldErrors["age"] = "Age is required"
	} else if req.Age < 10 || req.Age > 60 {
		fieldErrors["age"] = "Age must be between 10 and 60"
	}

	var doa time.Time
	if req.DateOfAdmission == "" {
		fieldErrors["date_of_admission"] = "Date of admission is required"
	} else {
		var parseErr error
		doa, parseErr = time.Parse("2006-01-02", req.DateOfAdmission)
		if parseErr != nil {
			fieldErrors["date_of_admission"] = "Invalid date format, expected YYYY-MM-DD"
		} else if doa.After(time.Now()) {
			fieldErrors["date_of_admission"] = "Date of admission cannot be in the future"
		}
	}

	if len(fieldErrors) > 0 {
		ValidationError(c, fieldErrors)
		return
	}

	input := models.UpdatePatientInput{
		PatientIDNumber: &req.PatientIDNumber,
		FullName:        &req.FullName,
		Age:             &req.Age,
		DateOfAdmission: &doa,
	}

	patient, err := h.patientService.UpdatePatient(c.Request.Context(), id, input)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			ValidationError(c, map[string]string{"patient_id_number": "A patient with this ID number already exists"})
			return
		}
		if errors.Is(err, pgx.ErrNoRows) {
			StandardError(c, http.StatusNotFound, "not_found", "Patient not found")
			return
		}
		log.Printf("UpdatePatient: %v", err)
		StandardError(c, http.StatusInternalServerError, "internal_error", "Failed to update patient record")
		return
	}

	c.JSON(http.StatusOK, patient)
}
