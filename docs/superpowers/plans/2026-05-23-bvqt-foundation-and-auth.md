# BVQT Tracking — Plan 1: Foundation & Auth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Next.js + Firebase foundation with Google authentication, role-based access (admin/manager/staff), and CRUD pages for users and rooms. After this plan, an admin can log in, invite users by email, and manage rooms. Tracking & dashboard analytics come in subsequent plans.

**Architecture:** Next.js 15 App Router with TypeScript + Tailwind + shadcn/ui. Firebase Auth (Google) + Firestore for data. Custom claims set server-side via Firebase Admin SDK after `/api/auth/verify` validates the user's email against the `users` whitelist. Bootstrap admin via `INITIAL_ADMIN_EMAIL` env var.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v3, shadcn/ui, Firebase JS SDK v10+, firebase-admin v12+, Vitest for unit tests, pnpm.

**Reference spec:** [docs/superpowers/specs/2026-05-23-bvqt-tracking-design.md](../specs/2026-05-23-bvqt-tracking-design.md)

---

## Pre-flight checklist (do BEFORE Task 1)

The engineer must complete these manual setup steps in Firebase Console and have credentials ready:

1. Tạo Firebase project tại https://console.firebase.google.com (name: `bvqt-tracking` hoặc tuỳ).
2. Firestore Database → Create database → location `asia-southeast1` → Production mode.
3. Authentication → Sign-in method → enable **Google** → set support email.
4. Authentication → Settings → Authorized domains → đảm bảo có `localhost` (mặc định đã có).
5. Project Settings → General → Your apps → Add app → Web → đặt tên app → **copy `firebaseConfig` object** (6 fields: apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
6. Project Settings → Service accounts → Generate new private key → tải về file JSON → **copy nội dung file** (sẽ paste vào `.env.local` ở Task 5).
7. Có sẵn 1 tài khoản Google `phongdo.sw2@gmail.com` để test login.

---

## File structure (created across all tasks)

```
bvqt-tracking/
├── app/
│   ├── layout.tsx                       # Root layout + AuthProvider
│   ├── page.tsx                         # Home: login + 2 CTAs
│   ├── globals.css                      # Tailwind
│   ├── not-authorized/page.tsx          # 403 landing
│   ├── api/
│   │   ├── auth/verify/route.ts         # POST: token → role
│   │   └── admin/
│   │       └── users/
│   │           ├── route.ts             # GET list, POST create
│   │           └── [id]/route.ts        # PATCH update
│   ├── dashboard/
│   │   ├── layout.tsx                   # Sidebar + role gate
│   │   ├── page.tsx                     # Overview placeholder
│   │   ├── users/page.tsx               # Admin: users CRUD
│   │   └── rooms/page.tsx               # Manager+: rooms CRUD
│   └── tracking/page.tsx                # Placeholder (Plan 2)
├── lib/
│   ├── firebase/
│   │   ├── client.ts                    # Client SDK init
│   │   ├── admin.ts                     # Admin SDK singleton (server)
│   │   └── auth-context.tsx             # AuthProvider + useAuth()
│   ├── api-client.ts                    # fetch wrapper with ID token
│   └── role.ts                          # Pure role-check helpers (TDD'd)
├── components/
│   ├── ui/                              # shadcn primitives
│   ├── auth/
│   │   ├── GoogleSignInButton.tsx
│   │   └── RoleGate.tsx                 # client-side route gate
│   └── dashboard/
│       └── DashboardSidebar.tsx
├── types/
│   ├── user.ts
│   └── room.ts
├── tests/
│   ├── lib/role.test.ts
│   └── api/auth-verify.test.ts
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── .firebaserc
├── .env.local.example
├── .gitignore
├── components.json                      # shadcn config
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

---

## Task 1: Initialize Next.js project

**Files:**
- Create: entire `bvqt-tracking/` scaffold via `create-next-app`

- [ ] **Step 1: Run create-next-app**

```bash
cd /Users/spt/Documents/GitHub/bvqt-tracking
pnpm dlx create-next-app@latest . \
  --typescript --tailwind --eslint \
  --app --no-src-dir --import-alias "@/*" \
  --use-pnpm --turbopack --yes
```

If prompted about non-empty directory (because `.git` and `docs/` exist), confirm to continue — `create-next-app` only writes files that don't already exist, so existing `.git` and `docs/` are preserved.

- [ ] **Step 2: Verify dev server runs**

```bash
pnpm dev
```

Open http://localhost:3000 → should see the Next.js welcome page. Stop the server (Ctrl+C).

- [ ] **Step 3: Update `.gitignore`**

Append to `.gitignore`:

```
# Local env
.env*.local
serviceAccountKey.json

# Firebase
.firebase/
firebase-debug.log

# Vercel
.vercel
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

## Task 2: Install dependencies + Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `tests/setup.ts`

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add firebase firebase-admin lucide-react date-fns
```

- [ ] **Step 2: Install dev dependencies**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @types/node
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
});
```

- [ ] **Step 4: Create `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Add test script to `package.json`**

Edit `package.json` `"scripts"` to include:

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 6: Verify Vitest runs**

```bash
pnpm test
```

Expected: `No test files found` (passes because no tests yet).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add Firebase, Vitest, and core dependencies"
```

---

## Task 3: Initialize shadcn/ui

**Files:**
- Create: `components.json`, `components/ui/*` (button, dialog, input, label, select, table, toast, dropdown-menu, badge, card)

- [ ] **Step 1: Run shadcn init**

```bash
pnpm dlx shadcn@latest init -d
```

This creates `components.json`, updates `tailwind.config.ts`, and adds `app/globals.css` theme tokens. Accept defaults: Style "default", Base color "slate", CSS variables yes.

- [ ] **Step 2: Add required primitives**

```bash
pnpm dlx shadcn@latest add button dialog input label select table toast dropdown-menu badge card sonner
```

- [ ] **Step 3: Verify build still works**

```bash
pnpm build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: initialize shadcn/ui with required primitives"
```

---

## Task 4: Type definitions

**Files:**
- Create: `types/user.ts`, `types/room.ts`

- [ ] **Step 1: Create `types/user.ts`**

`UserRole` is defined here once, and `lib/role.ts` (next task) will import it. This avoids type duplication.

```typescript
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
  id: string; // Firestore doc id
}
```

- [ ] **Step 2: Create `types/room.ts`**

```typescript
import type { Timestamp } from 'firebase/firestore';

export type RoomStatus = 'active' | 'disabled';

export interface RoomDoc {
  name: string;
  function: string;
  isRegistrationCounter: boolean;
  status: RoomStatus;
  autoOutWarningMinutes: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RoomDocWithId extends RoomDoc {
  id: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add types/
git commit -m "feat: add User and Room type definitions"
```

---

## Task 5: Firebase client SDK + env config

**Files:**
- Create: `lib/firebase/client.ts`, `.env.local.example`, `.env.local` (gitignored)

- [ ] **Step 1: Create `.env.local.example`**

```bash
# Firebase Client (public — exposed to browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-only — full service account JSON as one line)
FIREBASE_ADMIN_SDK_JSON=

# Bootstrap admin email
INITIAL_ADMIN_EMAIL=phongdo.sw2@gmail.com
```

- [ ] **Step 2: Create `.env.local`**

Copy `.env.local.example` to `.env.local` and fill from Pre-flight step 5 (web config) and step 6 (service account JSON — paste entire JSON on one line, escape inner double-quotes if needed, or wrap in single quotes).

```bash
cp .env.local.example .env.local
# Then edit .env.local with actual values
```

- [ ] **Step 3: Create `lib/firebase/client.ts`**

```typescript
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export function getFirebaseClient() {
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app, auth, db };
}
```

- [ ] **Step 4: Commit**

```bash
git add .env.local.example lib/firebase/client.ts
git commit -m "feat: add Firebase client SDK initialization"
```

(`.env.local` is gitignored — verify with `git status`.)

---

## Task 6: Firebase Admin SDK + role helpers (TDD)

**Files:**
- Create: `lib/firebase/admin.ts`, `lib/role.ts`, `tests/lib/role.test.ts`

- [ ] **Step 1: Write failing test for role helpers**

Create `tests/lib/role.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test, verify it fails**

```bash
pnpm test
```

Expected: FAIL — cannot resolve `@/lib/role`.

- [ ] **Step 3: Implement `lib/role.ts`**

```typescript
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
```

- [ ] **Step 4: Run test, verify it passes**

```bash
pnpm test
```

Expected: 10 passing.

- [ ] **Step 5: Create `lib/firebase/admin.ts`**

```typescript
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

export function getFirebaseAdmin() {
  if (!app) {
    const existing = getApps()[0];
    if (existing) {
      app = existing;
    } else {
      const json = process.env.FIREBASE_ADMIN_SDK_JSON;
      if (!json) throw new Error('FIREBASE_ADMIN_SDK_JSON is not set');
      const credentials = JSON.parse(json);
      app = initializeApp({
        credential: cert({
          projectId: credentials.project_id,
          clientEmail: credentials.client_email,
          privateKey: credentials.private_key,
        }),
      });
    }
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  }
  return { app, auth: adminAuth!, db: adminDb! };
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/ tests/lib/
git commit -m "feat: add role helpers (TDD) and Firebase Admin SDK"
```

---

## Task 7: Auth context + API client

**Files:**
- Create: `lib/firebase/auth-context.tsx`, `lib/api-client.ts`

- [ ] **Step 1: Create `lib/firebase/auth-context.tsx`**

```typescript
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseClient } from './client';
import type { UserRole } from '@/lib/role';

interface AuthContextValue {
  user: FirebaseUser | null;
  role: UserRole | null;
  displayName: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = getFirebaseClient();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function verifyWithServer(fbUser: FirebaseUser) {
    const idToken = await fbUser.getIdToken();
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      setRole(null);
      setDisplayName(null);
      return;
    }
    const data = (await res.json()) as { role: UserRole; displayName: string };
    // Force-refresh ID token to pick up custom claims
    await fbUser.getIdToken(true);
    setRole(data.role);
    setDisplayName(data.displayName);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        await verifyWithServer(fbUser);
      } else {
        setRole(null);
        setDisplayName(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [auth]);

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function signOut() {
    await fbSignOut(auth);
  }

  async function refreshRole() {
    if (user) await verifyWithServer(user);
  }

  return (
    <AuthContext.Provider value={{ user, role, displayName, loading, signInWithGoogle, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Create `lib/api-client.ts`**

```typescript
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
```

- [ ] **Step 3: Wire `AuthProvider` into root layout**

Edit `app/layout.tsx` to wrap children with `AuthProvider` and add Sonner Toaster:

```typescript
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/firebase/auth-context';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'BVQT Tracking',
  description: 'Theo dõi luồng khám bệnh',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/ app/layout.tsx
git commit -m "feat: add auth context and API client"
```

---

## Task 8: Home page UI

**Files:**
- Create: `components/auth/GoogleSignInButton.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `components/auth/GoogleSignInButton.tsx`**

```typescript
'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function GoogleSignInButton() {
  const { signInWithGoogle, loading } = useAuth();

  async function handleClick() {
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error('Đăng nhập thất bại: ' + (err as Error).message);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} size="lg" className="w-full">
      Đăng nhập với Google
    </Button>
  );
}
```

- [ ] **Step 2: Replace `app/page.tsx`**

```typescript
'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/button';
import { isManagerPlus, isStaffPlus } from '@/lib/role';
import { redirect } from 'next/navigation';

export default function Home() {
  const { user, role, displayName, loading, signOut } = useAuth();

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center">Đang tải...</main>;
  }

  if (user && !role) {
    redirect('/not-authorized');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">BVQT Tracking</h1>
      <p className="text-sm text-muted-foreground">Theo dõi luồng khám bệnh</p>

      {!user ? (
        <div className="w-full max-w-xs">
          <GoogleSignInButton />
        </div>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <p className="text-center text-sm">Xin chào, <strong>{displayName}</strong> ({role})</p>
          {isStaffPlus(role) && (
            <Button asChild size="lg">
              <Link href="/tracking">Đi tới Tracking</Link>
            </Button>
          )}
          {isManagerPlus(role) && (
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard">Đi tới Dashboard</Link>
            </Button>
          )}
          <Button onClick={signOut} variant="ghost" size="sm">Đăng xuất</Button>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx components/auth/GoogleSignInButton.tsx
git commit -m "feat: add home page with Google sign-in and role-based CTAs"
```

---

## Task 9: Not-authorized page + tracking placeholder

**Files:**
- Create: `app/not-authorized/page.tsx`, `app/tracking/page.tsx`

- [ ] **Step 1: Create `app/not-authorized/page.tsx`**

```typescript
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/firebase/auth-context';

export default function NotAuthorizedPage() {
  const { signOut } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Chưa được cấp quyền</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        Tài khoản Google của bạn chưa được admin cấp quyền truy cập hệ thống. Vui lòng liên hệ admin để được thêm.
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/">Về trang chủ</Link>
        </Button>
        <Button onClick={signOut} variant="ghost">Đăng xuất</Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create `app/tracking/page.tsx` (placeholder for Plan 2)**

```typescript
'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { isStaffPlus } from '@/lib/role';
import { redirect } from 'next/navigation';

export default function TrackingPage() {
  const { role, loading } = useAuth();

  if (loading) return <main className="p-6">Đang tải...</main>;
  if (!isStaffPlus(role)) redirect('/not-authorized');

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Tracking (sẽ build ở Plan 2)</h1>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/not-authorized/ app/tracking/
git commit -m "feat: add not-authorized page and tracking placeholder"
```

---

## Task 10: `/api/auth/verify` endpoint (TDD)

**Files:**
- Create: `app/api/auth/verify/route.ts`, `tests/api/auth-verify.test.ts`, `lib/server/verify-handler.ts`

The route handler is thin; the testable logic lives in a pure function `handleVerify` that takes injected dependencies. This makes it unit-testable without spinning up Firebase.

- [ ] **Step 1: Write failing test**

Create `tests/api/auth-verify.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { handleVerify, type VerifyDeps } from '@/lib/server/verify-handler';

function makeDeps(overrides: Partial<VerifyDeps> = {}): VerifyDeps {
  return {
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'fbUid1', email: 'someone@example.com', name: 'Some One', picture: '' }),
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
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'adminUid', email: 'admin@example.com', name: 'Admin', picture: 'p.jpg' }),
    });
    const res = await handleVerify('valid-token', deps);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'admin', displayName: 'Admin' });
    expect(deps.createUser).toHaveBeenCalledWith(expect.objectContaining({
      uid: 'adminUid', email: 'admin@example.com', role: 'admin', status: 'active',
    }));
    expect(deps.setCustomClaims).toHaveBeenCalledWith('adminUid', { role: 'admin' });
  });

  it('links uid on existing user whose uid is null', async () => {
    const deps = makeDeps({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'newUid', email: 'staff@example.com', name: 'Staff One', picture: '' }),
      findUserByEmail: vi.fn().mockResolvedValue({
        id: 'doc1', uid: null, email: 'staff@example.com', role: 'staff', status: 'active',
      }),
    });
    const res = await handleVerify('valid-token', deps);
    expect(res.status).toBe(200);
    expect(deps.updateUserOnLogin).toHaveBeenCalledWith('doc1', expect.objectContaining({ uid: 'newUid' }));
    expect(deps.setCustomClaims).toHaveBeenCalledWith('newUid', { role: 'staff' });
  });

  it('returns 403 when user status is disabled', async () => {
    const deps = makeDeps({
      findUserByEmail: vi.fn().mockResolvedValue({
        id: 'doc1', uid: 'fbUid1', email: 'someone@example.com', role: 'staff', status: 'disabled',
      }),
    });
    const res = await handleVerify('valid-token', deps);
    expect(res.status).toBe(403);
  });

  it('returns 409 when uid in token does not match stored uid', async () => {
    const deps = makeDeps({
      findUserByEmail: vi.fn().mockResolvedValue({
        id: 'doc1', uid: 'otherUid', email: 'someone@example.com', role: 'staff', status: 'active',
      }),
    });
    const res = await handleVerify('valid-token', deps);
    expect(res.status).toBe(409);
  });

  it('updates lastLoginAt on existing user with matching uid', async () => {
    const deps = makeDeps({
      findUserByEmail: vi.fn().mockResolvedValue({
        id: 'doc1', uid: 'fbUid1', email: 'someone@example.com', role: 'manager', status: 'active',
      }),
    });
    const res = await handleVerify('valid-token', deps);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'manager', displayName: 'Some One' });
    expect(deps.updateUserOnLogin).toHaveBeenCalledWith('doc1', expect.objectContaining({ uid: 'fbUid1' }));
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
pnpm test tests/api/auth-verify.test.ts
```

Expected: FAIL — cannot resolve `@/lib/server/verify-handler`.

- [ ] **Step 3: Implement `lib/server/verify-handler.ts`**

```typescript
import type { UserRole } from '@/lib/role';

export interface VerifyDeps {
  verifyIdToken: (token: string) => Promise<{ uid: string; email: string; name?: string; picture?: string }>;
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
  updateUserOnLogin: (id: string, data: { uid: string; displayName: string; photoURL: string }) => Promise<void>;
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
      await deps.createUser({ uid, email, displayName: name, photoURL: picture, role: 'admin', status: 'active' });
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
```

- [ ] **Step 4: Run test, verify it passes**

```bash
pnpm test tests/api/auth-verify.test.ts
```

Expected: 6 passing.

- [ ] **Step 5: Create the actual route at `app/api/auth/verify/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { handleVerify, type VerifyDeps } from '@/lib/server/verify-handler';

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
        role: data.role,
        status: data.status,
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
```

- [ ] **Step 6: Manual smoke test**

```bash
pnpm dev
```

Open http://localhost:3000, click "Đăng nhập với Google", sign in with `phongdo.sw2@gmail.com`. Expected: redirect back to home, see "Xin chào, <name> (admin)" + 2 CTA buttons. Verify in Firebase Console → Firestore → `users` collection has 1 doc with `role: admin`, `uid: <your-uid>`.

If you see "Chưa được cấp quyền", check that `INITIAL_ADMIN_EMAIL` matches the Google email exactly.

- [ ] **Step 7: Commit**

```bash
git add app/api/ lib/server/ tests/api/
git commit -m "feat: implement auth verify endpoint with bootstrap admin (TDD)"
```

---

## Task 11: Firestore security rules + indexes deploy

**Files:**
- Create: `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`

- [ ] **Step 1: Install Firebase CLI globally (if not already)**

```bash
pnpm add -g firebase-tools
firebase --version    # verify v13+
firebase login
```

- [ ] **Step 2: Create `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

- [ ] **Step 3: Create `.firebaserc`**

Replace `<YOUR_PROJECT_ID>` with the projectId from your Firebase Console:

```json
{
  "projects": {
    "default": "<YOUR_PROJECT_ID>"
  }
}
```

- [ ] **Step 4: Create `firestore.rules`**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function role() { return request.auth.token.role; }
    function isAdmin()       { return isSignedIn() && role() == 'admin'; }
    function isManagerPlus() { return isSignedIn() && role() in ['admin', 'manager']; }
    function isStaffPlus()   { return isSignedIn() && role() in ['admin', 'manager', 'staff']; }

    match /users/{docId} {
      allow read: if isAdmin() || (isSignedIn() && resource.data.uid == request.auth.uid);
      allow write: if isAdmin();
    }

    match /rooms/{roomId} {
      allow read: if isStaffPlus();
      allow write: if isManagerPlus();
      match /duty/{date} {
        allow read: if isStaffPlus();
        allow write: if isManagerPlus();
      }
    }

    // Plan 2 will add /visits + events rules

    match /auditLog/{id} {
      allow read: if isAdmin();
      allow write: if false; // server-only via Admin SDK
    }
  }
}
```

- [ ] **Step 5: Create `firestore.indexes.json`**

```json
{
  "indexes": [
    {
      "collectionGroup": "rooms",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 6: Deploy rules + indexes**

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Expected: "Deploy complete!" with no errors.

- [ ] **Step 7: Manual verification**

Re-login the app (http://localhost:3000) — the admin user should still load. Open Firebase Console → Firestore → Rules tab → verify the published rules match `firestore.rules`.

- [ ] **Step 8: Commit**

```bash
git add firestore.rules firestore.indexes.json firebase.json .firebaserc
git commit -m "feat: add Firestore security rules and indexes (base)"
```

---

## Task 12: Dashboard layout + role gate

**Files:**
- Create: `components/auth/RoleGate.tsx`, `components/dashboard/DashboardSidebar.tsx`, `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`

- [ ] **Step 1: Create `components/auth/RoleGate.tsx`**

```typescript
'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { hasMinRole, type UserRole } from '@/lib/role';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export function RoleGate({ minRole, children }: { minRole: UserRole; children: ReactNode }) {
  const { role, loading, user } = useAuth();

  if (loading) {
    return <div className="p-6">Đang tải...</div>;
  }

  if (!user) {
    redirect('/');
  }

  if (!hasMinRole(role, minRole)) {
    redirect('/not-authorized');
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Create `components/dashboard/DashboardSidebar.tsx`**

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { isAdmin } from '@/lib/role';
import { LayoutDashboard, Users, Building2, BarChart3, AlertTriangle, LogOut, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem { href: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean; }

const items: NavItem[] = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/dashboard/visits', label: 'Bệnh nhân', icon: BarChart3 },
  { href: '/dashboard/analytics', label: 'Thống kê', icon: BarChart3 },
  { href: '/dashboard/warnings', label: 'Cảnh báo & Lỗi', icon: AlertTriangle },
  { href: '/dashboard/rooms', label: 'Phòng', icon: Building2 },
  { href: '/dashboard/users', label: 'Nhân viên', icon: Users, adminOnly: true },
  { href: '/dashboard/audit', label: 'Audit log', icon: ScrollText, adminOnly: true },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { role, signOut, displayName } = useAuth();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-muted/40 p-3">
      <div className="mb-4 px-2 text-sm font-semibold">BVQT Tracking</div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          if (item.adminOnly && !isAdmin(role)) return null;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted',
                active && 'bg-muted font-medium'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-2 border-t pt-2">
        <p className="px-2 py-1 text-xs text-muted-foreground">{displayName} ({role})</p>
        <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start">
          <LogOut className="mr-2 h-4 w-4" />Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create `app/dashboard/layout.tsx`**

```typescript
import { RoleGate } from '@/components/auth/RoleGate';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate minRole="manager">
      <div className="flex h-screen">
        <DashboardSidebar />
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </RoleGate>
  );
}
```

- [ ] **Step 4: Create `app/dashboard/page.tsx`**

```typescript
export default function DashboardOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Tổng quan</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dashboard analytics sẽ build ở Plan 3. Hiện tại bạn có thể truy cập <strong>Nhân viên</strong> và <strong>Phòng</strong> ở sidebar.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Manual smoke test**

Restart `pnpm dev`. Login admin → click "Đi tới Dashboard" → sidebar hiển thị, layout render. Click các link sidebar → trang chưa tồn tại sẽ 404 (sẽ build tasks tiếp theo).

- [ ] **Step 6: Commit**

```bash
git add components/auth/ components/dashboard/ app/dashboard/
git commit -m "feat: add dashboard layout with sidebar and role gate"
```

---

## Task 13: Users management — list page (read)

**Files:**
- Create: `app/dashboard/users/page.tsx`

- [ ] **Step 1: Create `app/dashboard/users/page.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-context';
import { isAdmin } from '@/lib/role';
import { redirect } from 'next/navigation';
import type { UserDocWithId } from '@/types/user';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function UsersPage() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserDocWithId[]>([]);
  const [loading, setLoading] = useState(true);

  if (!isAdmin(role)) redirect('/dashboard');

  useEffect(() => {
    const { db } = getFirebaseClient();
    const q = query(collection(db, 'users'), orderBy('email'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserDocWithId, 'id'>) })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nhân viên</h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>UID liên kết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.displayName || '—'}</TableCell>
                <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                <TableCell>
                  <Badge variant={u.status === 'active' ? 'default' : 'destructive'}>{u.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{u.uid ?? '(chưa login)'}</TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Chưa có user nào</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Restart dev → login admin → /dashboard/users → bảng hiện 1 row (chính admin).

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/users/
git commit -m "feat: add users list page (admin only)"
```

---

## Task 14: Create user API + UI

**Files:**
- Create: `app/api/admin/users/route.ts`, `components/dashboard/AddUserDialog.tsx`
- Modify: `app/dashboard/users/page.tsx`

- [ ] **Step 1: Create `app/api/admin/users/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import type { UserRole } from '@/lib/role';

export const runtime = 'nodejs';

async function requireAdmin(req: Request): Promise<{ ok: true; uid: string } | { ok: false; res: Response }> {
  const authHeader = req.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  if (!idToken) return { ok: false, res: NextResponse.json({ error: 'missing token' }, { status: 401 }) };
  const { auth } = getFirebaseAdmin();
  const decoded = await auth.verifyIdToken(idToken);
  if (decoded.role !== 'admin') {
    return { ok: false, res: NextResponse.json({ error: 'admin only' }, { status: 403 }) };
  }
  return { ok: true, uid: decoded.uid };
}

export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.res;

  const body = (await req.json()) as { email?: string; role?: UserRole };
  const email = body.email?.trim().toLowerCase();
  const role = body.role;

  if (!email || !email.includes('@')) return NextResponse.json({ error: 'invalid email' }, { status: 400 });
  if (!role || !['admin', 'manager', 'staff'].includes(role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }

  const { db } = getFirebaseAdmin();
  const existing = await db.collection('users').where('email', '==', email).limit(1).get();
  if (!existing.empty) return NextResponse.json({ error: 'email already exists' }, { status: 409 });

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
```

- [ ] **Step 2: Create `components/dashboard/AddUserDialog.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { UserRole } from '@/lib/role';

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ email, role }) });
      toast.success('Đã thêm user');
      setOpen(false);
      setEmail('');
      setRole('staff');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Thêm user</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Thêm nhân viên</DialogTitle>
            <DialogDescription>
              Nhập email Google của nhân viên. Họ sẽ login bằng Google và được liên kết tự động.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff (nhân viên y tế)</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>{submitting ? 'Đang thêm...' : 'Thêm'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wire `AddUserDialog` into users page**

Edit `app/dashboard/users/page.tsx` — replace the `<h1>` header section with:

```typescript
import { AddUserDialog } from '@/components/dashboard/AddUserDialog';
// ... existing imports ...

// Replace `<h1>...</h1>` line with:
<div className="flex items-center justify-between">
  <h1 className="text-2xl font-semibold">Nhân viên</h1>
  <AddUserDialog />
</div>
```

- [ ] **Step 4: Manual smoke test**

Login admin → /dashboard/users → click "Thêm user" → nhập email Google của 1 staff thật → submit. Verify: dòng mới hiện trong bảng (live update). Đăng xuất, login bằng email staff đó → verify dashboard route hiển thị "Chưa được cấp quyền" (vì role=staff không vào được dashboard) nhưng /tracking thì OK.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/ components/dashboard/AddUserDialog.tsx app/dashboard/users/page.tsx
git commit -m "feat: add create-user API and dialog (admin)"
```

---

## Task 15: Update user API + UI (change role / disable)

**Files:**
- Create: `app/api/admin/users/[id]/route.ts`, `components/dashboard/UserActionsMenu.tsx`
- Modify: `app/dashboard/users/page.tsx`

- [ ] **Step 1: Create `app/api/admin/users/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import type { UserRole, UserStatus } from '@/types/user';

export const runtime = 'nodejs';

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  if (!idToken) return { ok: false as const, res: NextResponse.json({ error: 'missing token' }, { status: 401 }) };
  const { auth } = getFirebaseAdmin();
  const decoded = await auth.verifyIdToken(idToken);
  if (decoded.role !== 'admin') return { ok: false as const, res: NextResponse.json({ error: 'admin only' }, { status: 403 }) };
  return { ok: true as const, uid: decoded.uid };
}

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
  if (body.role && ['admin', 'manager', 'staff'].includes(body.role)) update.role = body.role;
  if (body.status && ['active', 'disabled'].includes(body.status)) update.status = body.status;
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'no changes' }, { status: 400 });

  await ref.update(update);

  // Re-set custom claims if role changed and user already has uid
  if (update.role && before.uid) {
    await auth.setCustomUserClaims(before.uid, { role: update.role });
  }
  // Revoke session if disabled
  if (update.status === 'disabled' && before.uid) {
    await auth.revokeRefreshTokens(before.uid);
  }

  await db.collection('auditLog').add({
    type: 'user.update',
    actorUid: check.uid,
    targetId: id,
    before: { role: before.role, status: before.status },
    after: { role: update.role ?? before.role, status: update.status ?? before.status },
    at: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create `components/dashboard/UserActionsMenu.tsx`**

```typescript
'use client';

import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { MoreHorizontal } from 'lucide-react';
import type { UserDocWithId, UserRole, UserStatus } from '@/types/user';

export function UserActionsMenu({ user }: { user: UserDocWithId }) {
  async function patch(payload: { role?: UserRole; status?: UserStatus }) {
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      toast.success('Đã cập nhật');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={user.role === 'admin'} onClick={() => patch({ role: 'admin' })}>Đặt admin</DropdownMenuItem>
        <DropdownMenuItem disabled={user.role === 'manager'} onClick={() => patch({ role: 'manager' })}>Đặt manager</DropdownMenuItem>
        <DropdownMenuItem disabled={user.role === 'staff'} onClick={() => patch({ role: 'staff' })}>Đặt staff</DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.status === 'active' ? (
          <DropdownMenuItem onClick={() => patch({ status: 'disabled' })} className="text-destructive">Vô hiệu hóa</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => patch({ status: 'active' })}>Kích hoạt lại</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Add actions column to users table**

Edit `app/dashboard/users/page.tsx`:

```typescript
// Add import:
import { UserActionsMenu } from '@/components/dashboard/UserActionsMenu';

// Add new <TableHead> at end of header row:
<TableHead></TableHead>

// Add new <TableCell> at end of each body row:
<TableCell className="text-right"><UserActionsMenu user={u} /></TableCell>

// Update the empty-state row: colSpan from 5 to 6.
```

- [ ] **Step 4: Manual smoke test**

Login admin → users page → dropdown trên row staff vừa tạo → "Đặt manager" → toast success → role badge update live → staff user phải logout & login lại để custom claims refresh → giờ vào dashboard được. Test "Vô hiệu hóa" → user đó bị forced logout (revokeRefreshTokens) trong vòng tối đa 1h (Firebase Auth token expiry).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/users/ components/dashboard/UserActionsMenu.tsx app/dashboard/users/page.tsx
git commit -m "feat: add update-user API and actions menu (role/status)"
```

---

## Task 16: Rooms management (list + CRUD)

**Files:**
- Create: `app/dashboard/rooms/page.tsx`, `components/dashboard/RoomDialog.tsx`

- [ ] **Step 1: Create `components/dashboard/RoomDialog.tsx`**

This dialog handles both create and edit modes via a single `room?: RoomDocWithId` prop.

```typescript
'use client';

import { useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { RoomDocWithId } from '@/types/room';

export function RoomDialog({ room, trigger }: { room?: RoomDocWithId; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(room?.name ?? '');
  const [func, setFunc] = useState(room?.function ?? 'general');
  const [isReg, setIsReg] = useState(room?.isRegistrationCounter ?? false);
  const [warningMin, setWarningMin] = useState(room?.autoOutWarningMinutes ?? 30);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { db } = getFirebaseClient();
      const payload = {
        name: name.trim(),
        function: func.trim(),
        isRegistrationCounter: isReg,
        autoOutWarningMinutes: Number(warningMin),
        status: room?.status ?? 'active',
        updatedAt: serverTimestamp(),
      };
      if (room) {
        await updateDoc(doc(db, 'rooms', room.id), payload);
      } else {
        await addDoc(collection(db, 'rooms'), { ...payload, createdAt: serverTimestamp() });
      }
      toast.success(room ? 'Đã cập nhật phòng' : 'Đã tạo phòng');
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{room ? 'Sửa phòng' : 'Tạo phòng mới'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Tên phòng</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="function">Chức năng</Label>
              <Input id="function" value={func} onChange={(e) => setFunc(e.target.value)} placeholder="general, xray, lab, registration, ..." required />
            </div>
            <div className="flex items-center gap-2">
              <input id="isReg" type="checkbox" checked={isReg} onChange={(e) => setIsReg(e.target.checked)} />
              <Label htmlFor="isReg" className="cursor-pointer">Đây là quầy đăng ký (lấy sổ)</Label>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="warning">Cảnh báo quên check-out (phút)</Label>
              <Input id="warning" type="number" min={1} value={warningMin} onChange={(e) => setWarningMin(Number(e.target.value))} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `app/dashboard/rooms/page.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoomDialog } from '@/components/dashboard/RoomDialog';
import { toast } from 'sonner';
import type { RoomDocWithId } from '@/types/room';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomDocWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { db } = getFirebaseClient();
    const q = query(collection(db, 'rooms'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoomDocWithId, 'id'>) })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function toggleStatus(room: RoomDocWithId) {
    const { db } = getFirebaseClient();
    const newStatus = room.status === 'active' ? 'disabled' : 'active';
    try {
      await updateDoc(doc(db, 'rooms', room.id), { status: newStatus, updatedAt: serverTimestamp() });
      toast.success(newStatus === 'active' ? 'Đã kích hoạt' : 'Đã vô hiệu hóa');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Phòng</h1>
        <RoomDialog trigger={<Button>Tạo phòng</Button>} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Chức năng</TableHead>
              <TableHead>Quầy đăng ký?</TableHead>
              <TableHead>Cảnh báo (phút)</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.function}</TableCell>
                <TableCell>{r.isRegistrationCounter ? 'Có' : 'Không'}</TableCell>
                <TableCell>{r.autoOutWarningMinutes}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <RoomDialog room={r} trigger={<Button variant="outline" size="sm">Sửa</Button>} />
                  <Button variant="ghost" size="sm" onClick={() => toggleStatus(r)}>
                    {r.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rooms.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Chưa có phòng nào</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Login admin → /dashboard/rooms → tạo 3 phòng test:
- "Quầy đăng ký" / function `registration` / isRegistrationCounter ✓ / 30 min
- "Phòng khám 1" / function `general` / not registration / 30 min
- "Phòng X-quang" / function `xray` / not registration / 45 min

Verify: bảng update live, sửa được, vô hiệu hóa → status badge đổi.

Test as manager: logout → login với 1 manager user (tạo trước qua /dashboard/users) → vào /dashboard/rooms vẫn được. Test as staff: vào /dashboard/rooms → bị redirect /not-authorized (vì layout gate là manager+).

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/rooms/ components/dashboard/RoomDialog.tsx
git commit -m "feat: add rooms CRUD (manager+)"
```

---

## Task 17: Stub remaining dashboard pages (so sidebar links don't 404)

**Files:**
- Create: `app/dashboard/visits/page.tsx`, `app/dashboard/analytics/page.tsx`, `app/dashboard/warnings/page.tsx`, `app/dashboard/audit/page.tsx`

- [ ] **Step 1: Create stub for visits**

`app/dashboard/visits/page.tsx`:

```typescript
export default function VisitsPage() {
  return <div><h1 className="text-2xl font-semibold">Bệnh nhân</h1><p className="mt-2 text-sm text-muted-foreground">Sẽ build ở Plan 3.</p></div>;
}
```

- [ ] **Step 2: Create stub for analytics**

`app/dashboard/analytics/page.tsx`:

```typescript
export default function AnalyticsPage() {
  return <div><h1 className="text-2xl font-semibold">Thống kê</h1><p className="mt-2 text-sm text-muted-foreground">Sẽ build ở Plan 3.</p></div>;
}
```

- [ ] **Step 3: Create stub for warnings**

`app/dashboard/warnings/page.tsx`:

```typescript
export default function WarningsPage() {
  return <div><h1 className="text-2xl font-semibold">Cảnh báo & Lỗi</h1><p className="mt-2 text-sm text-muted-foreground">Sẽ build ở Plan 3.</p></div>;
}
```

- [ ] **Step 4: Create stub for audit log (admin)**

`app/dashboard/audit/page.tsx`:

```typescript
'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { isAdmin } from '@/lib/role';
import { redirect } from 'next/navigation';

export default function AuditPage() {
  const { role } = useAuth();
  if (!isAdmin(role)) redirect('/dashboard');
  return <div><h1 className="text-2xl font-semibold">Audit log</h1><p className="mt-2 text-sm text-muted-foreground">Sẽ build ở Plan 4.</p></div>;
}
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/visits/ app/dashboard/analytics/ app/dashboard/warnings/ app/dashboard/audit/
git commit -m "feat: stub remaining dashboard pages for later plans"
```

---

## Task 18: Deploy to Vercel

**Files:**
- Create: `README.md` (deployment notes)

- [ ] **Step 1: Verify build passes locally**

```bash
pnpm build
```

Expected: clean build. Fix any TypeScript errors before continuing.

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: all 16 tests passing (10 role + 6 auth-verify).

- [ ] **Step 3: Push to GitHub**

```bash
# If repo not yet on GitHub:
gh repo create bvqt-tracking --private --source=. --remote=origin --push
# Else:
git push origin main
```

- [ ] **Step 4: Import to Vercel**

In browser: https://vercel.com/new → import the `bvqt-tracking` GitHub repo. Framework preset will auto-detect Next.js.

- [ ] **Step 5: Set environment variables in Vercel**

In Project Settings → Environment Variables, add ALL keys from `.env.local` for the **Production**, **Preview**, and **Development** environments:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_ADMIN_SDK_JSON
INITIAL_ADMIN_EMAIL
```

For `FIREBASE_ADMIN_SDK_JSON`: paste the full service account JSON as one line. Vercel handles multi-line via newlines fine, but `JSON.parse()` in `admin.ts` needs valid JSON.

- [ ] **Step 6: Add Vercel domain to Firebase Authorized Domains**

Firebase Console → Authentication → Settings → Authorized domains → Add domain → paste the Vercel-assigned `<project>.vercel.app` URL.

- [ ] **Step 7: Trigger deploy**

Vercel auto-deploys on push. Wait for build to finish in Vercel dashboard.

- [ ] **Step 8: Production smoke test**

Open the deployed URL → login with `phongdo.sw2@gmail.com` → verify admin dashboard accessible → create a test user → verify Firestore updated. Check Vercel function logs for any errors.

- [ ] **Step 9: Write `README.md`**

```markdown
# BVQT Tracking

Hospital patient flow tracking — Nguyễn Thị Thập.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- Firebase Auth (Google) + Firestore
- Deployed on Vercel (Hobby), Firebase Spark (free tier)

## Local development

1. `cp .env.local.example .env.local` and fill from Firebase Console.
2. `pnpm install`
3. `pnpm dev` → http://localhost:3000

## Deployment

See [docs/superpowers/specs/2026-05-23-bvqt-tracking-design.md](docs/superpowers/specs/2026-05-23-bvqt-tracking-design.md) section 8.

To deploy Firestore rules/indexes after changes:

\`\`\`bash
firebase deploy --only firestore:rules,firestore:indexes
\`\`\`

## Tests

\`\`\`bash
pnpm test           # one-shot
pnpm test:watch     # watch mode
\`\`\`
```

- [ ] **Step 10: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and deploy instructions"
git push
```

---

## Acceptance criteria (Plan 1 done when ALL true)

- [ ] `pnpm test` passes (≥16 tests).
- [ ] `pnpm build` succeeds with no errors.
- [ ] Login với `INITIAL_ADMIN_EMAIL` → tự bootstrap thành admin → dashboard accessible.
- [ ] Admin add 1 user thường (role staff) → user đó login → vào /tracking được, /dashboard bị chặn.
- [ ] Admin promote user đó lên manager → user logout/login lại → vào /dashboard được.
- [ ] Admin tạo, sửa, vô hiệu hóa phòng → list update real-time.
- [ ] Disabled user không login lại được sau khi token cũ hết hạn (≤1h).
- [ ] Firestore rules deployed; reading `/users` without role claim returns permission denied.
- [ ] App deployed to Vercel, accessible at `*.vercel.app`, all flows above work in production.
- [ ] `auditLog` collection has entries for user.create + user.update actions.

---

## What this plan does NOT cover (next plans)

- **Plan 2:** Tracking page with barcode scanner, visit creation, IN/OUT events, auto-out inference, staff 7-day history, edit window, client-side warnings.
- **Plan 3:** Dashboard analytics (KPIs, charts, heatmaps, Sankey), visits list & detail timeline, warnings + error log pages, CSV export, URL state sync.
- **Plan 4:** PWA manifest + service worker, Firestore TTL setup, audit log UI, performance indexes, on-duty staff scheduling under rooms.
