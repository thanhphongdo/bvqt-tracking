'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-context';
import { isAdmin } from '@/lib/role';
import { redirect } from 'next/navigation';
import type { UserDocWithId } from '@/types/user';
import { UsersTable } from '@/components/dashboard/UsersTable';
import { AddUserDialog } from '@/components/dashboard/AddUserDialog';

export default function UsersPage() {
  const { role, loading } = useAuth();
  const [users, setUsers] = useState<UserDocWithId[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    if (loading || !isAdmin(role)) return;
    const { db } = getFirebaseClient();
    const q = query(collection(db, 'users'), orderBy('email'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserDocWithId, 'id'>) }))
      );
      setUsersLoading(false);
    });
    return unsub;
  }, [loading, role]);

  if (loading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  if (!isAdmin(role)) redirect('/dashboard');

  return (
    <div className="px-4 pb-4 md:px-6 md:pb-6 flex flex-col h-full overflow-hidden gap-4 pt-4 md:pt-6">
      {/* Top Header Section (Stationary) */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Nhân viên</h1>
        <AddUserDialog />
      </div>

      {/* Scrollable Table Area */}
      <div className="flex-1 overflow-auto min-h-0 border border-border/60 rounded-xl bg-card shadow-xs relative">
        {usersLoading ? (
          <p className="text-sm text-muted-foreground animate-pulse p-4">Đang tải danh sách...</p>
        ) : (
          <UsersTable users={users} />
        )}
      </div>
    </div>
  );
}
