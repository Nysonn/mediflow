import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { useAuth } from '../../hooks/useAuth';

export const LoginPage = () => {
  const { isSignedIn, isLoaded, isAdmin, passwordResetRequired } = useAuth();
  const { signIn, setActive, isLoaded: clerkLoaded } = useSignIn();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  if (isLoaded && isSignedIn) {
    if (passwordResetRequired) return <Navigate to="/password-reset" replace />;
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
    color: '#1A2535',
    background: '#F4F6F8',
    border: '1px solid #DDE3EA',
    outline: 'none',
    transition: 'border 0.15s, box-shadow 0.15s',
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid #4A6D8C';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74,109,140,0.15)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid #DDE3EA';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: '#4A6D8C' }}
      >
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(74,109,140,0.25) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="MediFlow" className="w-10 h-10 object-contain flex-shrink-0" />
          <p className="text-lg font-bold">
            <span style={{ color: '#A8C4DC' }}>Medi</span>
            <span style={{ color: '#ffffff' }}>Flow</span>
          </p>
        </div>

        {/* Hero text */}
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight mb-4">
            <span style={{ color: '#A8C4DC' }}>Medi</span>
            <span style={{ color: '#ffffff' }}>Flow</span>
          </h2>
          <p className="text-xl font-semibold mb-3" style={{ color: '#ffffff' }}>
            PPH Risk Prediction Platform
          </p>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Supporting clinical teams with evidence-based postpartum hemorrhage risk assessment to improve maternal outcomes.
          </p>
        </div>

        {/* Footer note */}
        <p className="relative text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Authorised clinical staff only
        </p>
      </div>

      {/* ── Right Panel ── */}
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ backgroundColor: '#F4F6F8' }}
      >
        <div
          className="w-full max-w-sm"
          style={{
            background: '#ffffff',
            borderRadius: '1.25rem',
            border: '1px solid #DDE3EA',
            boxShadow: '0 4px 16px rgba(26,37,53,0.08)',
            padding: '2rem',
          }}
        >
          {/* Mobile brand */}
          <div className="flex lg:hidden items-center gap-2.5 mb-7">
            <img src="/logo.png" alt="MediFlow" className="w-9 h-9 object-contain flex-shrink-0" />
            <div>
              <p className="text-base font-bold leading-tight">
                <span style={{ color: '#4A6D8C' }}>Medi</span>
                <span style={{ color: '#1A2535' }}>Flow</span>
              </p>
              <p className="text-[10px] leading-tight" style={{ color: '#6B7A8D' }}>PPH Risk Prediction</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold" style={{ color: '#1A2535' }}>Welcome Back</h1>
            <p className="text-sm mt-1" style={{ color: '#6B7A8D' }}>Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 text-xs"
              style={{
                background: 'rgba(192,57,43,0.07)',
                border: '1px solid rgba(192,57,43,0.20)',
                color: '#922B21',
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
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#1A2535' }}>
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium" style={{ color: '#1A2535' }}>Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium hover:opacity-75 transition-opacity"
                  style={{ color: '#4A6D8C' }}
                >
                  Forgot password?
                </Link>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#6B7A8D' }}
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

            <button
              type="submit"
              disabled={loading || !clerkLoaded}
              className="w-full flex items-center justify-center py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-55 mt-1"
              style={{
                backgroundColor: '#4A6D8C',
                boxShadow: '0 4px 12px rgba(74,109,140,0.35)',
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

          <p className="text-[11px] text-center mt-6" style={{ color: '#6B7A8D' }}>
            Access is restricted to authorised clinical staff only.
          </p>
        </div>
      </div>
    </div>
  );
};
