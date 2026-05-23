import type { Timestamp } from 'firebase/firestore';

export type EventType = 'registered' | 'room_in' | 'room_out';

export interface EventEdit {
  at: Timestamp;
  byUid: string;
  before: { type: EventType; roomId: string | null; timestamp: Timestamp };
  after: { type: EventType; roomId: string | null; timestamp: Timestamp };
  reason: string;
}

export interface VisitEventDoc {
  type: EventType;
  roomId: string | null;
  roomNameSnapshot: string | null;
  timestamp: Timestamp;
  staffUid: string;
  staffEmailSnapshot: string;
  isInferred: boolean;
  isManuallyEdited: boolean;
  hasError: boolean;
  editHistory: EventEdit[];
  expiresAt: Timestamp;
}

export interface VisitEventDocWithId extends VisitEventDoc {
  id: string;
  visitId: string;
}
