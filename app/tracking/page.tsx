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
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Home, LogOut, RefreshCw } from 'lucide-react';
import type { RoomDocWithId } from '@/types/room';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
    <main className="flex min-h-screen flex-col bg-background">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="flex flex-col flex-1 gap-0"
      >
        {/* Unified Sticky Header */}
        <div className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-md border-b border-border/40">
          <header className="flex items-center justify-between border-b border-border/40 bg-muted/40 px-4 py-2">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                aria-label="Về trang chủ"
              >
                <Home className="size-4" />
              </Link>
              <h1 className="text-sm font-semibold tracking-tight text-primary dark:text-foreground">Tracking</h1>
              {room ? (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 cursor-pointer rounded-full bg-secondary hover:bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-all duration-200 border-none"
                >
                  <span>{room.name}</span>
                  <RefreshCw className="size-3 text-muted-foreground" />
                </button>
              ) : (
                <Badge
                  variant="destructive"
                  className="cursor-pointer hover:bg-destructive/80 transition-colors"
                  onClick={() => setPickerOpen(true)}
                >
                  Chưa chọn phòng
                </Badge>
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

          <div className="px-4 py-1.5 flex justify-center bg-muted/10">
            <TabsList className="w-full max-w-lg h-9 bg-muted/50 p-1" variant="default">
              <TabsTrigger value="scan" className="text-xs">
                Quét
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                Lịch sử (7 ngày)
              </TabsTrigger>
              <TabsTrigger value="warnings" className="text-xs">
                Cảnh báo
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab Content Wrapper */}
        <div className="flex-1 w-full max-w-lg mx-auto flex flex-col p-4">
          <TabsContent value="scan" className="w-full flex-1 flex flex-col focus-visible:outline-none">
            {room ? (
              <ScanFlow room={room} onChangeRoom={() => setPickerOpen(true)} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center animate-in fade-in duration-300">
                <div className="rounded-full bg-muted p-4">
                  <RefreshCw className="size-8 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1 max-w-[280px]">
                  <p className="font-semibold text-base">Chưa cấu hình phòng trực</p>
                  <p className="text-xs text-muted-foreground">Vui lòng chọn phòng làm việc hiện tại để bắt đầu quét barcode bệnh nhân.</p>
                </div>
                <Button onClick={() => setPickerOpen(true)} className="rounded-lg shadow-sm font-semibold mt-2">
                  Chọn phòng trực
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="w-full focus-visible:outline-none">
            <StaffHistoryTab />
          </TabsContent>

          <TabsContent value="warnings" className="w-full focus-visible:outline-none">
            <WarningsTab />
          </TabsContent>
        </div>
      </Tabs>

      <footer className="border-t px-4 py-2 text-center text-xs text-muted-foreground bg-muted/10 shrink-0">
        {displayName} ({role})
      </footer>

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
