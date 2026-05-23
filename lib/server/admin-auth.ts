import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

type AdminCheck =
  | { ok: true; uid: string }
  | { ok: false; res: NextResponse };

export async function requireAdmin(req: Request): Promise<AdminCheck> {
  const authHeader = req.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  if (!idToken) {
    return { ok: false, res: NextResponse.json({ error: 'missing token' }, { status: 401 }) };
  }
  const { auth } = getFirebaseAdmin();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    return { ok: false, res: NextResponse.json({ error: 'invalid token' }, { status: 401 }) };
  }
  if (decoded.role !== 'admin') {
    return { ok: false, res: NextResponse.json({ error: 'admin only' }, { status: 403 }) };
  }
  return { ok: true, uid: decoded.uid };
}
