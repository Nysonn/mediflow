package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"mediflow/internal/models"
)

// UserService handles all database operations for users.
type UserService struct {
	db *pgxpool.Pool
}

// NewUserService creates a UserService backed by the provided connection pool.
func NewUserService(db *pgxpool.Pool) *UserService {
	return &UserService{db: db}
}

const userSelectCols = `
	id, clerk_user_id, full_name, email, phone_number,
	role, is_active, password_reset_required, created_at, updated_at`

// scanUser scans a single pgx row into a models.User.
func scanUser(row pgx.Row) (*models.User, error) {
	var u models.User
	err := row.Scan(
		&u.ID, &u.ClerkUserID, &u.FullName, &u.Email, &u.PhoneNumber,
		&u.Role, &u.IsActive, &u.PasswordResetRequired, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// GetUserByClerkID fetches a user from our database by their Clerk user ID.
func (s *UserService) GetUserByClerkID(ctx context.Context, clerkUserID string) (*models.User, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}
	query := `
		SELECT
			id,
			clerk_user_id,
			full_name,
			email,
			phone_number,
			role,
			is_active,
			password_reset_required,
			created_at,
			updated_at
		FROM users
		WHERE clerk_user_id = $1
	`
	user := &models.User{}
	var phoneNumber *string
	var clerkID *string
	err := s.db.QueryRow(ctx, query, clerkUserID).Scan(
		&user.ID,
		&clerkID,
		&user.FullName,
		&user.Email,
		&phoneNumber,
		&user.Role,
		&user.IsActive,
		&user.PasswordResetRequired,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if clerkID != nil {
		user.ClerkUserID = clerkID
	}
	if phoneNumber != nil {
		user.PhoneNumber = phoneNumber
	}
	return user, nil
}

// GetUserByEmail fetches a user from our database by email address.
func (s *UserService) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT
			id,
			clerk_user_id,
			full_name,
			email,
			phone_number,
			role,
			is_active,
			password_reset_required,
			created_at,
			updated_at
		FROM users
		WHERE email = $1
	`
	user := &models.User{}
	var phoneNumber *string
	var clerkID *string
	err := s.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&clerkID,
		&user.FullName,
		&user.Email,
		&phoneNumber,
		&user.Role,
		&user.IsActive,
		&user.PasswordResetRequired,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if clerkID != nil {
		user.ClerkUserID = clerkID
	}
	if phoneNumber != nil {
		user.PhoneNumber = phoneNumber
	}
	return user, nil
}

// GetUserByID fetches a user from our database by UUID.
func (s *UserService) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	query := `
		SELECT
			id,
			clerk_user_id,
			full_name,
			email,
			phone_number,
			role,
			is_active,
			password_reset_required,
			created_at,
			updated_at
		FROM users
		WHERE id = $1
	`
	user := &models.User{}
	var phoneNumber *string
	var clerkID *string
	err := s.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&clerkID,
		&user.FullName,
		&user.Email,
		&phoneNumber,
		&user.Role,
		&user.IsActive,
		&user.PasswordResetRequired,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if clerkID != nil {
		user.ClerkUserID = clerkID
	}
	if phoneNumber != nil {
		user.PhoneNumber = phoneNumber
	}
	return user, nil
}

// CreateUser creates a new user record in our database and links it to the given Clerk user ID.
func (s *UserService) CreateUser(ctx context.Context, input models.CreateUserInput, clerkUserID string) (*models.User, error) {
	query := `
		INSERT INTO users (clerk_user_id, full_name, email, phone_number, role)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING` + userSelectCols

	return scanUser(s.db.QueryRow(ctx, query,
		clerkUserID, input.FullName, input.Email, input.PhoneNumber, input.Role,
	))
}

// GetAllUsers returns all users ordered by full name.
func (s *UserService) GetAllUsers(ctx context.Context) ([]models.User, error) {
	query := `SELECT` + userSelectCols + ` FROM users ORDER BY full_name ASC`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(
			&u.ID, &u.ClerkUserID, &u.FullName, &u.Email, &u.PhoneNumber,
			&u.Role, &u.IsActive, &u.PasswordResetRequired, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// UpdatePasswordResetRequired sets the password_reset_required flag for a user.
func (s *UserService) UpdatePasswordResetRequired(ctx context.Context, userID string, required bool) error {
	query := `UPDATE users SET password_reset_required = $1 WHERE id = $2`
	_, err := s.db.Exec(ctx, query, required, userID)
	if err != nil {
		return fmt.Errorf("update password_reset_required: %w", err)
	}
	return nil
}

// DeactivateUser sets is_active to false for the given user.
func (s *UserService) DeactivateUser(ctx context.Context, userID string) error {
	query := `UPDATE users SET is_active = false WHERE id = $1`
	_, err := s.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("deactivate user: %w", err)
	}
	return nil
}

// GetDashboardStats returns aggregated counts and recent patients for the dashboard.
func (s *UserService) GetDashboardStats(ctx context.Context) (*models.DashboardStats, error) {
	stats := &models.DashboardStats{}

	// User counts by role
	countQuery := `
		SELECT
			COUNT(*) FILTER (WHERE role IN ('doctor','midwife','nurse')) AS total_users,
			COUNT(*) FILTER (WHERE role = 'doctor')  AS total_doctors,
			COUNT(*) FILTER (WHERE role = 'midwife') AS total_midwives,
			COUNT(*) FILTER (WHERE role = 'nurse')   AS total_nurses
		FROM users
		WHERE is_active = true`

	if err := s.db.QueryRow(ctx, countQuery).Scan(
		&stats.TotalUsers, &stats.TotalDoctors, &stats.TotalMidwives, &stats.TotalNurses,
	); err != nil {
		return nil, fmt.Errorf("count users: %w", err)
	}

	// Patient count
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM patients`).Scan(&stats.TotalPatients); err != nil {
		return nil, fmt.Errorf("count patients: %w", err)
	}

	// Assessment counts
	assessQuery := `
		SELECT
			COUNT(*)                                          AS total_assessments,
			COUNT(*) FILTER (WHERE risk_level = 'HIGH')      AS high_risk_count,
			COUNT(*) FILTER (WHERE risk_level = 'LOW')       AS low_risk_count
		FROM assessments`

	if err := s.db.QueryRow(ctx, assessQuery).Scan(
		&stats.TotalAssessments, &stats.HighRiskCount, &stats.LowRiskCount,
	); err != nil {
		return nil, fmt.Errorf("count assessments: %w", err)
	}

	// Recent patients (last 5) with the name of the user who added them
	recentQuery := `
		SELECT
			p.id, p.patient_id_number, p.full_name, p.age, p.date_of_admission,
			p.added_by_user_id, p.created_at, p.updated_at,
			u.full_name AS added_by_name
		FROM patients p
		LEFT JOIN users u ON p.added_by_user_id = u.id
		ORDER BY p.created_at DESC
		LIMIT 5`

	rows, err := s.db.Query(ctx, recentQuery)
	if err != nil {
		return nil, fmt.Errorf("recent patients: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var pw models.PatientWithUser
		var doa time.Time
		if err := rows.Scan(
			&pw.ID, &pw.PatientIDNumber, &pw.FullName, &pw.Age, &doa,
			&pw.AddedByUserID, &pw.CreatedAt, &pw.UpdatedAt,
			&pw.AddedByName,
		); err != nil {
			return nil, fmt.Errorf("scan recent patient: %w", err)
		}
		pw.DateOfAdmission = doa
		stats.RecentPatients = append(stats.RecentPatients, pw)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recent patients: %w", err)
	}

	return stats, nil
}

// GetUsersByRole returns all users with the specified role, ordered by full name.
func (s *UserService) GetUsersByRole(ctx context.Context, role models.Role) ([]models.User, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}
	query := `SELECT` + userSelectCols + ` FROM users WHERE role = $1 ORDER BY full_name ASC`

	rows, err := s.db.Query(ctx, query, string(role))
	if err != nil {
		return nil, fmt.Errorf("query users by role: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(
			&u.ID, &u.ClerkUserID, &u.FullName, &u.Email, &u.PhoneNumber,
			&u.Role, &u.IsActive, &u.PasswordResetRequired, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// UpdateUserClerkID links a Clerk user ID to an existing database user record.
// Used when a DB user was created without a Clerk ID and needs to be linked later.
func (s *UserService) UpdateUserClerkID(ctx context.Context, userID string, clerkUserID string) error {
	if s.db == nil {
		return fmt.Errorf("database not available")
	}
	query := `UPDATE users SET clerk_user_id = $1 WHERE id = $2`
	_, err := s.db.Exec(ctx, query, clerkUserID, userID)
	if err != nil {
		return fmt.Errorf("update clerk_user_id: %w", err)
	}
	return nil
}
