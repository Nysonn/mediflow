import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { adminApi } from '../../api/admin';
import { RoleBadge } from '../../components/common/RoleBadge';
import { SkeletonRow } from '../../components/common/SkeletonRow';
import { EmptyState } from '../../components/common/EmptyState';
import { getInitials } from '../../utils/formatters';
import { RegisterClinicianModal } from '../../components/forms/RegisterClinicianModal';
import type { User } from '../../types';

type TabFilter = 'all' | 'doctor' | 'midwife' | 'nurse';

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Doctors', value: 'doctor' },
  { label: 'Midwives', value: 'midwife' },
  { label: 'Nurses', value: 'nurse' },
];

const AVATAR_COLORS = [
  '#6B8CAE', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#9333EA',
];

const getAvatarColor = (name: string): string =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const glassCard = {
  background: '#ffffff',
  border: '1px solid #DDE3EA',
  boxShadow: '0 1px 3px rgba(26,37,53,0.08)',
};

const StatusBadge = ({ user }: { user: User }) => {
  if (!user.is_active)
    return (
      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
        Deactivated
      </span>
    );
  if (user.password_reset_required)
    return (
      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
        Pending Reset
      </span>
    );
  return (
    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      Active
    </span>
  );
};

export const UsersPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabFilter>('all');
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    dispatch(setPageTitle('Clinician Management'));
  }, [dispatch]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', tab],
    queryFn: () => adminApi.getUsers(tab === 'all' ? undefined : tab),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminApi.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      setConfirmUser(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A2535' }}>Clinician Management</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B7A8D' }}>Manage system clinicians and their access</p>
        </div>
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#6B8CAE' }}
          onClick={() => setRegisterOpen(true)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Register Clinician
        </button>
      </div>

      {/* Tab Filter */}
      <div
        className="flex gap-1 w-fit rounded-xl p-1"
        style={{
          background: '#ffffff',
          border: '1px solid #DDE3EA',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={
              tab === t.value
                ? { backgroundColor: '#6B8CAE', color: '#fff' }
                : { color: '#6B7A8D' }
            }
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="rounded-2xl overflow-hidden p-0" style={glassCard}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F4F6F8' }}>
                <th className="table-header-cell text-left">Name</th>
                <th className="table-header-cell text-left">Phone</th>
                <th className="table-header-cell text-left">Role</th>
                <th className="table-header-cell text-left">Status</th>
                <th className="table-header-cell text-left">Joined</th>
                <th className="table-header-cell text-left"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : data?.users?.length ? (
                data.users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors"
                    style={{ borderTop: '1px solid #DDE3EA' }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: getAvatarColor(user.full_name) }}
                        >
                          {getInitials(user.full_name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{user.full_name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {user.phone_number ?? '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge user={user} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      {user.is_active && (
                        <button
                          className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          onClick={() => setConfirmUser(user)}
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      }
                      title="No clinicians found"
                      description="Register a new clinician to get started."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deactivation Modal */}
      {confirmUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.40)' }}
          onClick={() => setConfirmUser(null)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full mx-4"
            style={glassCard}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>

            <h3 className="text-base font-bold text-gray-800 text-center">Deactivate Clinician</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              Are you sure you want to deactivate{' '}
              <span className="font-semibold text-gray-700">{confirmUser.full_name}</span>?
              They will no longer be able to sign in.
            </p>

            {deactivateMutation.isError && (
              <div
                className="mt-4 px-4 py-3 rounded-xl text-sm text-red-600"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}
              >
                Failed to deactivate user. Please try again.
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{
                  background: 'rgba(255,255,255,0.60)',
                  border: '1px solid rgba(0,0,0,0.10)',
                  color: '#374151',
                }}
                onClick={() => setConfirmUser(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)' }}
                disabled={deactivateMutation.isPending}
                onClick={() => deactivateMutation.mutate(confirmUser.id)}
              >
                {deactivateMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Deactivating…
                  </span>
                ) : (
                  'Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <RegisterClinicianModal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  );
};
