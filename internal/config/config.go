package config

import "os"

// Config holds all application configuration read from environment variables.
type Config struct {
	// Application
	AppEnv  string
	AppPort string

	// Database
	DatabaseURL string

	// Clerk Authentication
	ClerkPublishableKey string
	ClerkSecretKey      string
	ClerkWebhookSecret  string

	// Resend Email
	ResendAPIKey    string
	ResendFromEmail string

	// Model Service
	ModelServiceURL string

	// Frontend (for CORS)
	FrontendURL string
}

// Load reads configuration from environment variables and returns a *Config
// with sensible defaults where applicable.
func Load() *Config {
	return &Config{
		AppEnv:              getEnv("APP_ENV", "development"),
		AppPort:             getEnv("APP_PORT", "8080"),
		DatabaseURL:         getEnv("DATABASE_URL", ""),
		ClerkPublishableKey: getEnv("CLERK_PUBLISHABLE_KEY", ""),
		ClerkSecretKey:      getEnv("CLERK_SECRET_KEY", ""),
		ClerkWebhookSecret:  getEnv("CLERK_WEBHOOK_SECRET", ""),
		ResendAPIKey:        getEnv("RESEND_API_KEY", ""),
		ResendFromEmail:     getEnv("RESEND_FROM_EMAIL", "noreply@localhost"),
		ModelServiceURL:     getEnv("MODEL_SERVICE_URL", "http://model_service:8000"),
		FrontendURL:         getEnv("FRONTEND_URL", "http://localhost:5173"),
	}
}

// getEnv returns the value of the environment variable named by key,
// or fallback if the variable is not set or empty.
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
