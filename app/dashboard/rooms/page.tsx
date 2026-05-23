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
    <div className="px-4 pb-4 md:px-6 md:pb-6 flex flex-col h-full overflow-hidden gap-4 pt-4 md:pt-6">
      {/* Top Header Section (Stationary) */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Phòng</h1>
        <RoomDialog trigger={<Button className="rounded-xl h-9 font-medium px-4">Tạo phòng</Button>} />
      </div>

      {/* Scrollable Table Area */}
      <div className="flex-1 overflow-auto min-h-0 border border-border/60 rounded-xl bg-card shadow-xs relative">
        {roomsLoading ? (
          <p className="text-sm text-muted-foreground animate-pulse p-4">Đang tải danh sách...</p>
        ) : (
          <RoomsTable rooms={rooms} />
        )}
      </div>
    </div>
  );
}
