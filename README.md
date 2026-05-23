# BVQT Tracking

Hospital patient flow tracking — bệnh viện Nguyễn Thị Thập.

Web app cho nhân viên y tế quét barcode trên sổ khám của bệnh nhân tại mỗi phòng, đo thời gian chờ/khám, và hiển thị thống kê trên dashboard.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind v4** + **shadcn/ui** (base-nova style, BaseUI primitives)
- **Firebase Auth** (Google) + **Firestore** (asia-southeast1)
- **react-hook-form + zod** for forms
- **Vitest** + **@testing-library/react** for tests
- Deployed on **Vercel Hobby** + **Firebase Spark** — $0/month

See full design in [docs/superpowers/specs/2026-05-23-bvqt-tracking-design.md](docs/superpowers/specs/2026-05-23-bvqt-tracking-design.md).

## Local development

### One-time setup

1. Create Firebase project (https://console.firebase.google.com).
2. Enable **Authentication → Google** sign-in.
3. Create **Firestore Database** (location `asia-southeast1`, Production mode).
4. Project Settings → Add Web App → copy `firebaseConfig` (6 keys).
5. Project Settings → Service accounts → Generate new private key → save JSON.
6. Copy env template and fill values:

   ```bash
   cp .env.local.example .env.local
   # Edit .env.local — paste service account JSON as one line into FIREBASE_ADMIN_SDK_JSON
   ```

7. Install Firebase CLI and link this repo to the project:

   ```bash
   pnpm dlx firebase-tools login
   # Replace REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID in .firebaserc with your projectId
   pnpm dlx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```

### Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

### First login

Sign in with the email set in `INITIAL_ADMIN_EMAIL` (default `phongdo.sw2@gmail.com`). The server bootstraps that account as `admin` automatically. From the dashboard you can then invite other users (manager / staff) by email.

## Tests

```bash
pnpm test           # one-shot
pnpm test:watch     # watch mode
```

## Deploy to Vercel

1. Push to GitHub:

   ```bash
   gh repo create bvqt-tracking --private --source=. --remote=origin --push
   ```

2. https://vercel.com/new → import the repo. Framework auto-detected.
3. **Environment Variables** (Production + Preview + Development) — copy from `.env.local`:

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

4. After first deploy, copy the assigned `*.vercel.app` domain into Firebase Console → Authentication → Settings → Authorized domains.
5. Re-deploy if needed; smoke test by signing in.

**Cost note:** no Vercel Cron / Firebase Functions in Plan 1. Warning notifications (forgot check-out) are computed client-side in Plan 2. Data retention uses Firestore TTL (free). Plan stays on Vercel Hobby + Firebase Spark.

## Roadmap

- **Plan 1 (this branch):** Foundation + Auth + Users/Rooms CRUD ✅
- **Plan 2:** Tracking page — barcode scan, visit creation, IN/OUT events, auto-inference, staff history + edit window
- **Plan 3:** Dashboard analytics (KPIs, charts, heatmaps, Sankey), visits list & detail, warnings, CSV export
- **Plan 4:** PWA, Firestore TTL setup, audit log UI, duty rosters, polish

See [docs/superpowers/plans/](docs/superpowers/plans/).

## Project rules

See [AGENTS.md](AGENTS.md) for code/UI conventions enforced in this repo (componentize aggressively, react-hook-form + zod, Tailwind tokens, etc.).
