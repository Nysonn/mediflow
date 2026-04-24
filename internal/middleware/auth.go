package middleware

import (
	"fmt"
	"log"
	"strings"

	"mediflow/internal/models"
	"mediflow/internal/services"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/gin-gonic/gin"
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
func RequireAuth(userService *services.UserService, clerkService *services.ClerkService, appEnv string) gin.HandlerFunc {
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
			if appEnv != "production" {
				user, err = linkDevelopmentUserByEmail(c, userService, clerkService, clerkUserID)
				if err == nil {
					log.Printf("RequireAuth: linked development user by email for clerk_user_id=%s user_id=%s", clerkUserID, user.ID)
				} else {
					log.Printf("RequireAuth: development relink failed for clerk_user_id=%s: %v", clerkUserID, err)
				}
			}
		}

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

func linkDevelopmentUserByEmail(
	c *gin.Context,
	userService *services.UserService,
	clerkService *services.ClerkService,
	clerkUserID string,
) (*models.User, error) {
	clerkUser, err := clerkService.GetClerkUser(c.Request.Context(), clerkUserID)
	if err != nil {
		return nil, fmt.Errorf("fetch clerk user: %w", err)
	}

	email, err := getVerifiedPrimaryEmail(clerkUser)
	if err != nil {
		return nil, err
	}

	user, err := userService.GetUserByEmail(c.Request.Context(), email)
	if err != nil {
		return nil, fmt.Errorf("find local user by email %s: %w", email, err)
	}

	if err := userService.UpdateUserClerkID(c.Request.Context(), user.ID, clerkUserID); err != nil {
		return nil, fmt.Errorf("link local user %s to clerk user %s: %w", user.ID, clerkUserID, err)
	}

	user.ClerkUserID = &clerkUserID
	return user, nil
}

func getVerifiedPrimaryEmail(clerkUser *clerk.User) (string, error) {
	if clerkUser == nil {
		return "", fmt.Errorf("clerk user is nil")
	}

	for _, email := range clerkUser.EmailAddresses {
		if email == nil || email.Verification == nil || email.Verification.Status != "verified" {
			continue
		}
		if clerkUser.PrimaryEmailAddressID != nil && email.ID == *clerkUser.PrimaryEmailAddressID {
			return email.EmailAddress, nil
		}
	}

	for _, email := range clerkUser.EmailAddresses {
		if email == nil || email.Verification == nil || email.Verification.Status != "verified" {
			continue
		}
		return email.EmailAddress, nil
	}

	return "", fmt.Errorf("no verified email address available for clerk user %s", clerkUser.ID)
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
