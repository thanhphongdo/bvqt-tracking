'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button, buttonVariants } from '@/components/ui/button';
import { isManagerPlus, isStaffPlus } from '@/lib/role';
import { redirect } from 'next/navigation';

export default function Home() {
  const { user, role, displayName, loading, signOut } = useAuth();

  if (loading) {
    return <main className="flex flex-1 items-center justify-center">Đang tải...</main>;
  }

  if (user && !role) {
    redirect('/not-authorized');
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-semibold">BVQ7 Tracking</h1>
        <p className="text-sm text-muted-foreground">Theo dõi luồng khám bệnh</p>
      </div>

      {!user ? (
        <div className="w-full max-w-xs">
          <GoogleSignInButton />
        </div>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <p className="text-center text-sm">
            Xin chào, <strong>{displayName}</strong> ({role})
          </p>
          {isStaffPlus(role) && (
            <Link href="/tracking" className={buttonVariants({ size: 'lg' })}>
              Đi tới Tracking
            </Link>
          )}
          {isManagerPlus(role) && (
            <Link href="/dashboard" className={buttonVariants({ size: 'lg', variant: 'secondary' })}>
              Đi tới Dashboard
            </Link>
          )}
          <Button onClick={signOut} variant="ghost" size="sm">Đăng xuất</Button>
        </div>
      )}
    </main>
  );
}
