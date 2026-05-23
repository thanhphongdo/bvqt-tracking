import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { handleVerify, type VerifyDeps } from '@/lib/server/verify-handler';
import type { UserRole } from '@/types/user';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  if (!idToken) return NextResponse.json({ error: 'missing token' }, { status: 401 });

  const { auth, db } = getFirebaseAdmin();

  const deps: VerifyDeps = {
    verifyIdToken: async (token) => {
      const d = await auth.verifyIdToken(token);
      return { uid: d.uid, email: d.email ?? '', name: d.name, picture: d.picture };
    },
    findUserByEmail: async (email) => {
      const snap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid ?? null,
        email: data.email,
        role: data.role as UserRole,
        status: data.status as 'active' | 'disabled',
      };
    },
    createUser: async (data) => {
      const ref = await db.collection('users').add({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        createdByUid: null,
        lastLoginAt: FieldValue.serverTimestamp(),
      });
      return ref.id;
    },
    updateUserOnLogin: async (id, data) => {
      await db.collection('users').doc(id).update({
        ...data,
        lastLoginAt: FieldValue.serverTimestamp(),
      });
    },
    setCustomClaims: async (uid, claims) => {
      await auth.setCustomUserClaims(uid, claims);
    },
    initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL ?? '',
  };

  const result = await handleVerify(idToken, deps);
  return NextResponse.json(result.body ?? {}, { status: result.status });
}
