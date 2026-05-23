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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nhân viên</h1>
        <AddUserDialog />
      </div>

      {usersLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải danh sách...</p>
      ) : (
        <UsersTable users={users} />
      )}
    </div>
  );
}
