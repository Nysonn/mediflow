package middleware

import (
	"time"

	"mediflow/internal/config"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS returns a middleware that allows cross-origin requests from the configured frontend origins.
func CORS(cfg *config.Config) gin.HandlerFunc {
	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:5174",
		"https://mediflow-3bbc3.web.app",
		"https://mediflow.me",
		"https://www.mediflow.me",
	}
	// Add the configured FRONTEND_URL if it's not already in the list.
	if cfg.FrontendURL != "" {
		exists := false
		for _, o := range allowedOrigins {
			if o == cfg.FrontendURL {
				exists = true
				break
			}
		}
		if !exists {
			allowedOrigins = append(allowedOrigins, cfg.FrontendURL)
		}
	}

	corsConfig := cors.Config{
		AllowOrigins: allowedOrigins,
		AllowMethods: []string{
			"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Accept",
			"Authorization",
			"X-Requested-With",
		},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	return cors.New(corsConfig)
}
