import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';

type Step = 'request' | 'verify';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  fontSize: '0.875rem',
  color: '#1A2535',
  background: '#F4F6F8',
  border: '1px solid #DDE3EA',
  outline: 'none',
  transition: 'border 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};

const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.border = '1px solid #6B8CAE';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(107,140,174,0.15)';
};
const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.border = '1px solid #DDE3EA';
  e.currentTarget.style.boxShadow = 'none';
};

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [step, setStep]                   = useState<Step>('request');
  const [email, setEmail]                 = useState('');
  const [code, setCode]                   = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

  const Brand = () => (
    <div className="flex items-center gap-2.5 mb-7">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: '#6B8CAE' }}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
          <rect x="11" y="5" width="2" height="14" />
          <rect x="5" y="11" width="14" height="2" />
        </svg>
      </div>
      <div>
        <p className="text-base font-bold text-gray-900 leading-tight">MediFlow</p>
        <p className="text-[10px] text-gray-400 leading-tight">PPH Risk Prediction</p>
      </div>
    </div>
  );

  const ErrorBanner = () =>
    error ? (
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 text-xs"
        style={{
          background: 'rgba(220,38,38,0.07)',
          border: '1px solid rgba(220,38,38,0.18)',
          color: '#B91C1C',
        }}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    ) : null;

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #DDE3EA',
    borderRadius: '1.25rem',
    boxShadow: '0 4px 16px rgba(26,37,53,0.08)',
    padding: '2rem',
  };

  const submitBtnStyle: React.CSSProperties = {
    backgroundColor: '#6B8CAE',
    boxShadow: '0 4px 14px rgba(107,140,174,0.35)',
  };

  // ── Step 1: request reset code ────────────────────────────────────────────
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError('');
    setLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setStep('verify');
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string; message?: string }[] };
      setError(
        clerkErr?.errors?.[0]?.longMessage ??
        clerkErr?.errors?.[0]?.message ??
        'Could not send reset email. Please check the address and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify code + set new password ────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password: newPassword,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/', { replace: true });
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string; message?: string }[] };
      setError(
        clerkErr?.errors?.[0]?.longMessage ??
        clerkErr?.errors?.[0]?.message ??
        'Invalid or expired code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const Spinner = () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );

  const pageBackground: React.CSSProperties = {
    background: '#F4F6F8',
  };

  if (step === 'request') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={pageBackground}>
        <div className="w-full max-w-sm" style={cardStyle}>
          <Brand />

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
            <p className="text-sm text-gray-400 mt-1">
              Enter your work email and we'll send you a reset code.
            </p>
          </div>

          <ErrorBanner />

          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                style={inputStyle}
                placeholder="you@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="w-full flex items-center justify-center py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-55"
              style={submitBtnStyle}
            >
              {loading ? <Spinner /> : 'Send Reset Code'}
            </button>
          </form>

          <div className="text-center mt-5">
            <Link
              to="/login"
              className="text-xs font-medium hover:opacity-75 transition-opacity"
              style={{ color: '#6B8CAE' }}
            >
              ← Back to sign in
            </Link>
          </div>

          <p className="text-[11px] text-gray-400 text-center mt-4">
            Access is restricted to authorised clinical staff only.
          </p>
        </div>
      </div>
    );
  }

  // step === 'verify'
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={pageBackground}>
      <div className="w-full max-w-sm" style={cardStyle}>
        <Brand />

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="text-sm text-gray-400 mt-1">
            We sent a 6-digit code to <span className="font-medium text-gray-600">{email}</span>.
            Enter it below along with your new password.
          </p>
        </div>

        <ErrorBanner />

        <form onSubmit={handleResetPassword} className="space-y-4">
          {/* Reset code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reset code
            </label>
            <input
              type="text"
              inputMode="numeric"
              style={{ ...inputStyle, letterSpacing: '0.2em', fontWeight: 600 }}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onFocus={onFocus}
              onBlur={onBlur}
              required
              autoFocus
              maxLength={6}
            />
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                style={{ ...inputStyle, paddingRight: '44px' }}
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                required
                autoComplete="new-password"
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <EyeIcon open={showNew} />
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm new password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                style={{ ...inputStyle, paddingRight: '44px' }}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                required
                autoComplete="new-password"
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <EyeIcon open={showConfirm} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="w-full flex items-center justify-center py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-55"
            style={submitBtnStyle}
          >
            {loading ? <Spinner /> : 'Reset Password'}
          </button>
        </form>

        <div className="text-center mt-5">
          <button
            type="button"
            onClick={() => { setStep('request'); setError(''); setCode(''); }}
            className="text-xs font-medium hover:opacity-75 transition-opacity"
            style={{ color: '#6B8CAE', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Use a different email
          </button>
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-4">
          Access is restricted to authorised clinical staff only.
        </p>
      </div>
    </div>
  );
};
