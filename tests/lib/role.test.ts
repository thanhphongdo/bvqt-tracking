import { describe, it, expect } from 'vitest';
import { hasMinRole } from '@/lib/role';
import type { UserRole } from '@/types/user';

describe('hasMinRole', () => {
  const cases: Array<[UserRole, UserRole, boolean]> = [
    ['admin', 'admin', true],
    ['admin', 'manager', true],
    ['admin', 'staff', true],
    ['manager', 'admin', false],
    ['manager', 'manager', true],
    ['manager', 'staff', true],
    ['staff', 'admin', false],
    ['staff', 'manager', false],
    ['staff', 'staff', true],
  ];

  it.each(cases)('hasMinRole(%s, %s) === %s', (actual, required, expected) => {
    expect(hasMinRole(actual, required)).toBe(expected);
  });

  it('returns false when actual role is null', () => {
    expect(hasMinRole(null, 'staff')).toBe(false);
  });
});
