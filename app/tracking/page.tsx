'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-context';
import { isStaffPlus } from '@/lib/role';
import { redirect } from 'next/navigation';
import { useSelectedRoom } from '@/lib/tracking/selected-room-store';
import { RoomPicker } from '@/components/tracking/RoomPicker';
import { ScanFlow } from '@/components/tracking/ScanFlow';
import { StaffHistoryTab } from '@/components/tracking/StaffHistoryTab';
import { WarningsTab } from '@/components/tracking/WarningsTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, RefreshCw } from 'lucide-react';
import type { RoomDocWithId } from '@/types/room';

type Tab = 'scan' | 'history' | 'warnings';

export default function TrackingPage() {
  const { role, loading, signOut, displayName } = useAuth();
  const { roomId, setRoomId } = useSelectedRoom();
  const [room, setRoom] = useState<RoomDocWithId | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('scan');

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      return;
    }
    const { db } = getFirebaseClient();
    getDoc(doc(db, 'rooms', roomId)).then((snap) => {
      if (snap.exists()) {
        setRoom({ id: snap.id, ...(snap.data() as Omit<RoomDocWithId, 'id'>) });
      } else {
        setRoom(null);
        setRoomId(null);
      }
    });
  }, [roomId, setRoomId]);

  useEffect(() => {
    if (loading) return;
    if (!isStaffPlus(role)) return;
    if (!roomId) setPickerOpen(true);
  }, [loading, role, roomId]);

  if (loading) return <main className="flex flex-1 items-center justify-center">Đang tải...</main>;
  if (!isStaffPlus(role)) redirect('/not-authorized');

  return (
    <main className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold">Tracking</h1>
          {room ? (
            <Badge variant="secondary">{room.name}</Badge>
          ) : (
            <Badge variant="destructive">Chưa chọn phòng</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPickerOpen(true)}
            aria-label="Đổi phòng"
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="Đăng xuất">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <nav className="flex border-b bg-muted/20">
        {(['scan', 'history', 'warnings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs ${tab === t ? 'border-b-2 border-foreground font-medium' : 'text-muted-foreground'}`}
          >
            {t === 'scan' ? 'Quét' : t === 'history' ? 'Lịch sử (7 ngày)' : 'Cảnh báo'}
          </button>
        ))}
      </nav>

      <div className="flex flex-1 flex-col items-center justify-start p-4">
        {tab === 'scan' && (
          room ? (
            <ScanFlow room={room} />
          ) : (
            <p className="text-sm text-muted-foreground">Chọn phòng để bắt đầu quét.</p>
          )
        )}
        {tab === 'history' && <StaffHistoryTab />}
        {tab === 'warnings' && <WarningsTab />}
      </div>

      <p className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
        {displayName} ({role})
      </p>

      <RoomPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(r) => {
          setRoomId(r.id);
          setPickerOpen(false);
        }}
      />
    </main>
  );
}
