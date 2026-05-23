import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/server/admin-auth';
import type { UserRole, UserStatus } from '@/types/user';

export const runtime = 'nodejs';

const VALID_ROLES: UserRole[] = ['admin', 'manager', 'staff'];
const VALID_STATUSES: UserStatus[] = ['active', 'disabled'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await requireAdmin(req);
  if (!check.ok) return check.res;

  const body = (await req.json()) as { role?: UserRole; status?: UserStatus };
  const { auth, db } = getFirebaseAdmin();
  const ref = db.collection('users').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const before = snap.data()!;

  const update: Record<string, unknown> = {};
  if (body.role && VALID_ROLES.includes(body.role)) update.role = body.role;
  if (body.status && VALID_STATUSES.includes(body.status)) update.status = body.status;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no changes' }, { status: 400 });
  }

  await ref.update(update);

  if (update.role && before.uid) {
    await auth.setCustomUserClaims(before.uid, { role: update.role as UserRole });
  }
  if (update.status === 'disabled' && before.uid) {
    await auth.revokeRefreshTokens(before.uid);
  }

  await db.collection('auditLog').add({
    type: 'user.update',
    actorUid: check.uid,
    targetId: id,
    before: { role: before.role, status: before.status },
    after: {
      role: (update.role ?? before.role) as UserRole,
      status: (update.status ?? before.status) as UserStatus,
    },
    at: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
