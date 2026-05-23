import type { Timestamp } from 'firebase/firestore';

export type RoomStatus = 'active' | 'disabled';

export interface RoomDoc {
  name: string;
  function: string;
  isRegistrationCounter: boolean;
  status: RoomStatus;
  autoOutWarningMinutes: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RoomDocWithId extends RoomDoc {
  id: string;
}
