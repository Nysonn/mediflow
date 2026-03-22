import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { assessmentsApi } from '../../api/assessments';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/common/StatCard';
import { SkeletonCard } from '../../components/common/SkeletonCard';
import { SkeletonTable } from '../../components/common/SkeletonTable';
import { EmptyState } from '../../components/common/EmptyState';
import { RiskBadge } from '../../components/common/RiskBadge';
import { RoleBadge } from '../../components/common/RoleBadge';
import { formatDateTime, getInitials } from '../../utils/formatters';
import { AddPatientModal } from '../../components/forms/AddPatientModal';
import { PatientQuickViewModal } from '../../components/common/PatientQuickViewModal';
import type { Role } from '../../types';

const formatHeroDate = () =>
  new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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

export const ClinicianDashboardPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { dbUser, isAdmin, isLoaded } = useAuth();

  useEffect(() => {
    dispatch(setPageTitle('Dashboard'));
  }, [dispatch]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['clinician', 'dashboard'],
    queryFn: assessmentsApi.getDashboard,
    enabled: isLoaded && !isAdmin,
  });

  if (isLoaded && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const [addOpen, setAddOpen] = useState(false);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const firstName = dbUser?.full_name?.split(' ')[0] ?? '…';

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white"
        style={{ background: 'linear-gradient(135deg, #2C3E6B 0%, #4A6D8C 100%)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white opacity-[0.07] transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white opacity-[0.06] transform translate-y-1/2" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white opacity-[0.04] -translate-y-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <p className="text-xs font-medium tracking-wide mb-1 uppercase" style={{ color: 'rgba(168,196,220,0.80)' }}>
              {formatHeroDate()}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">Hello, {firstName}</h1>
            <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Here's an overview of your patients and assessments today.
            </p>
          </div>

          {dbUser && (
            <div className="self-start sm:self-center flex items-center gap-3 flex-shrink-0">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.20)', border: '2px solid rgba(255,255,255,0.35)' }}
              >
                {getInitials(dbUser.full_name ?? '?')}
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">{dbUser.full_name}</p>
                {dbUser.role && (
                  <div className="mt-0.5">
                    <RoleBadge role={dbUser.role as Role} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              value={stats?.my_patients ?? 0}
              title="My Patients Added"
              onClick={() => navigate('/patients')}
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
              value={stats?.my_assessments ?? 0}
              title="My Assessments Run"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              }
              value={stats?.my_high_risk ?? 0}
              title="High Risk Cases"
              subtitle={(stats?.my_high_risk ?? 0) > 0 ? 'Requires attention' : 'All clear'}
              onClick={() => navigate('/patients')}
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              value={stats?.my_low_risk ?? 0}
              title="Low Risk Cases"
            />
          </>
        )}
      </div>

      {/* Recently Assessed Patients */}
      <div className="rounded-2xl overflow-hidden" style={glassCard}>
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid #DDE3EA' }}
        >
          <div>
            <h3 className="section-title">Recently Assessed Patients</h3>
            <p className="text-xs text-gray-400 mt-0.5">Your latest PPH assessments</p>
          </div>
          <button
            className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-[#F4F6F8] transition-colors"
            style={{ color: '#6B8CAE' }}
            onClick={() => navigate('/patients')}
          >
            View all
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} cols={5} />
          </div>
        ) : !stats?.recent_patients?.length ? (
          <EmptyState
            icon={
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title="No assessments yet"
            description="Add a patient and run your first PPH risk assessment."
            actionLabel="Add First Patient"
            onAction={() => setAddOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F4F6F8' }}>
                  <th className="table-header-cell text-left">Patient</th>
                  <th className="table-header-cell text-left">ID</th>
                  <th className="table-header-cell text-left">Risk</th>
                  <th className="table-header-cell text-left">Last Assessed</th>
                  <th className="table-header-cell text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_patients.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors"
                    style={{ borderTop: '1px solid #DDE3EA' }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: getAvatarColor(p.full_name) }}
                        >
                          {getInitials(p.full_name)}
                        </div>
                        <span className="font-medium text-sm text-gray-800">{p.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">
                      {p.patient_id_number}
                    </td>
                    <td className="px-4 py-3.5">
                      {p.latest_risk ? (
                        <RiskBadge risk={p.latest_risk} />
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {formatDateTime(p.updated_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        className="flex items-center gap-1 text-sm font-semibold hover:underline"
                        style={{ color: '#6B8CAE' }}
                        onClick={() => setQuickViewId(p.id)}
                      >
                        View
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl p-6" style={glassCard}>
        <h3 className="section-title mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#6B8CAE' }}
            onClick={() => setAddOpen(true)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Patient
          </button>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-[#F4F6F8]"
            style={{
              background: '#ffffff',
              border: '1px solid #DDE3EA',
              color: '#6B8CAE',
            }}
            onClick={() => navigate('/patients')}
          >
            View All Patients
          </button>
        </div>
      </div>

      <AddPatientModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
      <PatientQuickViewModal patientId={quickViewId} onClose={() => setQuickViewId(null)} />
    </div>
  );
};
