package models

import "time"

// Role represents the access role of a user in the system.
type Role string

const (
	RoleAdmin   Role = "admin"
	RoleDoctor  Role = "doctor"
	RoleMidwife Role = "midwife"
	RoleNurse   Role = "nurse"
)

// User maps to the users table.
type User struct {
	ID                    string    `db:"id"                      json:"id"`
	ClerkUserID           *string   `db:"clerk_user_id"           json:"clerk_user_id,omitempty"`
	FullName              string    `db:"full_name"               json:"full_name"`
	Email                 string    `db:"email"                   json:"email"`
	PhoneNumber           *string   `db:"phone_number"            json:"phone_number,omitempty"`
	Role                  Role      `db:"role"                    json:"role"`
	IsActive              bool      `db:"is_active"               json:"is_active"`
	PasswordResetRequired bool      `db:"password_reset_required" json:"password_reset_required"`
	CreatedAt             time.Time `db:"created_at"              json:"created_at"`
	UpdatedAt             time.Time `db:"updated_at"              json:"updated_at"`
}

// UserResponse is the safe representation of a User for templates and API responses.
// Sensitive internal fields (e.g. PasswordResetRequired) are excluded where appropriate.
type UserResponse struct {
	ID          string    `json:"id"`
	FullName    string    `json:"full_name"`
	Email       string    `json:"email"`
	PhoneNumber *string   `json:"phone_number,omitempty"`
	Role        Role      `json:"role"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateUserInput holds the fields provided by an admin when creating a new user.
type CreateUserInput struct {
	FullName    string  `json:"full_name"              form:"full_name"`
	Email       string  `json:"email"                  form:"email"`
	PhoneNumber *string `json:"phone_number,omitempty" form:"phone_number"`
	Role        Role    `json:"role"                   form:"role"`
	Password    string  `json:"password"               form:"password"`
}
