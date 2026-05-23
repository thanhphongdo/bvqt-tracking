import type { Timestamp } from 'firebase/firestore';

export type VisitStatus = 'active' | 'closed';

export interface VisitDoc {
  code: string;
  date: string;
  registeredAt: Timestamp;
  registeredByUid: string;
  currentRoomId: string | null;
  currentRoomInAt: Timestamp | null;
  lastEventAt: Timestamp;
  status: VisitStatus;
  hasError: boolean;
  errorCount: number;
  expiresAt: Timestamp;
}

export interface VisitDocWithId extends VisitDoc {
  id: string;
}
