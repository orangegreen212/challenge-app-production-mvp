'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingState } from '@/components/shared/loading-state';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setRedirecting(true);
      router.replace('/sign-in');
    }
  }, [loading, user, router]);

  if (loading || redirecting) {
    return <LoadingState label="Loading..." className="min-h-screen" />;
  }

  if (!user) return null;

  return <>{children}</>;
}
