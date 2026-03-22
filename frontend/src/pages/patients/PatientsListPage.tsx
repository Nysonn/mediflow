import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { patientsApi } from '../../api/patients';
import { SkeletonTable } from '../../components/common/SkeletonTable';
import { EmptyState } from '../../components/common/EmptyState';
import { RiskBadge } from '../../components/common/RiskBadge';
import { formatDate } from '../../utils/formatters';
import { getInitials } from '../../utils/formatters';
import { AddPatientModal } from '../../components/forms/AddPatientModal';
import { PatientQuickViewModal } from '../../components/common/PatientQuickViewModal';

const PAGE_SIZE = 15;

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

export const PatientsListPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = parseInt(searchParams.get('page') ?? '1', 10);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);
  const [addOpen, setAddOpen] = useState(false);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(setPageTitle('Patients'));
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', '1');
        if (searchInput) next.set('search', searchInput);
        else next.delete('search');
        return next;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading } = useQuery({
    queryKey: ['patients', 'list', debouncedSearch, pageParam],
    queryFn: () =>
      patientsApi.getAll({
        search: debouncedSearch || undefined,
        page: pageParam,
        page_size: PAGE_SIZE,
      }),
  });

  const handlePageChange = useCallback(
    (newPage: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', String(newPage));
        return next;
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setSearchParams],
  );

  const totalPages = data?.total_pages ?? 1;
  const currentPage = data?.page ?? pageParam;
  const showing = {
    from: (currentPage - 1) * PAGE_SIZE + 1,
    to: Math.min(currentPage * PAGE_SIZE, data?.total ?? 0),
    total: data?.total ?? 0,
  };

  const hasPatients = (data?.total ?? 0) > 0 || debouncedSearch;
  const isEmpty = !isLoading && data && data.patients.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A2535' }}>Patients</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B7A8D' }}>All patients across the system</p>
        </div>
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
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <div
          className="flex items-center gap-2 px-3 rounded-xl"
          style={{
            background: '#ffffff',
            border: '1px solid #DDE3EA',
          }}
        >
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className="w-full py-2.5 text-sm text-gray-800 bg-transparent outline-none placeholder-gray-400"
            placeholder="Search by name or patient ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden p-0" style={glassCard}>
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={8} cols={7} />
          </div>
        ) : isEmpty && !hasPatients ? (
          <EmptyState
            icon={
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            title="No patients yet"
            description="Add your first patient to get started."
            actionLabel="Add First Patient"
            onAction={() => navigate('/patients/new')}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            title="No patients found"
            description={`No results for "${debouncedSearch}". Try a different search term.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F4F6F8' }}>
                  <th className="table-header-cell text-left">Patient</th>
                  <th className="table-header-cell text-left">ID</th>
                  <th className="table-header-cell text-left">Age</th>
                  <th className="table-header-cell text-left">Admitted</th>
                  <th className="table-header-cell text-left">Added By</th>
                  <th className="table-header-cell text-left">Latest Risk</th>
                  <th className="table-header-cell text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data!.patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="transition-colors"
                    style={{ borderTop: '1px solid #DDE3EA' }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: getAvatarColor(patient.full_name) }}
                        >
                          {getInitials(patient.full_name)}
                        </div>
                        <span className="font-medium text-sm text-gray-800">{patient.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">
                      {patient.patient_id_number}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{patient.age} yrs</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {formatDate(patient.date_of_admission)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{patient.added_by_name}</td>
                    <td className="px-4 py-3.5">
                      {patient.latest_risk ? (
                        <RiskBadge risk={patient.latest_risk} />
                      ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        className="flex items-center gap-1 text-sm font-semibold transition-colors hover:underline"
                        style={{ color: '#6B8CAE' }}
                        onClick={() => setQuickViewId(patient.id)}
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

      {/* Pagination */}
      {!isLoading && data && data.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm text-gray-500">
            Showing {showing.from} to {showing.to} of {showing.total} patients
          </span>
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{
              background: '#ffffff',
              border: '1px solid #DDE3EA',
            }}
          >
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60"
              style={{ color: '#6B8CAE' }}
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Prev
            </button>
            <span className="px-4 py-2 text-sm text-gray-600 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60"
              style={{ color: '#6B8CAE' }}
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <AddPatientModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
      <PatientQuickViewModal patientId={quickViewId} onClose={() => setQuickViewId(null)} />
    </div>
  );
};
