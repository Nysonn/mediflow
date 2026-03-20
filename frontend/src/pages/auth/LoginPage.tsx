import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { useAuth } from '../../hooks/useAuth';

export const LoginPage = () => {
  const { isSignedIn, isLoaded, isAdmin } = useAuth();
  const { signIn, setActive, isLoaded: clerkLoaded } = useSignIn();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  if (isLoaded && isSignedIn) {
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clerkLoaded || !signIn) return;
    setError('');
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/');
      } else {
        setError('Sign-in incomplete. Please try again.');
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string; message?: string }[] };
      setError(
        clerkErr?.errors?.[0]?.longMessage ??
        clerkErr?.errors?.[0]?.message ??
        'Invalid email or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '0.875rem',
    color: '#1e293b',
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    outline: 'none',
    transition: 'border 0.15s, box-shadow 0.15s',
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid #6366f1';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid #E2E8F0';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #ede9fe 100%)',
      }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm"
        style={{
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.80)',
          borderRadius: '1.25rem',
          boxShadow: '0 16px 48px rgba(99,102,241,0.14), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '2rem',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-7">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #4338CA)' }}
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

        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to your account to continue</p>
        </div>

        {/* Error */}
        {error && (
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
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
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
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <a
                href="mailto:admin@mediflow.local?subject=Password%20Reset%20Request"
                className="text-xs font-medium hover:opacity-75 transition-opacity"
                style={{ color: '#4338CA' }}
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                style={{ ...inputStyle, paddingRight: '40px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPw ? (
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
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !clerkLoaded}
            className="w-full flex items-center justify-center py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-55 mt-1"
            style={{
              background: 'linear-gradient(135deg, #1D4ED8 0%, #4338CA 100%)',
              boxShadow: '0 4px 14px rgba(67,56,202,0.35)',
            }}
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-[11px] text-gray-400 text-center mt-6">
          Access is restricted to authorised clinical staff only.
        </p>
      </div>
    </div>
  );
};
