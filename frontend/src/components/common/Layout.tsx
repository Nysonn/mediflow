import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import { Sidebar } from './Sidebar';
import { FlashMessage } from './FlashMessage';
import { ErrorBoundary } from './ErrorBoundary';

export const Layout = () => {
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen);
  const dispatch = useDispatch<AppDispatch>();

  return (
    <div className="min-h-screen" style={{ background: '#F4F6F8' }}>
      <Sidebar />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        <main className="p-6 lg:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <FlashMessage />
    </div>
  );
};
