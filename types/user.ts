import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'manager' | 'staff';
export type UserStatus = 'active' | 'disabled';

export interface UserDoc {
  uid: string | null;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Timestamp;
  createdByUid: string | null;
  lastLoginAt: Timestamp | null;
}

export interface UserDocWithId extends UserDoc {
  id: string;
}
