import type { UserRole } from '@/types/user';

const RANK: Record<UserRole, number> = {
  staff: 1,
  manager: 2,
  admin: 3,
};

export function hasMinRole(actual: UserRole | null, required: UserRole): boolean {
  if (!actual) return false;
  return RANK[actual] >= RANK[required];
}

export function isAdmin(role: UserRole | null) {
  return role === 'admin';
}

export function isManagerPlus(role: UserRole | null) {
  return hasMinRole(role, 'manager');
}

export function isStaffPlus(role: UserRole | null) {
  return hasMinRole(role, 'staff');
}

export type { UserRole };
