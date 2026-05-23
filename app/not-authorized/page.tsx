'use client';

import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/lib/firebase/auth-context';

export default function NotAuthorizedPage() {
  const { signOut } = useAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Chưa được cấp quyền</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Tài khoản Google của bạn chưa được admin cấp quyền truy cập hệ thống. Vui lòng liên hệ admin để được thêm.
      </p>
      <div className="flex gap-2">
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          Về trang chủ
        </Link>
        <Button onClick={signOut} variant="ghost">Đăng xuất</Button>
      </div>
    </main>
  );
}
