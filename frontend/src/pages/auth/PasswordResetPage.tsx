import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

export const PasswordResetPage = () => {
  const navigate = useNavigate();
  const { dbUser, isLoaded, passwordResetRequired } = useAuth();
  const { success } = useNotification();
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: authApi.completePasswordReset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      success('Password updated successfully. Welcome to MediFlow!');
      navigate(dbUser?.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    },
  });

  // If password reset is not required, redirect away
  useEffect(() => {
    if (isLoaded && !passwordResetRequired && dbUser) {
      navigate(dbUser.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    }
  }, [isLoaded, passwordResetRequired, dbUser, navigate]);

  return (
    <div
      className="min-h-screen bg-base-200 flex flex-col items-center justify-center p-4"
      data-theme="mediflow"
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-primary">Medi</span>
          <span className="text-neutral">Flow</span>
        </h1>
      </div>

      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body">
          <div className="alert alert-warning mb-4">
            <span className="text-2xl">⚠</span>
            <div>
              <h3 className="font-bold">Password Reset Required</h3>
              <p className="text-sm">
                For your security, you must set a new password before
                continuing.
              </p>
            </div>
          </div>

          <p className="text-base-content/70 text-sm mb-4">
            Your account was created by an administrator. Please set a
            personal password to continue accessing MediFlow.
          </p>

          <div className="flex flex-col gap-3">
            <a
              href="https://accounts.clerk.dev/user"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary w-full"
            >
              Set New Password
            </a>

            <button
              className="btn btn-outline w-full"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                'I have updated my password — Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
