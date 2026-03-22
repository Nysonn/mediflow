import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';

export const PasswordResetPage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { dbUser, isLoaded, passwordResetRequired } = useAuth();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [error, setError]                     = useState('');
  const [loading, setLoading]                 = useState(false);

  // If password reset is not required, redirect away
  useEffect(() => {
    if (isLoaded && !passwordResetRequired && dbUser) {
      navigate(dbUser.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    }
  }, [isLoaded, passwordResetRequired, dbUser, navigate]);

  const completeMutation = useMutation({
    mutationFn: authApi.completePasswordReset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate(dbUser?.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!user) {
      setError('Session error — please refresh and try again.');
      return;
    }

    setLoading(true);
    try {
      await user.updatePassword({ currentPassword, newPassword });
      await completeMutation.mutateAsync();
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string; message?: string }[] };
      setError(
        clerkErr?.errors?.[0]?.longMessage ??
        clerkErr?.errors?.[0]?.message ??
        'Failed to update password. Please check your temporary password and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    paddingRight: '44px',
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
    e.currentTarget.style.border = '1px solid #4A6D8C';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74,109,140,0.15)';
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: '#F4F6F8',
      }}
    >
      <div
        className="w-full max-w-sm"
        style={{
          background: '#ffffff',
          border: '1px solid #DDE3EA',
          borderRadius: '1.25rem',
          boxShadow: '0 4px 16px rgba(26,37,53,0.08)',
          padding: '2rem',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-7">
          <img src="/logo.png" alt="MediFlow" className="w-9 h-9 object-contain flex-shrink-0" />
          <div>
            <p className="text-base font-bold text-gray-900 leading-tight">MediFlow</p>
            <p className="text-[10px] text-gray-400 leading-tight">PPH Risk Prediction</p>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Set your password</h1>
          <p className="text-sm text-gray-400 mt-1">
            Your account was created by an admin. Create a personal password to continue.
          </p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Temporary password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Temporary password <span className="text-gray-400 font-normal">(from your email)</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                style={inputStyle}
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                required
                autoComplete="current-password"
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <EyeIcon open={showCurrent} />
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                style={inputStyle}
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
                style={inputStyle}
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
            disabled={loading}
            className="w-full flex items-center justify-center py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-55 mt-1"
            style={{
              backgroundColor: '#4A6D8C',
              boxShadow: '0 4px 14px rgba(74,109,140,0.35)',
            }}
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : 'Set Password & Continue'}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-6">
          Access is restricted to authorised clinical staff only.
        </p>
      </div>
    </div>
  );
};
