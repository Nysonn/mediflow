import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
} from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Provider } from 'react-redux';
import { store } from './store';
import { ClerkTokenSetter } from './components/common/ClerkTokenSetter';
import { Layout } from './components/common/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { PasswordResetPage } from './pages/auth/PasswordResetPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { RegisterUserPage } from './pages/admin/RegisterUserPage';
import { ClinicianDashboardPage } from './pages/clinician/ClinicianDashboardPage';
import { PatientsListPage } from './pages/patients/PatientsListPage';
import { PatientDetailPage } from './pages/patients/PatientDetailPage';
import { AddPatientPage } from './pages/patients/AddPatientPage';
import { EditPatientPage } from './pages/patients/EditPatientPage';
import { NewAssessmentPage } from './pages/assessments/NewAssessmentPage';
import { AssessmentResultPage } from './pages/assessments/AssessmentResultPage';
import { NotFoundPage } from './pages/errors/NotFoundPage';
import { ForbiddenPage } from './pages/errors/ForbiddenPage';
import { useAuth } from './hooks/useAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Redirects to admin dashboard or clinician dashboard based on role
const RoleBasedRedirect = () => {
  const { isAdmin, isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

// Guards routes by role; redirects to /403 if role is not allowed
const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { dbUser, isLoaded, isSignedIn, passwordResetRequired } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/login" replace />;

  if (passwordResetRequired && window.location.pathname !== '/password-reset') {
    return <Navigate to="/password-reset" replace />;
  }

  if (allowedRoles && dbUser && !allowedRoles.includes(dbUser.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ClerkTokenSetter />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login/*" element={<LoginPage />} />
              <Route path="/password-reset" element={<PasswordResetPage />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <>
                    <SignedIn>
                      <Layout />
                    </SignedIn>
                    <SignedOut>
                      <Navigate to="/login" replace />
                    </SignedOut>
                  </>
                }
              >
                <Route index element={<RoleBasedRedirect />} />
                <Route path="dashboard" element={<ClinicianDashboardPage />} />
                <Route path="patients" element={<PatientsListPage />} />
                <Route path="patients/new" element={<AddPatientPage />} />
                <Route path="patients/:id" element={<PatientDetailPage />} />
                <Route path="patients/:id/edit" element={<EditPatientPage />} />
                <Route
                  path="patients/:id/assessments/new"
                  element={<NewAssessmentPage />}
                />
                <Route
                  path="patients/:id/assessments/:assessmentId/result"
                  element={<AssessmentResultPage />}
                />

                {/* Admin routes — role-guarded */}
                <Route
                  path="admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/users/register"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <RegisterUserPage />
                    </ProtectedRoute>
                  }
                />

                {/* Error pages */}
                <Route path="403" element={<ForbiddenPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </Provider>
    </ClerkProvider>
  );
}

export default App;
