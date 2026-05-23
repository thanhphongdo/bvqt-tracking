'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { isStaffPlus } from '@/lib/role';
import { redirect } from 'next/navigation';

export default function TrackingPage() {
  const { role, loading } = useAuth();

  if (loading) return <main className="flex flex-1 items-center justify-center">Đang tải...</main>;
  if (!isStaffPlus(role)) redirect('/not-authorized');

  return (
    <main className="flex-1 p-6">
      <h1 className="text-xl font-semibold">Tracking (sẽ build ở Plan 2)</h1>
    </main>
  );
}
