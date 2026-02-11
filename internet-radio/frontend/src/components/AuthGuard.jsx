'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '../hooks/useAuth';

export default function AuthGuard({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && requireAdmin && user?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, requireAdmin, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  if (requireAdmin && user.role !== 'admin') return null;

  return children;
}
