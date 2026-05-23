import { describe, it, expect, vi } from 'vitest';
import { handleVerify, type VerifyDeps } from '@/lib/server/verify-handler';

function makeDeps(overrides: Partial<VerifyDeps> = {}): VerifyDeps {
  return {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: 'fbUid1',
      email: 'someone@example.com',
      name: 'Some One',
      picture: '',
    }),
    findUserByEmail: vi.fn().mockResolvedValue(null),
    createUser: vi.fn().mockResolvedValue('docId1'),
    updateUserOnLogin: vi.fn().mockResolvedValue(undefined),
    setCustomClaims: vi.fn().mockResolvedValue(undefined),
    initialAdminEmail: 'admin@example.com',
    ...overrides,
  };
}

describe('handleVerify', () => {
  it('returns 403 when user not in whitelist and not initial admin', async () => {
    const deps = makeDeps();
    const res = await handleVerify('valid-token', deps);
    expect(res.status).toBe(403);
  });

  it('bootstraps initial admin on first login', async () => {
    const deps = makeDeps({
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: 'adminUid',
        email: 'admin@example.com',
        name: 'Admin',
        picture: 'p.jpg',
      }),
    });
    const res = await handleVerify('valid-token', deps);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'admin', displayName: 'Admin' });
    expect(deps.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'adminUid',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
      })
    );
    expect(deps.setCustomClaims).toHaveBeenCalledWith('adminUid', { role: 'admin' });
  });

  it('links uid on existing user whose uid is null', async () => {
    const deps = makeDeps({
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: 'newUid',
        email: 'staff@example.com',
        name: 'Staff One',
        picture: '',
      }),
      findUserByEmail: vi.fn().mockResolvedValue({
        id: 'doc1',
        uid: null,
        email: 'staff@example.com',
        role: 'staff',
        status: 'active',
      }),
    });
    const res = await handleVerify('valid-token', deps);
    expect(res.status).toBe(200);
    expect(deps.updateUserOnLogin).toHaveBeenCalledWith(
      'doc1',
      expect.objectContaining({ uid: 'newUid' })
    );
    expect(deps.setCustomClaims).toHaveBeenCalledWith('newUid', { role: 'staff' });
  });

  it('returns 403 when user status is disabled', async () => {
    const deps = makeDeps({
      findUserByEmail: vi.fn().mockResolvedValue({
        id: 'doc1',
        uid: 'fbUid1',
        email: 'someone@example.com',
        role: 'staff',
        status: 'disabled',
      }),
    });
    const res = await handleVerify('valid-token', deps);
    expect(res.status).toBe(403);
  });

  it('returns 409 when uid in token does not match stored uid', async () => {
    const deps = makeDeps({
      findUserByEmail: vi.fn().mockResolvedValue({
        id: 'doc1',
        uid: 'otherUid',
        email: 'someone@example.com',
        role: 'staff',
        status: 'active',
      }),
    });
    const res = await handleVerify('valid-token', deps);
    expect(res.status).toBe(409);
  });

  it('updates lastLoginAt on existing user with matching uid', async () => {
    const deps = makeDeps({
      findUserByEmail: vi.fn().mockResolvedValue({
        id: 'doc1',
        uid: 'fbUid1',
        email: 'someone@example.com',
        role: 'manager',
        status: 'active',
      }),
    });
    const res = await handleVerify('valid-token', deps);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'manager', displayName: 'Some One' });
    expect(deps.updateUserOnLogin).toHaveBeenCalledWith(
      'doc1',
      expect.objectContaining({ uid: 'fbUid1' })
    );
  });
});
