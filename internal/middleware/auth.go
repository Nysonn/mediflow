package middleware

import (
	"log"
	"strings"

	"github.com/gin-gonic/gin"
	"mediflow/internal/models"
	"mediflow/internal/services"
)

const (
	ctxUserID      = "userID"
	ctxClerkUserID = "clerkUserID"
	ctxUserRole    = "userRole"
	ctxUserName    = "userName"
	ctxUser        = "user"
)

// RequireAuth verifies the Bearer token from the Authorization header, looks up the user
// in our database, and attaches user data to the Gin context for downstream handlers.
func RequireAuth(userService *services.UserService, clerkService *services.ClerkService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(401, gin.H{
				"error":   "unauthorized",
				"message": "Authorization header required",
			})
			c.Abort()
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")

		clerkUserID, err := clerkService.VerifyToken(c.Request.Context(), token)
		if err != nil {
			log.Printf("RequireAuth: token verification failed: %v", err)
			c.JSON(401, gin.H{
				"error":   "unauthorized",
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		user, err := userService.GetUserByClerkID(c.Request.Context(), clerkUserID)
		if err != nil {
			log.Printf("RequireAuth: user not found for clerk_user_id=%s: %v", clerkUserID, err)
			c.JSON(401, gin.H{
				"error":   "unauthorized",
				"message": "User not found",
			})
			c.Abort()
			return
		}

		if !user.IsActive {
			log.Printf("RequireAuth: inactive user id=%s", user.ID)
			c.JSON(403, gin.H{
				"error":   "forbidden",
				"message": "Account is deactivated",
			})
			c.Abort()
			return
		}

		c.Set(ctxUserID, user.ID)
		c.Set(ctxClerkUserID, clerkUserID)
		c.Set(ctxUserRole, string(user.Role))
		c.Set(ctxUserName, user.FullName)
		c.Set(ctxUser, user)

		c.Next()
	}
}

// RequireRole returns a middleware that allows only users with one of the specified roles.
func RequireRole(roles ...models.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole := c.GetString("userRole")
		for _, role := range roles {
			if string(role) == userRole {
				c.Next()
				return
			}
		}
		c.JSON(403, gin.H{
			"error":   "forbidden",
			"message": "You do not have permission to access this resource",
		})
		c.Abort()
	}
}

// GetInitials returns up to 2 uppercase initials from a full name.
// "John Doe" → "JD", "Madonna" → "M"
func GetInitials(fullName string) string {
	parts := strings.Fields(fullName)
	if len(parts) == 0 {
		return "?"
	}
	first := []rune(parts[0])
	if len(parts) == 1 {
		return strings.ToUpper(string(first[:1]))
	}
	last := []rune(parts[len(parts)-1])
	return strings.ToUpper(string(first[:1]) + string(last[:1]))
}
