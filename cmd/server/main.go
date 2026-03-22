package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"mediflow/internal/config"
	"mediflow/internal/database"
	"mediflow/internal/handlers"
	"mediflow/internal/middleware"
	"mediflow/internal/models"
	"mediflow/internal/services"
)

func main() {
	// Load .env file in non-production environments.
	if os.Getenv("APP_ENV") != "production" {
		if err := godotenv.Load(); err != nil {
			log.Println("No .env file found, reading from environment")
		}
	}

	cfg := config.Load()

	// ── Database ──────────────────────────────────────────────────────────────
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Printf("WARNING: database unavailable (%v) — protected routes will not work", err)
	}
	if db != nil {
		defer db.Close()
	}

	// ── Services ──────────────────────────────────────────────────────────────
	clerkService := services.NewClerkService(cfg.ClerkSecretKey)
	clerkAdminSvc := services.NewClerkAdminService(cfg.ClerkSecretKey)
	userService := services.NewUserService(db)
	resendSvc := services.NewResendService(cfg.ResendAPIKey, cfg.ResendFromEmail)
	patientService := services.NewPatientService(db)
	modelService := services.NewModelService(cfg.ModelServiceURL)
	assessmentService := services.NewAssessmentService(db, modelService)

	// ── Handlers ──────────────────────────────────────────────────────────────
	authHandler := handlers.NewAuthHandler(userService, clerkService)
	dashboardHandler := handlers.NewDashboardHandler(assessmentService, patientService)
	adminHandler := handlers.NewAdminHandler(userService, clerkAdminSvc, resendSvc)
	patientHandler := handlers.NewPatientHandler(patientService)
	assessmentHandler := handlers.NewAssessmentHandler(assessmentService, patientService)

	// ── Router ────────────────────────────────────────────────────────────────
	router := gin.Default()

	// Global middleware
	router.Use(middleware.CORS(cfg))

	// Health check (public)
	router.GET("/health", func(c *gin.Context) {
		modelHealthy := modelService.HealthCheck(c.Request.Context()) == nil
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "mediflow",
			"model_service": gin.H{
				"healthy": modelHealthy,
			},
		})
	})

	// ── API v1 routes ─────────────────────────────────────────────────────────
	api := router.Group("/api/v1")

	// Auth routes (require authentication)
	api.GET("/auth/me",
		middleware.RequireAuth(userService, clerkService),
		authHandler.GetMe,
	)
	api.POST("/auth/complete-password-reset",
		middleware.RequireAuth(userService, clerkService),
		authHandler.CompletePasswordReset,
	)

	// Protected routes (all authenticated users)
	protected := api.Group("/")
	protected.Use(middleware.RequireAuth(userService, clerkService))
	{
		// Dashboard
		protected.GET("/dashboard", dashboardHandler.GetDashboard)

		// Patients
		protected.GET("/patients", patientHandler.ListPatients)
		protected.POST("/patients", patientHandler.CreatePatient)
		protected.POST("/patients/with-assessment", assessmentHandler.CreatePatientWithAssessment)
		protected.GET("/patients/:id", patientHandler.GetPatient)
		protected.PUT("/patients/:id", patientHandler.UpdatePatient)

		// Assessments
		protected.POST("/patients/:id/assessments", assessmentHandler.CreateAssessment)
		protected.GET("/patients/:id/assessments", assessmentHandler.ListAssessments)
		protected.GET("/patients/:id/assessments/:assessmentID", assessmentHandler.GetAssessment)
		protected.PUT("/patients/:id/assessments/:assessmentID", assessmentHandler.UpdateAssessment)
	}

	// Admin-only routes
	admin := api.Group("/admin")
	admin.Use(middleware.RequireAuth(userService, clerkService))
	admin.Use(middleware.RequireRole(models.RoleAdmin))
	{
		admin.GET("/dashboard", adminHandler.GetDashboard)
		admin.GET("/users", adminHandler.ListUsers)
		admin.POST("/users", adminHandler.CreateUser)
		admin.POST("/users/:id/deactivate", adminHandler.DeactivateUser)
	}

	// 404 handler
	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "The requested resource does not exist",
		})
	})

	addr := ":" + cfg.AppPort
	log.Printf("MediFlow API starting on %s (env: %s)", addr, cfg.AppEnv)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
