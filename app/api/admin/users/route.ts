import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/server/admin-auth';
import type { UserRole } from '@/types/user';

export const runtime = 'nodejs';

const VALID_ROLES: UserRole[] = ['admin', 'manager', 'staff'];

export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.res;

  const body = (await req.json()) as { email?: string; role?: UserRole };
  const email = body.email?.trim().toLowerCase();
  const role = body.role;

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }

  const { db } = getFirebaseAdmin();
  const existing = await db.collection('users').where('email', '==', email).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json({ error: 'email already exists' }, { status: 409 });
  }

  const ref = await db.collection('users').add({
    uid: null,
    email,
    displayName: '',
    photoURL: '',
    role,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    createdByUid: check.uid,
    lastLoginAt: null,
  });

  await db.collection('auditLog').add({
    type: 'user.create',
    actorUid: check.uid,
    targetId: ref.id,
    before: null,
    after: { email, role },
    at: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
