package services

import (
	"context"
	"fmt"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkuser "github.com/clerk/clerk-sdk-go/v2/user"
)

// ClerkAdminService handles admin-level operations against the Clerk API,
// such as creating and managing user accounts.
type ClerkAdminService struct {
	secretKey string
}

// NewClerkAdminService creates a ClerkAdminService and sets the global Clerk API key.
func NewClerkAdminService(secretKey string) *ClerkAdminService {
	clerk.SetKey(secretKey)
	return &ClerkAdminService{secretKey: secretKey}
}

// CreateClerkUser creates a new user in Clerk with the given email and password,
// returning the Clerk-assigned user ID.
func (s *ClerkAdminService) CreateClerkUser(
	ctx context.Context,
	email string,
	password string,
	firstName string,
	lastName string,
) (clerkUserID string, err error) {
	emails := []string{email}
	params := &clerkuser.CreateParams{
		EmailAddresses: &emails,
		Password:       clerk.String(password),
		FirstName:      clerk.String(firstName),
		LastName:       clerk.String(lastName),
	}

	u, err := clerkuser.Create(ctx, params)
	if err != nil {
		return "", fmt.Errorf("create clerk user for %s: %w", email, err)
	}

	return u.ID, nil
}

// DeleteClerkUser removes a user from Clerk by their Clerk user ID.
// Used to roll back a Clerk user creation if the subsequent DB insert fails.
func (s *ClerkAdminService) DeleteClerkUser(ctx context.Context, clerkUserID string) error {
	_, err := clerkuser.Delete(ctx, clerkUserID)
	if err != nil {
		return fmt.Errorf("delete clerk user %s: %w", clerkUserID, err)
	}
	return nil
}
