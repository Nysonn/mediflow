# Clerk Setup for MediFlow

## Required Clerk Dashboard Configuration

1. Go to dashboard.clerk.com → Your MediFlow app → Configure
2. Go to **Paths** section
3. Set **Sign-in URL** to: `/login`
4. Set **After sign-in URL** to: `/`
5. Set **After sign-up URL** to: `/` (sign up is disabled)

## Disable Sign Up
1. Go to Configure → Restrictions
2. Enable **Allowlist** mode so only admin-created users can sign in
3. This prevents unauthorized self-registration

## User & Authentication Settings
1. Go to Configure → User & authentication → Email, Phone, Username
2. Ensure **Email address** is enabled as identifier
3. Ensure **Password** is enabled as authentication strategy
4. Disable **Email verification** for development (re-enable for production)
