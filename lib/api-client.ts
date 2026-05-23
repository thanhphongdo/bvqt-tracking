import { getFirebaseClient } from './firebase/client';

async function getAuthHeader(): Promise<HeadersInit> {
  const { auth } = getFirebaseClient();
  const user = auth.currentUser;
  if (!user) return {};
  const idToken = await user.getIdToken();
  return { Authorization: `Bearer ${idToken}` };
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const authHeader = await getAuthHeader();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}
