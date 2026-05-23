'use client';

import { useState } from 'react';
import { BarcodeScanner } from './BarcodeScanner';
import { ScanResultCard } from './ScanResultCard';
import { inferScanAction, canPerformAction, type ScanAction } from '@/lib/tracking/scan-handler';
import { todayDateVN } from '@/lib/tracking/visit-id';
import { useVisit } from '@/lib/tracking/use-visit';
import { writeScan } from '@/lib/tracking/write-scan';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-context';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { RoomDocWithId } from '@/types/room';

interface Props {
  room: RoomDocWithId;
  onChangeRoom?: () => void;
}

export function ScanFlow({ room, onChangeRoom }: Props) {
  const { user } = useAuth();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  // actionOverride is keyed by roomId — stale overrides for other rooms are ignored
  const [actionOverride, setActionOverride] = useState<{ roomId: string; action: ScanAction } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const today = todayDateVN();
  const visit = useVisit(scannedCode ? today : null, scannedCode);

  const inference = scannedCode && visit !== null
    ? inferScanAction({
        selectedRoomId: room.id,
        selectedIsRegistration: room.isRegistrationCounter,
        visit: visit.exists
          ? { currentRoomId: visit.data!.currentRoomId, exists: true }
          : null,
      })
    : null;

  // Use the override only if it's for the current room; otherwise fall back to inference
  const selectedAction: ScanAction | null =
    actionOverride?.roomId === room.id ? actionOverride.action : (inference?.suggested ?? null);

  function handleScan(code: string) {
    if (scannedCode) return;
    setScannedCode(code.trim());
    setActionOverride(null);
  }

  function handleSelectAction(action: ScanAction) {
    setActionOverride({ roomId: room.id, action });
  }

  function reset() {
    setScannedCode(null);
    setActionOverride(null);
  }

  async function handleSubmit() {
    if (!scannedCode || !selectedAction || !user) return;
    const check = canPerformAction(selectedAction, {
      selectedRoomId: room.id,
      selectedIsRegistration: room.isRegistrationCounter,
      visit: visit?.exists
        ? { currentRoomId: visit.data!.currentRoomId, exists: true }
        : null,
    });
    if (!check.ok) {
      toast.error(check.reason);
      return;
    }
    setSubmitting(true);
    try {
      const { db } = getFirebaseClient();
      const result = await writeScan({
        db,
        code: scannedCode,
        date: today,
        selectedRoomId: room.id,
        selectedRoomName: room.name,
        selectedIsRegistration: room.isRegistrationCounter,
        action: selectedAction,
        staffUid: user.uid,
        staffEmail: user.email ?? '',
      });
      const msg =
        selectedAction === 'registered'
          ? 'Đã ghi nhận đăng ký'
          : selectedAction === 'room_in'
            ? 'Đã ghi nhận VÀO phòng'
            : 'Đã ghi nhận RA phòng';
      toast.success(
        result.createdInferredOut
          ? msg + ' (+ tự tạo OUT cho phòng trước)'
          : msg
      );
      setTimeout(reset, 800);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm">
      {/* Current Room Info Card */}
      <div className="flex w-full items-center justify-between rounded-xl border bg-card/50 p-3 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Phòng đang trực</span>
          <span className="text-sm font-semibold text-foreground">{room.name}</span>
        </div>
        {onChangeRoom && (
          <Button
            variant="outline"
            size="xs"
            onClick={onChangeRoom}
            className="h-7 text-xs font-semibold px-2.5 rounded-lg border-muted-foreground/20 hover:bg-muted"
          >
            Đổi phòng
          </Button>
        )}
      </div>

      <BarcodeScanner onScan={handleScan} paused={scannedCode !== null} />
      {scannedCode && inference && selectedAction && (
        <ScanResultCard
          code={scannedCode}
          inference={inference}
          selected={selectedAction}
          onSelect={handleSelectAction}
          onSubmit={handleSubmit}
          onCancel={reset}
          submitting={submitting}
          selectedIsRegistration={room.isRegistrationCounter}
        />
      )}
    </div>
  );
}
