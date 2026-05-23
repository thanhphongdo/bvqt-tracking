'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { isAdmin } from '@/lib/role';
import { redirect } from 'next/navigation';

export default function AuditPage() {
  const { role, loading } = useAuth();
  if (loading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  if (!isAdmin(role)) redirect('/dashboard');
  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sẽ build ở Plan 4.</p>
    </div>
  );
}
