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
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 45%, #ede9fe 100%)',
    }}>
      {/* Decorative background blobs */}
      <div
        className="fixed top-[-120px] left-[-80px] w-[420px] h-[420px] rounded-full opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #93c5fd, transparent 70%)' }}
      />
      <div
        className="fixed bottom-[-100px] right-[-60px] w-[380px] h-[380px] rounded-full opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #c4b5fd, transparent 70%)' }}
      />
      <div
        className="fixed top-1/2 left-1/2 w-[300px] h-[300px] rounded-full opacity-15 pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'radial-gradient(circle, #a5b4fc, transparent 70%)' }}
      />

      <Sidebar />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      {/* Main content */}
      <div className={`relative transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
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
