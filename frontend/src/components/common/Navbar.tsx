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
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#E5E7EB] px-4 sm:px-6 py-3 flex items-center justify-between">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Toggle sidebar"
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

        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-900">{pageTitle}</span>
        </div>
      </div>

      {/* Right: notification bell + greeting + avatar */}
      {dbUser && (
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification bell */}
          <button
            className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Divider */}
          <div className="hidden sm:block h-5 w-px bg-gray-200" />

          {/* Greeting + avatar */}
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:block text-sm text-gray-500">
              {getGreeting(dbUser.full_name)}
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #4338CA)' }}
            >
              {getInitials(dbUser.full_name)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
