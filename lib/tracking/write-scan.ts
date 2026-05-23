import {
  collection,
  doc,
  Timestamp,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { ScanAction } from './scan-handler';
import { makeVisitId } from './visit-id';

const RETENTION_DAYS = 67;

export interface WriteScanInput {
  db: Firestore;
  code: string;
  date: string;
  selectedRoomId: string;
  selectedRoomName: string;
  selectedIsRegistration: boolean;
  action: ScanAction;
  staffUid: string;
  staffEmail: string;
}

export interface WriteScanResult {
  visitId: string;
  createdInferredOut: boolean;
  visitWasCreated: boolean;
}

/**
 * Commit a scan as a Firestore transaction.
 *
 * Handles:
 * - Visit doc creation (first scan for code+date)
 * - Auto-out inference when staff scans IN while patient is in a different room
 * - Visit denormalized fields (currentRoomId, currentRoomInAt, lastEventAt, hasError)
 * - Orphan room_in (no prior registration) → still creates visit but flags hasError
 * - room_out reject if visit doesn't exist or patient is in different room
 */
export async function writeScan(input: WriteScanInput): Promise<WriteScanResult> {
  const {
    db, code, date, selectedRoomId, selectedRoomName, selectedIsRegistration,
    action, staffUid, staffEmail,
  } = input;

  const visitId = makeVisitId(date, code);
  const visitRef = doc(db, 'visits', visitId);
  const eventsCol = collection(db, 'visits', visitId, 'events');

  return runTransaction(db, async (tx) => {
    const visitSnap = await tx.get(visitRef);
    const visitExists = visitSnap.exists();
    const visit = visitExists ? visitSnap.data() : null;

    // Reject room_out if not allowed
    if (action === 'room_out') {
      if (!visitExists) throw new Error('Bệnh nhân chưa được ghi nhận vào hệ thống.');
      if (visit?.currentRoomId !== selectedRoomId) {
        throw new Error('Bệnh nhân không đang ở phòng này.');
      }
    }

    const nowTs = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(
      nowTs.toMillis() + RETENTION_DAYS * 24 * 60 * 60 * 1000
    );

    let createdInferredOut = false;
    let visitWasCreated = false;
    let updateHasError = false;
    let updateErrorCount = 0;
    let nextCurrentRoomId: string | null = visit?.currentRoomId ?? null;
    let nextCurrentRoomInAt: Timestamp | null = visit?.currentRoomInAt ?? null;

    // Create visit if needed
    if (!visitExists) {
      visitWasCreated = true;
      const isOrphan = action === 'room_in';
      tx.set(visitRef, {
        code,
        date,
        registeredAt: nowTs,
        registeredByUid: staffUid,
        currentRoomId: null,
        currentRoomInAt: null,
        lastEventAt: nowTs,
        status: 'active',
        hasError: isOrphan,
        errorCount: isOrphan ? 1 : 0,
        expiresAt,
      });
      if (isOrphan) updateHasError = true;
    }

    // Auto-infer OUT for previous room if scanning IN at a different room
    if (
      action === 'room_in' &&
      visitExists &&
      visit?.currentRoomId &&
      visit.currentRoomId !== selectedRoomId
    ) {
      const inferredOutRef = doc(eventsCol);
      tx.set(inferredOutRef, {
        type: 'room_out',
        roomId: visit.currentRoomId,
        roomNameSnapshot: null,
        timestamp: visit.currentRoomInAt ?? nowTs,
        staffUid,
        staffEmailSnapshot: staffEmail,
        isInferred: true,
        isManuallyEdited: false,
        hasError: true,
        editHistory: [],
        expiresAt,
      });
      createdInferredOut = true;
      updateHasError = true;
      updateErrorCount += 1;
    }

    // Write the main event
    const eventRef = doc(eventsCol);
    const eventHasError =
      // Orphan room_in (no prior registration on a new visit) is flagged
      (action === 'room_in' && !visitExists);
    tx.set(eventRef, {
      type: action,
      roomId: action === 'registered' ? null : selectedRoomId,
      roomNameSnapshot: action === 'registered' ? null : selectedRoomName,
      timestamp: nowTs,
      staffUid,
      staffEmailSnapshot: staffEmail,
      isInferred: false,
      isManuallyEdited: false,
      hasError: eventHasError,
      editHistory: [],
      expiresAt,
    });

    // Update visit denormalized state
    if (action === 'room_in') {
      nextCurrentRoomId = selectedRoomId;
      nextCurrentRoomInAt = nowTs;
    } else if (action === 'room_out') {
      nextCurrentRoomId = null;
      nextCurrentRoomInAt = null;
    }
    // 'registered' doesn't change currentRoomId

    if (visitExists) {
      const patch: Record<string, unknown> = {
        currentRoomId: nextCurrentRoomId,
        currentRoomInAt: nextCurrentRoomInAt,
        lastEventAt: nowTs,
      };
      if (updateHasError) {
        patch.hasError = true;
        patch.errorCount = (visit?.errorCount ?? 0) + updateErrorCount;
      }
      tx.update(visitRef, patch);
    } else {
      // We already wrote the visit doc with defaults above; patch currentRoomId
      tx.update(visitRef, {
        currentRoomId: nextCurrentRoomId,
        currentRoomInAt: nextCurrentRoomInAt,
        lastEventAt: nowTs,
      });
    }

    return { visitId, createdInferredOut, visitWasCreated };
  });
}
