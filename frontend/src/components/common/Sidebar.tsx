import { NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/formatters';
import { formatRole } from '../../utils/formatters';
import type { Role } from '../../types';

/* ── Icons ─────────────────────────────────────────────── */
const IconDashboard = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const IconPatients = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconClinicians = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const IconSettings = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconChevron = () => (
  <svg className="w-4 h-4 ml-auto opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const IconLogout = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

/* ── Component ──────────────────────────────────────────── */
export const Sidebar = () => {
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { dbUser, isAdmin } = useAuth();
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) dispatch(setSidebarOpen(false));
  };

  const navBase =
    'group flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 w-full';
  const navInactive = 'text-gray-500 hover:bg-[#F0F4FF] hover:text-[#1D4ED8]';
  const navActive = 'text-white shadow-md';
  const activeGradient = { background: 'linear-gradient(135deg, #1D4ED8 0%, #4338CA 100%)' };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${navBase} ${isActive ? navActive : navInactive}`;

  return (
    <div
      className={`
        fixed top-0 left-0 h-full flex flex-col z-40 transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}
      `}
      style={{
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.55)',
        boxShadow: '4px 0 24px rgba(99, 102, 241, 0.08)',
      }}
    >
      {/* ── Brand ── */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.45)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #4338CA)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <rect x="11" y="5" width="2" height="14" />
              <rect x="5" y="11" width="14" height="2" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900 leading-tight tracking-tight">
              MediFlow
            </p>
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
              PPH Risk Prediction
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 flex flex-col overflow-y-auto pb-4">

        {/* Main Menu */}
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">
          Main Menu
        </p>

        <div className="flex flex-col gap-1">
          <NavLink
            to={isAdmin ? '/admin/dashboard' : '/dashboard'}
            end
            className={navLinkClass}
            style={({ isActive }) => (isActive ? activeGradient : {})}
            onClick={handleNavClick}
          >
            <IconDashboard />
            <span className="flex-1">Dashboard</span>
            {/* Chevron only on inactive hover — always rendered, hidden when active */}
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              <IconChevron />
            </span>
          </NavLink>

          <NavLink
            to="/patients"
            className={navLinkClass}
            style={({ isActive }) => (isActive ? activeGradient : {})}
            onClick={handleNavClick}
          >
            <IconPatients />
            <span className="flex-1">Patients</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              <IconChevron />
            </span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin/users"
              className={navLinkClass}
              style={({ isActive }) => (isActive ? activeGradient : {})}
              onClick={handleNavClick}
            >
              <IconClinicians />
              <span className="flex-1">Clinician Management</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                <IconChevron />
              </span>
            </NavLink>
          )}
        </div>

        {/* Account */}
        <div className="mt-8">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">
            Account
          </p>
          <div className="flex flex-col gap-1">
            <button
              disabled
              className={`${navBase} text-gray-300 cursor-not-allowed`}
            >
              <IconSettings />
              <span className="flex-1">Settings</span>
            </button>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />
      </nav>

      {/* ── User profile ── */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.5)' }}>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #4338CA)' }}
          >
            {getInitials(dbUser?.full_name ?? 'U')}
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
              {dbUser?.full_name}
            </p>
            <p className="text-xs text-gray-400 leading-tight mt-0.5 capitalize">
              {dbUser?.role ? formatRole(dbUser.role) : ''}
            </p>
          </div>

          {/* Logout icon button */}
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </div>
  );
};
