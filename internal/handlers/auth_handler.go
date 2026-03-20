package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"mediflow/internal/models"
	"mediflow/internal/services"
)

// AuthHandler handles authentication-related API routes.
type AuthHandler struct {
	userService  *services.UserService
	clerkService *services.ClerkService
}

// NewAuthHandler creates an AuthHandler with the provided dependencies.
func NewAuthHandler(
	userService *services.UserService,
	clerkService *services.ClerkService,
) *AuthHandler {
	return &AuthHandler{
		userService:  userService,
		clerkService: clerkService,
	}
}

// GetMe returns the authenticated user's profile.
// GET /api/v1/auth/me
func (h *AuthHandler) GetMe(c *gin.Context) {
	rawUser, exists := c.Get("user")
	if !exists {
		StandardError(c, http.StatusUnauthorized, "unauthorized", "Not authenticated")
		return
	}

	user, ok := rawUser.(*models.User)
	if !ok {
		StandardError(c, http.StatusInternalServerError, "internal_error", "Invalid user context")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                      user.ID,
		"clerk_user_id":           user.ClerkUserID,
		"full_name":               user.FullName,
		"email":                   user.Email,
		"phone_number":            user.PhoneNumber,
		"role":                    user.Role,
		"is_active":               user.IsActive,
		"password_reset_required": user.PasswordResetRequired,
		"created_at":              user.CreatedAt,
	})
}

// CompletePasswordReset marks password_reset_required = false for the current user.
// POST /api/v1/auth/complete-password-reset
func (h *AuthHandler) CompletePasswordReset(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		StandardError(c, http.StatusUnauthorized, "unauthorized", "Not authenticated")
		return
	}

	if err := h.userService.UpdatePasswordResetRequired(c.Request.Context(), userID.(string), false); err != nil {
		log.Printf("CompletePasswordReset: failed to update user %s: %v", userID, err)
		StandardError(c, http.StatusInternalServerError, "internal_error", "Failed to complete password reset")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset completed successfully"})
}
