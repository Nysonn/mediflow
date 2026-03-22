import { NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/formatters';
import { formatRole } from '../../utils/formatters';

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
  <svg className="w-4 h-4 ml-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${navBase} ${isActive ? 'text-white' : ''}`;

  const navActiveStyle = { backgroundColor: '#6B8CAE', color: '#ffffff' };

  return (
    <div
      className={`
        fixed top-0 left-0 h-full flex flex-col z-40 transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}
      `}
      style={{
        background: '#ffffff',
        borderRight: '1px solid #DDE3EA',
      }}
    >
      {/* ── Brand ── */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid #DDE3EA' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#6B8CAE' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <rect x="11" y="5" width="2" height="14" />
              <rect x="5" y="11" width="14" height="2" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight tracking-tight">
              <span style={{ color: '#6B8CAE' }}>Medi</span>
              <span style={{ color: '#1A2535' }}>Flow</span>
            </p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: '#6B7A8D' }}>
              PPH Risk Platform
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 flex flex-col overflow-y-auto pb-4 pt-4">

        <p className="text-[10px] font-bold uppercase tracking-widest px-4 mb-2" style={{ color: '#6B7A8D' }}>
          Main Menu
        </p>

        <div className="flex flex-col gap-1">
          <NavLink
            to={isAdmin ? '/admin/dashboard' : '/dashboard'}
            end
            className={navLinkClass}
            style={({ isActive }) => isActive ? navActiveStyle : { color: '#6B7A8D' }}
            onClick={handleNavClick}
          >
            {({ isActive }) => (
              <>
                <IconDashboard />
                <span className="flex-1">Dashboard</span>
                {!isActive && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconChevron />
                  </span>
                )}
              </>
            )}
          </NavLink>

          <NavLink
            to="/patients"
            className={navLinkClass}
            style={({ isActive }) => isActive ? navActiveStyle : { color: '#6B7A8D' }}
            onClick={handleNavClick}
          >
            {({ isActive }) => (
              <>
                <IconPatients />
                <span className="flex-1">Patients</span>
                {!isActive && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconChevron />
                  </span>
                )}
              </>
            )}
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin/users"
              className={navLinkClass}
              style={({ isActive }) => isActive ? navActiveStyle : { color: '#6B7A8D' }}
              onClick={handleNavClick}
            >
              {({ isActive }) => (
                <>
                  <IconClinicians />
                  <span className="flex-1">Clinician Management</span>
                  {!isActive && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconChevron />
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )}
        </div>

        <div className="mt-8">
          <p className="text-[10px] font-bold uppercase tracking-widest px-4 mb-2" style={{ color: '#6B7A8D' }}>
            Account
          </p>
          <div className="flex flex-col gap-1">
            <button
              disabled
              className={`${navBase} cursor-not-allowed`}
              style={{ color: '#DDE3EA' }}
            >
              <IconSettings />
              <span className="flex-1">Settings</span>
            </button>
          </div>
        </div>

        <div className="flex-1" />
      </nav>

      {/* ── User profile ── */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid #DDE3EA', background: '#F4F6F8' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: '#6B8CAE' }}
          >
            {getInitials(dbUser?.full_name ?? 'U')}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight" style={{ color: '#1A2535' }}>
              {dbUser?.full_name}
            </p>
            <p className="text-xs leading-tight mt-0.5 capitalize" style={{ color: '#6B7A8D' }}>
              {dbUser?.role ? formatRole(dbUser.role) : ''}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
            style={{ color: '#6B7A8D' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#C0392B';
              e.currentTarget.style.backgroundColor = '#FDECEA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6B7A8D';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </div>
  );
};
