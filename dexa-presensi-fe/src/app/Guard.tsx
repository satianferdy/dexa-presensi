import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Role } from '../lib/types';
import { useAuth } from '../state/auth';
import { Busy } from '../components/ui/Busy';

export function Guard({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Busy />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role)
    return <Navigate to={user.role === 'HRD_ADMIN' ? '/hrd' : '/employee'} replace />;
  return <>{children}</>;
}
