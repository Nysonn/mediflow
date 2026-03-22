package handlers

import (
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

var uuidRegex = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// isValidUUID returns true if s is a well-formed UUID.
func isValidUUID(s string) bool {
	return uuidRegex.MatchString(s)
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

// StandardError returns a consistent JSON error response.
func StandardError(c *gin.Context, status int, errCode string, message string) {
	c.JSON(status, gin.H{
		"error":   errCode,
		"message": message,
	})
}

// ValidationError returns a 422 with field-level errors.
func ValidationError(c *gin.Context, fields map[string]string) {
	c.JSON(422, gin.H{
		"error":  "validation_error",
		"fields": fields,
	})
}
