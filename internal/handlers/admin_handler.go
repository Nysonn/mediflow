package handlers

import (
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"mediflow/internal/models"
	"mediflow/internal/services"
)

// AdminHandler handles all admin-facing routes.
type AdminHandler struct {
	userService   *services.UserService
	clerkAdminSvc *services.ClerkAdminService
	resendSvc     *services.ResendService
}

// NewAdminHandler creates an AdminHandler with the required service dependencies.
func NewAdminHandler(
	userService *services.UserService,
	clerkAdminSvc *services.ClerkAdminService,
	resendSvc *services.ResendService,
) *AdminHandler {
	return &AdminHandler{
		userService:   userService,
		clerkAdminSvc: clerkAdminSvc,
		resendSvc:     resendSvc,
	}
}

var validEmail = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// GetDashboard returns system-wide statistics.
// GET /api/v1/admin/dashboard
func (h *AdminHandler) GetDashboard(c *gin.Context) {
	stats, err := h.userService.GetDashboardStats(c.Request.Context())
	if err != nil {
		log.Printf("AdminHandler.GetDashboard: %v", err)
		stats = &models.DashboardStats{}
	}
	c.JSON(http.StatusOK, stats)
}

// ListUsers returns all clinician accounts, optionally filtered by role.
// GET /api/v1/admin/users?role=doctor
func (h *AdminHandler) ListUsers(c *gin.Context) {
	allUsers, err := h.userService.GetAllUsers(c.Request.Context())
	if err != nil {
		log.Printf("AdminHandler.ListUsers: %v", err)
		StandardError(c, http.StatusInternalServerError, "internal_error", "Failed to fetch users")
		return
	}

	roleFilter := strings.TrimSpace(c.Query("role"))

	clinicians := make([]models.User, 0, len(allUsers))
	for _, u := range allUsers {
		if u.Role == models.RoleAdmin {
			continue
		}
		if roleFilter != "" && string(u.Role) != roleFilter {
			continue
		}
		clinicians = append(clinicians, u)
	}

	c.JSON(http.StatusOK, gin.H{
		"users": clinicians,
		"total": len(clinicians),
	})
}

// createUserRequest is the JSON body for POST /api/v1/admin/users.
type createUserRequest struct {
	FullName    string `json:"full_name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Role        string `json:"role"`
	Password    string `json:"password"`
}

// CreateUser registers a new clinician account.
// POST /api/v1/admin/users
func (h *AdminHandler) CreateUser(c *gin.Context) {
	var req createUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		StandardError(c, http.StatusBadRequest, "bad_request", "Invalid JSON body")
		return
	}

	req.FullName = strings.TrimSpace(req.FullName)
	req.Email = strings.TrimSpace(req.Email)
	req.PhoneNumber = strings.TrimSpace(req.PhoneNumber)
	req.Role = strings.TrimSpace(req.Role)

	// Validate fields.
	fieldErrors := map[string]string{}

	if req.FullName == "" {
		fieldErrors["full_name"] = "Full name is required"
	}

	if req.Email == "" {
		fieldErrors["email"] = "Email is required"
	} else if !validEmail.MatchString(req.Email) {
		fieldErrors["email"] = "Invalid email format"
	}

	role := models.Role(req.Role)
	if req.Role == "" {
		fieldErrors["role"] = "Role is required"
	} else if role != models.RoleDoctor && role != models.RoleMidwife && role != models.RoleNurse {
		fieldErrors["role"] = "Invalid role — must be doctor, midwife, or nurse"
	}

	if req.Password == "" {
		fieldErrors["password"] = "Password is required"
	} else if len(req.Password) < 8 {
		fieldErrors["password"] = "Password must be at least 8 characters"
	}

	if len(fieldErrors) > 0 {
		ValidationError(c, fieldErrors)
		return
	}

	// Check for duplicate email.
	if existing, _ := h.userService.GetUserByEmail(c.Request.Context(), req.Email); existing != nil {
		ValidationError(c, map[string]string{"email": "Email already exists"})
		return
	}

	firstName, lastName := splitFullName(req.FullName)

	clerkUserID, err := h.clerkAdminSvc.CreateClerkUser(
		c.Request.Context(), req.Email, req.Password, firstName, lastName,
	)
	if err != nil {
		log.Printf("AdminHandler.CreateUser: clerk create: %v", err)
		StandardError(c, http.StatusInternalServerError, "internal_error", "Failed to create Clerk account")
		return
	}

	var phonePtr *string
	if req.PhoneNumber != "" {
		phonePtr = &req.PhoneNumber
	}

	input := models.CreateUserInput{
		FullName:    req.FullName,
		Email:       req.Email,
		PhoneNumber: phonePtr,
		Role:        role,
		Password:    req.Password,
	}

	user, err := h.userService.CreateUser(c.Request.Context(), input, clerkUserID)
	if err != nil {
		log.Printf("AdminHandler.CreateUser: db create (clerk_id=%s): %v", clerkUserID, err)
		if delErr := h.clerkAdminSvc.DeleteClerkUser(c.Request.Context(), clerkUserID); delErr != nil {
			log.Printf("AdminHandler.CreateUser: rollback clerk delete failed: %v", delErr)
		}
		StandardError(c, http.StatusInternalServerError, "internal_error", "Failed to save user record")
		return
	}

	// Send welcome email — non-fatal.
	if err := h.resendSvc.SendWelcomeEmail(
		c.Request.Context(), req.Email, req.FullName, req.Password, string(role),
	); err != nil {
		log.Printf("AdminHandler.CreateUser: welcome email to %s: %v", req.Email, err)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user":    user,
	})
}

// DeactivateUser sets is_active=false for the given clinician.
// POST /api/v1/admin/users/:id/deactivate
func (h *AdminHandler) DeactivateUser(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		StandardError(c, http.StatusBadRequest, "bad_request", "Invalid user ID")
		return
	}

	callerID, _ := c.Get("userID")
	if callerID == userID {
		StandardError(c, http.StatusBadRequest, "bad_request", "You cannot deactivate your own account")
		return
	}

	if err := h.userService.DeactivateUser(c.Request.Context(), userID); err != nil {
		log.Printf("AdminHandler.DeactivateUser: %v", err)
		StandardError(c, http.StatusInternalServerError, "internal_error", "Failed to deactivate user")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User deactivated successfully",
		"user_id": userID,
	})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// splitFullName splits "First Last Name" into (firstName, lastName).
func splitFullName(fullName string) (firstName, lastName string) {
	parts := strings.SplitN(strings.TrimSpace(fullName), " ", 2)
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], parts[1]
}
