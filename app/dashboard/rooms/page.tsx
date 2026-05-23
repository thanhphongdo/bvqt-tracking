'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-context';
import { isManagerPlus } from '@/lib/role';
import { Button } from '@/components/ui/button';
import { RoomDialog } from '@/components/dashboard/RoomDialog';
import { RoomsTable } from '@/components/dashboard/RoomsTable';
import type { RoomDocWithId } from '@/types/room';

export default function RoomsPage() {
  const { role, loading } = useAuth();
  const [rooms, setRooms] = useState<RoomDocWithId[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  useEffect(() => {
    if (loading || !isManagerPlus(role)) return;
    const { db } = getFirebaseClient();
    const q = query(collection(db, 'rooms'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      setRooms(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoomDocWithId, 'id'>) }))
      );
      setRoomsLoading(false);
    });
    return unsub;
  }, [loading, role]);

  if (loading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Phòng</h1>
        <RoomDialog trigger={<Button>Tạo phòng</Button>} />
      </div>

      {roomsLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải danh sách...</p>
      ) : (
        <RoomsTable rooms={rooms} />
      )}
    </div>
  );
}
