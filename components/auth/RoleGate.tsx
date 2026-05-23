'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { hasMinRole } from '@/lib/role';
import type { UserRole } from '@/types/user';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export function RoleGate({ minRole, children }: { minRole: UserRole; children: ReactNode }) {
  const { role, loading, user } = useAuth();

  if (loading) {
    return <div className="flex flex-1 items-center justify-center p-6">Đang tải...</div>;
  }

  if (!user) {
    redirect('/');
  }

  if (!hasMinRole(role, minRole)) {
    redirect('/not-authorized');
  }

  return <>{children}</>;
}
