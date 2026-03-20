import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import type { User } from '../types';

export const useAuth = () => {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { getToken, isSignedIn: clerkSignedIn } = useClerkAuth();

  const {
    data: dbUser,
    isLoading: dbUserLoading,
  } = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: !!clerkUser && !!clerkSignedIn,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isLoaded = clerkLoaded && (
    !clerkSignedIn || (!dbUserLoading && !!dbUser)
  );

  return {
    clerkUser,
    dbUser,
    isLoaded,
    isSignedIn: !!clerkSignedIn,
    isAdmin: dbUser?.role === 'admin',
    isDoctor: dbUser?.role === 'doctor',
    isMidwife: dbUser?.role === 'midwife',
    isNurse: dbUser?.role === 'nurse',
    isClinician: ['doctor', 'midwife', 'nurse'].includes(dbUser?.role ?? ''),
    passwordResetRequired: dbUser?.password_reset_required ?? false,
    role: dbUser?.role,
    fullName: dbUser?.full_name ?? clerkUser?.fullName ?? '',
    getToken,
  };
};
