# BVQT Tracking — Design Spec

**Date:** 2026-05-23
**Author:** phongdo.sw2@gmail.com (initial admin)
**Status:** Approved for implementation planning

## 1. Goal

Web app theo dõi luồng khám bệnh tại bệnh viện Nguyễn Thị Thập. Cho phép quét barcode trên sổ khám của bệnh nhân tại mỗi phòng để đo:

- Thời gian chờ từ khi lấy sổ đến khi vào phòng đầu tiên.
- Thời gian khám tại mỗi phòng.
- Thời gian chờ giữa các phòng (ra phòng A → vào phòng B).
- Tổng thời gian một lượt khám.

Dashboard tổng hợp thống kê và phát hiện bottleneck, có quản lý nhân viên/phòng và phân quyền chặt.

## 2. Constraints

- **Zero cost:** Chạy hoàn toàn trên free tier (Vercel Hobby + Firebase Spark). Không cần thẻ tín dụng.
- **Mobile-first:** Staff dùng điện thoại để quét; UI tối ưu mobile.
- **Online-only:** Giả định bệnh viện có wifi/4G ổn định. PWA installable nhưng không cần offline sync.
- **Stack cố định:** Next.js, Tailwind, shadcn/ui, Firestore, Google Auth.

## 3. Architecture Overview

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind + shadcn/ui, mobile-first |
| PWA | Manifest + minimal service worker (installable) |
| Auth | Firebase Auth, Google provider only |
| DB | Firestore (asia-southeast1) |
| Barcode scanner | `@zxing/browser` (Code 128, QR, EAN) |
| Hosting | Vercel (Hobby plan) |
| Background jobs | **None** — warnings tính real-time client-side; cleanup dùng Firestore TTL |
| Backup | Manual CSV export trong dashboard |

### 3.1 Routes

- `/` — Home. Login Google + 2 CTA (Tracking / Dashboard).
- `/tracking` — Staff (yêu cầu role `staff`+).
- `/dashboard` — Overview (role `manager`+).
- `/dashboard/visits` — List & detail visits.
- `/dashboard/analytics` — Statistics & charts.
- `/dashboard/warnings` — Open warnings + error log.
- `/dashboard/rooms` — Room management (role `manager`+).
- `/dashboard/users` — User management (role `admin` only).
- `/dashboard/audit` — Audit log (role `admin` only).

### 3.2 Server endpoints (Next.js API routes, Firebase Admin SDK)

- `POST /api/auth/verify` — Verify ID token, lookup `users/{uid}`, bootstrap admin nếu email khớp `INITIAL_ADMIN_EMAIL`, set custom claims.
- `POST /api/admin/users` — Admin tạo user mới bằng email (whitelist).
- `PATCH /api/admin/users/:uid` — Đổi role / status; re-set custom claims.
- `GET /api/export/visits.csv` — Manager+ export filtered visits as CSV.

## 4. Data Model (Firestore)

### 4.1 Collections

```
/users/{docId}                        // docId = auto-generated; uid và email là fields
  uid: string | null                  // Firebase Auth uid; null cho đến khi user login lần đầu
  email: string                       // primary identifier; admin tạo trước bằng email (unique)
  displayName: string                 // từ Google profile, fill khi login đầu
  photoURL: string
  role: 'admin' | 'manager' | 'staff'
  status: 'active' | 'disabled'
  createdAt: Timestamp
  createdByUid: string | null         // uid của admin đã tạo, null cho bootstrap admin
  lastLoginAt: Timestamp | null

/rooms/{roomId}
  name: string                        // "Phòng khám 2", "Quầy đăng ký"
  function: string                    // "registration" | "general" | "xray" | "lab" | ...
  isRegistrationCounter: boolean      // true => action mặc định là 'registered'
  status: 'active' | 'disabled'
  autoOutWarningMinutes: number       // default 30, manager edit được
  createdAt, updatedAt: Timestamp

/rooms/{roomId}/duty/{YYYY-MM-DD}
  staffUids: string[]                 // optional, nhiều người trực 1 phòng/ngày

/visits/{visitId}                     // visitId = `${YYYY-MM-DD}_${code}`
  code: string                        // mã barcode (string, không có constraint format)
  date: 'YYYY-MM-DD'                  // local date VN
  registeredAt: Timestamp             // mốc bắt đầu tính chờ
  registeredByUid: string
  currentRoomId: string | null        // null = đang chờ giữa phòng / chưa vào phòng nào
  currentRoomInAt: Timestamp | null   // để tính warning threshold
  lastEventAt: Timestamp
  status: 'active' | 'closed'
  hasError: boolean                   // true => loại khỏi thống kê
  errorCount: number
  expiresAt: Timestamp                // registeredAt + 67 ngày, dùng cho Firestore TTL

/visits/{visitId}/events/{eventId}    // auto-id, sorted by timestamp
  type: 'registered' | 'room_in' | 'room_out'
  roomId: string | null               // null cho 'registered'
  roomNameSnapshot: string | null
  timestamp: Timestamp                // serverTimestamp() khi tạo
  staffUid: string
  staffEmailSnapshot: string
  isInferred: boolean                 // true nếu auto-tạo OUT vì staff quên
  isManuallyEdited: boolean
  hasError: boolean                   // true nếu isInferred (zero-duration)
  editHistory: Array<{
    at: Timestamp
    byUid: string
    before: { type, roomId, timestamp }
    after:  { type, roomId, timestamp }
    reason: string
  }>
  expiresAt: Timestamp                // = visit.expiresAt (TTL trên subcollection riêng)

/auditLog/{logId}                     // ghi từ server (Admin SDK) chỉ
  type: 'user.create' | 'user.update' | 'role.change' | 'room.create' | 'room.update' | 'room.disable' | ...
  actorUid: string
  targetId: string
  before: object | null
  after: object | null
  at: Timestamp
```

### 4.2 Quy tắc data

- `visitId = ${date}_${code}` đảm bảo unique trong ngày; code trùng ở ngày khác → coi như visit mới.
- **Snapshot fields** (`roomNameSnapshot`, `staffEmailSnapshot`) — chống đổi tên/disable user làm hỏng dữ liệu cũ.
- **`currentRoomId` denormalized** trên visit doc — tránh phải query events mỗi lần scan.
- **UI hiển thị `code`**, không hiển thị `visitId` cho user cuối.

### 4.3 Visit creation

Visit doc được tạo lúc scan đầu tiên cho cặp `(date, code)`:

- **Scan `registered`** (ở quầy đăng ký, phòng có `isRegistrationCounter=true`) → tạo visit với `registeredAt = serverTimestamp()`, tạo event `registered`. Đây là path bình thường.
- **Scan `room_in`** mà visit chưa tồn tại → tạo visit nhưng:
  - `registeredAt = serverTimestamp()` (không có mốc trước đó).
  - `hasError = true`, `errorCount = 1`.
  - Tạo event `room_in` với `hasError = true`, lý do "no prior registration".
  - Lý do: chấp nhận để không cản trở luồng làm việc, nhưng visit này bị loại khỏi stats vì thiếu mốc.
- **Scan `room_out`** mà visit chưa tồn tại → reject, hiện lỗi "Bệnh nhân chưa được ghi nhận vào". Không tự tạo visit.

### 4.4 Auto-out inference (staff quên scan OUT)

Khi staff scan IN ở phòng B trong khi `visit.currentRoomId === A` (A ≠ B), trong cùng 1 Firestore batch:

1. Tạo event `room_out` ở phòng A với:
   - `timestamp = visit.currentRoomInAt` (zero duration)
   - `isInferred = true`
   - `hasError = true`
2. Tạo event `room_in` ở phòng B bình thường.
3. Update visit:
   - `currentRoomId = B`
   - `currentRoomInAt = now`
   - `hasError = true`
   - `errorCount += 1`

Thống kê loại các event/visit có `hasError = true`. Tab "Data lỗi" trong dashboard hiển thị riêng + thông tin staff để manager nhắc nhở.

### 4.5 Edit window (staff sửa scan của mình)

- Staff sửa event của chính họ chỉ trong **36h** kể từ `event.timestamp` (cover today + yesterday).
- Manager+ sửa bất cứ lúc nào (trong window data retention).
- Mọi edit append vào `event.editHistory`, kèm `reason` (required).
- Manager+ thao tác trên user/room ghi vào `/auditLog`.

### 4.6 Retention với Firestore TTL

- `visit.expiresAt = registeredAt + 67 days`; event subcollection set field giống.
- Bật TTL policy trong Firebase Console:
  - Collection `visits`, field `expiresAt`
  - Collection group `events`, field `expiresAt`
- Firestore tự xoá doc trong 24h sau khi `expiresAt` qua.
- **Backup banner:** Dashboard hiện banner top khi có visits với `expiresAt - now < 7 days`: "Có N lượt khám sẽ tự xoá trong 7 ngày tới — [Tải CSV ngay]". Click → download CSV. Manager có thể export bất kỳ lúc nào qua `/dashboard/visits` filter + Export.

## 5. Roles & Auth

### 5.1 3 roles

| Role | Tracking | Dashboard | Rooms CRUD | Users CRUD | Audit log |
|---|---|---|---|---|---|
| `admin` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `manager` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `staff` | ✓ | ✗ | ✗ | ✗ | ✗ |

### 5.2 Auth flow

1. User vào trang → bấm "Login với Google".
2. Firebase Auth popup → trả ID token + uid.
3. Client gọi `POST /api/auth/verify` gửi ID token.
4. Server (Firebase Admin):
   - Verify token → ra `uid`, `email`.
   - Query `users` where `email == <email>` (limit 1).
   - Nếu không thấy + email === `INITIAL_ADMIN_EMAIL` → tạo doc mới (auto-id) với `uid, email, role='admin', status='active'`.
   - Nếu không thấy + email !== `INITIAL_ADMIN_EMAIL` → return 403.
   - Nếu thấy nhưng `status === 'disabled'` → return 403.
   - Nếu thấy + `uid == null` → update doc set `uid, displayName, photoURL, lastLoginAt`.
   - Nếu thấy + `uid` đã set + khớp → chỉ update `lastLoginAt, displayName, photoURL`.
   - Nếu thấy + `uid` set nhưng khác `request uid` → conflict (email reuse); admin can't happen vì email unique trong users → return 409.
   - Set Firebase Auth custom claims `{ role }` cho uid (qua `admin.auth().setCustomUserClaims(uid, {role})`).
   - Return `{ role, displayName, ... }`.
5. Client `getIdToken(true)` force-refresh để pickup custom claims → Firestore rules dùng được ngay.
6. Khi admin đổi role → server re-set custom claims; client cần re-login hoặc force-refresh token.

### 5.3 Firestore security rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
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

    match /visits/{visitId} {
      allow read: if isStaffPlus();
      allow create, update: if isStaffPlus();
      allow delete: if isAdmin();

      match /events/{eventId} {
        allow read: if isStaffPlus();
        allow create: if isStaffPlus();
        allow update: if isManagerPlus()
          || (resource.data.staffUid == request.auth.uid
              && resource.data.timestamp > request.time - duration.value(36, 'h'));
        allow delete: if isAdmin();
      }
    }

    match /auditLog/{id} {
      allow read: if isAdmin();
      allow write: if false; // chỉ Admin SDK server-side ghi
    }
  }
}
```

## 6. Tracking Page Flow (Staff)

### 6.1 Layout (mobile-first)

```
┌─────────────────────────────┐
│ [☰]  Tracking    [user▾]    │
├─────────────────────────────┤
│ Phòng hiện tại: Phòng khám 2│
│ [Đổi phòng]                  │
│                              │
│   ┌─────────────────────┐   │
│   │   📷 CAMERA VIEW    │   │
│   └─────────────────────┘   │
│                              │
│ Vừa quét: Code 12345678     │
│ Suggest: VÀO phòng           │
│ [ VÀO ] [ RA ]  [ Gửi ]     │
│                              │
│ [Lịch sử (7 ngày)] [Cảnh báo]│
└─────────────────────────────┘
```

### 6.2 Flow chi tiết

1. **Lần đầu vào trang:** modal bắt buộc chọn phòng từ `rooms` (status=active). Lưu `currentRoomId` vào `localStorage`. Lần sau skip step này, có nút "Đổi phòng" để reset.
2. **Camera mở** sau khi đã chọn phòng (cần user gesture trên iOS Safari → nút "Bắt đầu quét" lần đầu).
3. **Quét được code** → camera tạm dừng → hiện code + suggest IN/OUT.
4. **Auto-detect logic:**
   - Nếu phòng đã chọn có `isRegistrationCounter === true` → suggest `registered`.
   - Nếu `visit.currentRoomId === phòng hiện tại` → suggest `OUT`.
   - Còn lại → suggest `IN`.
5. **Override:** Staff có thể bấm IN hoặc OUT để đổi.
6. **Submit** → 1 transaction:
   - Nếu action=IN và `visit.currentRoomId != null && != phòng hiện tại` → auto-out inference (xem 4.3).
   - Tạo event mới.
   - Update visit denormalized fields.
7. **Sau submit:** toast "Đã ghi nhận" → camera bật lại sau 1s, sẵn sàng quét tiếp.
8. **Fallback nhập tay** (desktop / camera lỗi): input text + Enter để nhập code thủ công.

### 6.3 Tab "Lịch sử (7 ngày)"

- Bảng scans của chính staff: ngày, giờ, code, phòng, type, error flag.
- Nút "Sửa" enable cho events trong 36h (today + yesterday).
- Modal sửa: đổi type IN/OUT hoặc timestamp; field "Lý do" required; append vào `editHistory`.

### 6.4 Tab "Cảnh báo"

- Real-time Firestore listener:
  ```
  query(visits, where('currentRoomId', '!=', null), where('hasError', '==', false))
  ```
- Filter client-side: visits có phòng trùng các phòng staff đã scan hôm nay, và `now - currentRoomInAt > room.autoOutWarningMinutes`.
- Component re-render mỗi 30s để re-evaluate ngưỡng.
- Tap warning → modal: "Ghi nhận OUT bây giờ" hoặc "Đánh dấu đã out vào HH:MM" (cho phép sửa timestamp).

## 7. Dashboard

### 7.1 `/dashboard` Overview

- KPI cards: Bệnh nhân hôm nay / Đang trong viện / TB thời gian khám hôm nay / Cảnh báo chưa xử lý.
- Live view: real-time danh sách bệnh nhân đang ở từng phòng.
- Bar chart: số bệnh nhân theo giờ trong ngày.

### 7.2 `/dashboard/visits`

- Filter: date range (default 7 ngày, max 60 ngày), code, phòng đã ghé, hasError.
- Bảng: Code | Ngày | Bắt đầu | Kết thúc | Tổng | Số phòng | Lỗi.
- Click row → detail: timeline ngang với events là chấm trên trục thời gian, kèm tên phòng + duration giữa các event.
- Export CSV.

### 7.3 `/dashboard/analytics`

Filter chung: date range (max 60 ngày) + room multi-select.

**Core charts (theo yêu cầu user):**

1. Pie chart TB thời gian khám từng phòng — % thời gian mỗi phòng chiếm trong tổng.
2. Horizontal bar TB thời gian khám từng phòng — show side-by-side với pie.
3. Heatmap TB thời gian chờ giữa các phòng — ma trận từ→đến.
4. TB thời gian chờ từ registration → phòng đầu (KPI + histogram).
5. TB tổng thời gian 1 lượt khám (KPI + box plot theo ngày).

**Additional analytics:**

| Tính năng | Mô tả |
|---|---|
| Heatmap giờ × thứ trong tuần | Số bệnh nhân theo giờ × thứ — biết khung giờ peak |
| Bottleneck score | Combine "thời gian chờ vào" + "số người chờ" — xếp hạng phòng cần xử lý |
| Patient journey Sankey | Luồng phổ biến giữa các phòng |
| Phân bố thời gian khám/phòng | Box plot — phát hiện outlier |
| SLA breach alerts | Bệnh nhân chờ > X phút giữa 2 phòng → đếm vi phạm theo phòng |
| Room utilization % | % thời gian phòng có người trong giờ làm việc |
| Staff error rate | Số lỗi quên check-out / tổng scan của từng staff |
| Trend so sánh | Tuần này vs tuần trước cho mỗi KPI |
| Search by code | Gõ code → ra timeline đầy đủ của 1 visit |

**URL state sync:** Mọi filter sync vào URL params (`?from=2026-05-01&to=2026-05-23&rooms=R1,R2&hasError=false`) — share/bookmark được.

### 7.4 `/dashboard/warnings`

- Tab "Cảnh báo đang mở": visits có IN chưa OUT quá ngưỡng (real-time, computed client-side).
- Tab "Data lỗi": visits có `hasError=true` — show code, ngày, phòng lỗi, staff, isInferred. **Không tính vào thống kê.**
- Nút "Đánh dấu đã xử lý" + "Nhắc nhân viên" (in-app, chưa cần email).

### 7.5 `/dashboard/rooms` (Manager+)

- CRUD rooms: name, function, isRegistrationCounter, autoOutWarningMinutes.
- Disable thay vì xoá (giữ snapshot fields trong lịch sử).
- Tab "Phân công trực": chọn ngày + chọn staff trực phòng đó (multi-select, optional).

### 7.6 `/dashboard/users` (Admin only)

- Bảng users: email, name, role, status, lastLogin.
- Add user: nhập email → server tạo doc `users` (auto-id) với `email, role=staff, status=active, uid=null`. Lần đầu user đó login, server link `uid` vào doc đó (lookup by email).
- Edit: đổi role (re-set custom claims), disable/enable.

### 7.7 `/dashboard/audit` (Admin only)

- Mọi action ghi vào `/auditLog`: user.create, user.update, role.change, room.*, visit.delete.
- Filter theo actor, action type, date range.

## 8. Deployment & Infra Setup

### 8.1 Firebase project

1. Tạo Firebase project tại https://console.firebase.google.com.
2. Build → Firestore Database → Create → location `asia-southeast1`, mode Production.
3. Build → Authentication → Sign-in method → enable Google. Authorized domains: `localhost`, `*.vercel.app`, custom domain (sau).
4. Project Settings → Service accounts → Generate new private key → paste JSON vào env var `FIREBASE_ADMIN_SDK_JSON`.
5. Project Settings → Add app → Web → copy config thành `NEXT_PUBLIC_FIREBASE_*` env vars.
6. Build → Firestore Database → TTL → Add policy:
   - Collection `visits`, field `expiresAt`.
   - Collection group `events`, field `expiresAt`.

### 8.2 Vercel project

1. Push repo lên GitHub (`bvqt-tracking`).
2. Vercel → New Project → Import from GitHub.
3. Env vars (Production + Preview):
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   FIREBASE_ADMIN_SDK_JSON={"type":"service_account",...}
   INITIAL_ADMIN_EMAIL=phongdo.sw2@gmail.com
   ```
4. **Không** đặt cron jobs → tránh phát sinh phí.

### 8.3 Firestore rules & indexes deploy

- Cài `firebase-tools` global; `firebase init firestore`.
- Edit `firestore.rules` (Section 5.3).
- Composite indexes cần thiết (khai báo trong `firestore.indexes.json`):
  - `users` (email ASC) — single field, tự động bởi Firestore.
  - `visits` (date ASC, hasError ASC, lastEventAt DESC).
  - `visits` (currentRoomId ASC, currentRoomInAt ASC) — cho warning listener.
  - Collection group `events` (timestamp ASC).
- Deploy: `firebase deploy --only firestore:rules,firestore:indexes`.

### 8.4 `.gitignore`

```
.env*.local
serviceAccountKey.json
.firebase/
.next/
node_modules/
```

### 8.5 PWA

- `app/manifest.webmanifest` + icon 192/512.
- Minimal service worker (next-pwa hoặc tay) — cache shell, không cache Firestore data.
- "Add to Home Screen" hoạt động trên iOS Safari + Android Chrome.

## 9. Free-tier capacity check

**Ước tính quy mô:**
- 500 bệnh nhân/ngày × 5 events = 2,500 writes/ngày → trong giới hạn 20K writes/ngày.
- Manager dashboard listener + staff tracking = ~10K reads/ngày → trong 50K reads/ngày.
- TTL deletes ~2,500/ngày sau ngày thứ 67 → trong 20K deletes/ngày.
- Storage: 1 GB miễn phí — events nhỏ (< 500 bytes/doc) → dư xa.

Trade-off: nếu vượt ngưỡng, Firestore tự ngắt request → cần upgrade Blaze (pay-as-you-go) hoặc tối ưu reads.

## 10. Trade-offs

- **Không có background notification:** warnings chỉ tính khi user mở app. Acceptable vì manager mở dashboard liên tục giờ hành chính.
- **Auto-out inference có thể sai** nếu staff quét nhầm phòng (vd quét cho bệnh nhân chỉ đi ngang). Để giảm thiểu: UI hiện rõ suggest IN/OUT và current room của visit trước khi staff bấm "Gửi".
- **Edit window 36h** = "today + yesterday" theo server time. Đơn giản, không xét timezone phức tạp.
- **Không có Firebase Emulator phase 1** → dev và prod chia sẻ Firestore (hoặc tách Firebase project riêng cho dev nếu muốn).

## 11. Out of scope (phase 1)

- Email notifications (forgot OUT, daily summary).
- Multi-hospital / multi-tenant.
- Patient identity beyond barcode (no name, no demographics — privacy).
- Web push notifications.
- Offline data sync (chỉ PWA shell installable).
- Native mobile app.
- Firebase Cloud Messaging.

## 12. Future considerations

- Email alerts khi có nhiều warnings không xử lý (cần Blaze plan hoặc external SMTP).
- Daily/weekly summary report auto-generated.
- Integration với hệ thống HIS của bệnh viện (export API).
- Triage priority field cho visit (cấp cứu, ưu tiên).
