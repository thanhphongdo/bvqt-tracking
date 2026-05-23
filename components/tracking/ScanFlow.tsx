'use client';

import { useEffect, useState } from 'react';
import { BarcodeScanner } from './BarcodeScanner';
import { ScanResultCard } from './ScanResultCard';
import { inferScanAction, canPerformAction, type ScanAction } from '@/lib/tracking/scan-handler';
import { todayDateVN } from '@/lib/tracking/visit-id';
import { useVisit } from '@/lib/tracking/use-visit';
import { writeScan } from '@/lib/tracking/write-scan';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-context';
import { toast } from 'sonner';
import type { RoomDocWithId } from '@/types/room';

interface Props {
  room: RoomDocWithId;
}

export function ScanFlow({ room }: Props) {
  const { user } = useAuth();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ScanAction | null>(null);
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

  useEffect(() => {
    if (inference && selectedAction === null) {
      setSelectedAction(inference.suggested);
    }
  }, [inference, selectedAction]);

  function handleScan(code: string) {
    if (scannedCode) return; // already scanned, ignore until cleared
    setScannedCode(code.trim());
    setSelectedAction(null);
  }

  function reset() {
    setScannedCode(null);
    setSelectedAction(null);
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
    <div className="flex flex-col items-center gap-4">
      <BarcodeScanner onScan={handleScan} paused={scannedCode !== null} />
      {scannedCode && inference && selectedAction && (
        <ScanResultCard
          code={scannedCode}
          inference={inference}
          selected={selectedAction}
          onSelect={setSelectedAction}
          onSubmit={handleSubmit}
          onCancel={reset}
          submitting={submitting}
          selectedIsRegistration={room.isRegistrationCounter}
        />
      )}
    </div>
  );
}
