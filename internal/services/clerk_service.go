package services

import (
	"context"
	"fmt"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkjwt "github.com/clerk/clerk-sdk-go/v2/jwt"
	clerkuser "github.com/clerk/clerk-sdk-go/v2/user"
)

// ClerkService handles all Clerk-related operations.
type ClerkService struct {
	secretKey string
}

// NewClerkService initialises a ClerkService and sets the global Clerk API key.
func NewClerkService(secretKey string) *ClerkService {
	clerk.SetKey(secretKey)
	return &ClerkService{secretKey: secretKey}
}

// VerifyToken verifies a Clerk session JWT and returns the Clerk user ID (the "sub" claim).
func (s *ClerkService) VerifyToken(ctx context.Context, sessionToken string) (string, error) {
	if sessionToken == "" {
		return "", fmt.Errorf("empty session token")
	}
	claims, err := clerkjwt.Verify(ctx, &clerkjwt.VerifyParams{
		Token: sessionToken,
	})
	if err != nil {
		return "", fmt.Errorf("token verification failed: %w", err)
	}
	return claims.Subject, nil
}

// GetClerkUser fetches a user's details from the Clerk API by their Clerk user ID.
func (s *ClerkService) GetClerkUser(ctx context.Context, clerkUserID string) (*clerk.User, error) {
	u, err := clerkuser.Get(ctx, clerkUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch clerk user %s: %w", clerkUserID, err)
	}
	return u, nil
}
