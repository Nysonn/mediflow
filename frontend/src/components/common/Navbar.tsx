import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/formatters';

const getGreeting = (name: string): string => {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const firstName = name.split(' ')[0];
  return `Good ${period}, ${firstName}`;
};

export const Navbar = () => {
  const dispatch = useDispatch<AppDispatch>();
  const pageTitle = useSelector((state: RootState) => state.ui.pageTitle);
  const { dbUser } = useAuth();

  return (
    <div
      className="sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #DDE3EA',
      }}
    >
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: '#6B7A8D' }}
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Toggle sidebar"
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F6F8')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <span className="text-base font-bold" style={{ color: '#1A2535' }}>{pageTitle}</span>
      </div>

      {/* Right: greeting + avatar */}
      {dbUser && (
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: '#6B7A8D' }}
            aria-label="Notifications"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F6F8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          <div className="hidden sm:block h-5 w-px" style={{ backgroundColor: '#DDE3EA' }} />

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:block text-sm" style={{ color: '#6B7A8D' }}>
              {getGreeting(dbUser.full_name)}
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: '#4A6D8C' }}
            >
              {getInitials(dbUser.full_name)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
