package services

import (
	"context"
	"fmt"

	"github.com/resend/resend-go/v2"
)

// ResendService handles all outbound email operations via the Resend API.
type ResendService struct {
	client    *resend.Client
	fromEmail string
}

// NewResendService creates a ResendService with the provided API key and sender address.
func NewResendService(apiKey string, fromEmail string) *ResendService {
	return &ResendService{
		client:    resend.NewClient(apiKey),
		fromEmail: fromEmail,
	}
}

// SendWelcomeEmail sends a welcome email to a newly registered clinician with their
// temporary credentials and a prompt to change their password on first login.
func (s *ResendService) SendWelcomeEmail(
	ctx context.Context,
	to string,
	fullName string,
	tempPassword string,
	role string,
) error {
	html := welcomeEmailHTML(to, fullName, tempPassword, role)

	params := &resend.SendEmailRequest{
		From:    s.fromEmail,
		To:      []string{to},
		Subject: "Welcome to MediFlow — Your Account is Ready",
		Html:    html,
	}

	_, err := s.client.Emails.SendWithContext(ctx, params)
	if err != nil {
		return fmt.Errorf("send welcome email to %s: %w", to, err)
	}
	return nil
}

// SendPasswordResetEmail sends a password reset email with a direct link to the
// Clerk-hosted reset page.
func (s *ResendService) SendPasswordResetEmail(
	ctx context.Context,
	to string,
	fullName string,
	resetURL string,
) error {
	html := passwordResetEmailHTML(fullName, resetURL)

	params := &resend.SendEmailRequest{
		From:    s.fromEmail,
		To:      []string{to},
		Subject: "MediFlow — Password Reset Request",
		Html:    html,
	}

	_, err := s.client.Emails.SendWithContext(ctx, params)
	if err != nil {
		return fmt.Errorf("send password reset email to %s: %w", to, err)
	}
	return nil
}

// ── Email HTML builders ────────────────────────────────────────────────────────

func welcomeEmailHTML(email, fullName, tempPassword, role string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#F4F6F8;font-family:Arial,sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#F4F6F8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(26,37,53,0.08);">

        <!-- Header -->
        <tr>
          <td style="background-color:#4A6D8C;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#FFFFFF;font-size:26px;font-weight:700;letter-spacing:-0.5px;">MediFlow</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.70);font-size:13px;">PPH Risk Prediction Platform</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;color:#1A2535;font-size:16px;">Hello <strong>%s</strong>,</p>
            <p style="margin:0 0 24px;color:#6B7A8D;font-size:15px;line-height:1.6;">
              You have been registered on <strong>MediFlow</strong> as a <strong>%s</strong>.
              Your account is ready and you can log in using the credentials below.
            </p>

            <!-- Credentials box -->
            <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#F4F6F8;border:1px solid #DDE3EA;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 12px;color:#6B7A8D;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Your Login Credentials</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;color:#6B7A8D;font-size:14px;width:100px;">Email:</td>
                      <td style="padding:4px 0;color:#1A2535;font-size:14px;font-weight:600;">%s</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:#6B7A8D;font-size:14px;">Password:</td>
                      <td style="padding:4px 0;font-size:14px;">
                        <code style="background-color:rgba(74,109,140,0.10);color:#4A6D8C;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:14px;font-weight:700;">%s</code>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Warning -->
            <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;margin-bottom:28px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0;color:#92400E;font-size:14px;">
                    <strong>⚠️ You will be required to change your password on first login.</strong>
                    Please do not share these credentials with anyone.
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background-color:#4A6D8C;border-radius:8px;">
                  <a href="https://mediflow.app/login"
                     style="display:inline-block;padding:14px 32px;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;">
                    Log in to MediFlow &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#6B7A8D;font-size:13px;line-height:1.5;">
              If you did not expect this email, please contact your MediFlow administrator immediately.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#F4F6F8;padding:20px 40px;border-top:1px solid #DDE3EA;text-align:center;">
            <p style="margin:0;color:#6B7A8D;font-size:12px;">
              &copy; MediFlow &mdash; For authorised healthcare professionals only
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`, fullName, role, email, tempPassword)
}

func passwordResetEmailHTML(fullName, resetURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#F4F6F8;font-family:Arial,sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#F4F6F8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(26,37,53,0.08);">

        <!-- Header -->
        <tr>
          <td style="background-color:#4A6D8C;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#FFFFFF;font-size:26px;font-weight:700;letter-spacing:-0.5px;">MediFlow</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.70);font-size:13px;">PPH Risk Prediction Platform</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;color:#1A2535;font-size:16px;">Hello <strong>%s</strong>,</p>
            <p style="margin:0 0 24px;color:#6B7A8D;font-size:15px;line-height:1.6;">
              We received a request to reset the password for your MediFlow account.
              Click the button below to choose a new password.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background-color:#4A6D8C;border-radius:8px;">
                  <a href="%s"
                     style="display:inline-block;padding:14px 32px;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;">
                    Reset My Password &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <!-- Expiry note -->
            <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;margin-bottom:28px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0;color:#92400E;font-size:14px;">
                    <strong>⏱ This link expires in 1 hour.</strong>
                    If you did not request a password reset, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#6B7A8D;font-size:13px;line-height:1.5;">
              If the button above does not work, copy and paste this URL into your browser:<br/>
              <a href="%s" style="color:#4A6D8C;word-break:break-all;font-size:12px;">%s</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#F4F6F8;padding:20px 40px;border-top:1px solid #DDE3EA;text-align:center;">
            <p style="margin:0;color:#6B7A8D;font-size:12px;">
              &copy; MediFlow &mdash; For authorised healthcare professionals only
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`, fullName, resetURL, resetURL, resetURL)
}
