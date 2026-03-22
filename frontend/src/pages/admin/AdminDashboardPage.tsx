import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { PatientQuickViewModal } from '../../components/common/PatientQuickViewModal';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/common/StatCard';
import { SkeletonCard } from '../../components/common/SkeletonCard';
import { SkeletonRow } from '../../components/common/SkeletonRow';
import { RiskBadge } from '../../components/common/RiskBadge';
import { getInitials } from '../../utils/formatters';
import { RegisterClinicianModal } from '../../components/forms/RegisterClinicianModal';

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

export const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { dbUser } = useAuth();

  useEffect(() => {
    dispatch(setPageTitle('Dashboard'));
  }, [dispatch]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboard,
  });

  const [registerOpen, setRegisterOpen] = useState(false);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const firstName = dbUser?.full_name?.split(' ')[0] ?? '…';

  return (
    <div className="space-y-6">
      {/* ── Hero Banner ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white"
        style={{
          background: 'linear-gradient(135deg, #2C3E6B 0%, #4A6D8C 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white opacity-[0.07] transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white opacity-[0.06] transform translate-y-1/2" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white opacity-[0.04] -translate-y-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <p className="text-xs font-medium tracking-wide mb-1 uppercase" style={{ color: 'rgba(168,196,220,0.80)' }}>
              {formatHeroDate()}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Hello, {firstName}
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Here's a system-wide overview for today.
            </p>
          </div>

          <button
            className="self-start sm:self-center flex items-center gap-2 bg-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#F4F6F8] transition-colors shadow-sm flex-shrink-0"
            style={{ color: '#6B8CAE' }}
            onClick={() => setRegisterOpen(true)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Register Clinician
          </button>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              value={stats?.total_users ?? 0}
              title="Total Clinicians"
              subtitle={`${stats?.total_doctors ?? 0} doctors · ${stats?.total_midwives ?? 0} midwives · ${stats?.total_nurses ?? 0} nurses`}
              onClick={() => navigate('/admin/users')}
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              value={stats?.total_patients ?? 0}
              title="Total Patients"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
              value={stats?.total_assessments ?? 0}
              title="Total Assessments"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              }
              value={stats?.high_risk_count ?? 0}
              title="High Risk Patients"
              subtitle={`${stats?.low_risk_count ?? 0} low risk`}
            />
          </>
        )}
      </div>

      {/* ── Recent Patients Table ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: '#ffffff',
          border: '1px solid #DDE3EA',
          boxShadow: '0 1px 3px rgba(26,37,53,0.08)',
        }}
      >
        {/* Table header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #DDE3EA' }}>
          <div>
            <h3 className="section-title">Recent Patients</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Latest admissions across the system
            </p>
          </div>
          <button
            className="flex items-center gap-1 text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-[#F4F6F8]"
            style={{ color: '#6B8CAE' }}
            onClick={() => navigate('/patients')}
          >
            View all
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header-cell text-left">Patient</th>
                <th className="table-header-cell text-left">ID</th>
                <th className="table-header-cell text-left hidden sm:table-cell">Age</th>
                <th className="table-header-cell text-left hidden md:table-cell">Admitted</th>
                <th className="table-header-cell text-left hidden lg:table-cell">Added By</th>
                <th className="table-header-cell text-left">Risk</th>
                <th className="table-header-cell text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} cols={7} />
                ))
              ) : stats?.recent_patients?.length ? (
                stats.recent_patients.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors group"
                    style={{ borderTop: '1px solid #DDE3EA' }}
                  >
                    {/* Patient name + avatar */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: getAvatarColor(p.full_name) }}
                        >
                          {getInitials(p.full_name)}
                        </div>
                        <span className="font-medium text-sm" style={{ color: '#1A2535' }}>
                          {p.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">
                      {p.patient_id_number}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 hidden sm:table-cell">
                      {p.age} yrs
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 hidden md:table-cell">
                      {new Date(p.date_of_admission).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 hidden lg:table-cell">
                      {p.added_by_name}
                    </td>
                    <td className="px-4 py-3.5">
                      {p.latest_risk ? (
                        <RiskBadge risk={p.latest_risk} />
                      ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        className="flex items-center gap-1 text-sm font-semibold transition-colors hover:underline"
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
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(107,140,174,0.10)', color: '#6B8CAE' }}
                      >
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-500">No patients yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Patients will appear here once added by clinicians
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RegisterClinicianModal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} />
      <PatientQuickViewModal patientId={quickViewId} onClose={() => setQuickViewId(null)} />
    </div>
  );
};
