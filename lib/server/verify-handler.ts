import type { UserRole } from '@/types/user';

export interface VerifyDeps {
  verifyIdToken: (token: string) => Promise<{
    uid: string;
    email: string;
    name?: string;
    picture?: string;
  }>;
  findUserByEmail: (email: string) => Promise<{
    id: string;
    uid: string | null;
    email: string;
    role: UserRole;
    status: 'active' | 'disabled';
  } | null>;
  createUser: (data: {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    role: UserRole;
    status: 'active';
  }) => Promise<string>;
  updateUserOnLogin: (
    id: string,
    data: { uid: string; displayName: string; photoURL: string }
  ) => Promise<void>;
  setCustomClaims: (uid: string, claims: { role: UserRole }) => Promise<void>;
  initialAdminEmail: string;
}

export interface VerifyResult {
  status: 200 | 403 | 409;
  body?: { role: UserRole; displayName: string } | { error: string };
}

export async function handleVerify(idToken: string, deps: VerifyDeps): Promise<VerifyResult> {
  const decoded = await deps.verifyIdToken(idToken);
  const { uid, email, name = '', picture = '' } = decoded;
  if (!email) return { status: 403, body: { error: 'no email in token' } };

  const existing = await deps.findUserByEmail(email);

  if (!existing) {
    if (email === deps.initialAdminEmail) {
      await deps.createUser({
        uid,
        email,
        displayName: name,
        photoURL: picture,
        role: 'admin',
        status: 'active',
      });
      await deps.setCustomClaims(uid, { role: 'admin' });
      return { status: 200, body: { role: 'admin', displayName: name } };
    }
    return { status: 403, body: { error: 'not whitelisted' } };
  }

  if (existing.status === 'disabled') {
    return { status: 403, body: { error: 'user disabled' } };
  }

  if (existing.uid && existing.uid !== uid) {
    return { status: 409, body: { error: 'email already linked to a different account' } };
  }

  await deps.updateUserOnLogin(existing.id, { uid, displayName: name, photoURL: picture });
  await deps.setCustomClaims(uid, { role: existing.role });
  return { status: 200, body: { role: existing.role, displayName: name } };
}
