#!/usr/bin/env node
/**
 * Seed sample data into Firestore for testing.
 *
 * Behavior:
 * - Idempotent rooms: creates a base room set only if user has < 3 rooms.
 * - Generates 100 visits spread over the past 14 days.
 * - Each visit has realistic events (registered → IN/OUT through 2-4 rooms).
 * - ~85% complete, ~10% still in-house, ~5% with auto-inferred OUT (errors).
 *
 * Run:  node scripts/seed-sample-data.mjs
 * Reads FIREBASE_ADMIN_SDK_JSON from .env.local.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import bwipjs from 'bwip-js';

// --- env load
function loadEnv() {
  try {
    const txt = readFileSync('.env.local', 'utf-8');
    for (const line of txt.split('\n')) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx < 0) continue;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    console.error('.env.local not found');
    process.exit(1);
  }
}
loadEnv();

const sa = JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON);
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
  });
}
const db = getFirestore();

// --- helpers
const RETENTION_DAYS = 67;
const VN_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

function dateStrVN(d) {
  // Returns 'YYYY-MM-DD' in Asia/Ho_Chi_Minh
  const local = new Date(d.getTime() + VN_TZ_OFFSET_MS);
  return local.toISOString().slice(0, 10);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const BASE_ROOMS = [
  { name: 'Quầy đăng ký', function: 'registration', isRegistrationCounter: true, autoOutWarningMinutes: 15 },
  { name: 'Phòng khám tổng quát', function: 'general', isRegistrationCounter: false, autoOutWarningMinutes: 30 },
  { name: 'Phòng X-quang', function: 'xray', isRegistrationCounter: false, autoOutWarningMinutes: 45 },
  { name: 'Phòng xét nghiệm', function: 'lab', isRegistrationCounter: false, autoOutWarningMinutes: 30 },
  { name: 'Phòng cấp thuốc', function: 'pharmacy', isRegistrationCounter: false, autoOutWarningMinutes: 20 },
];

async function ensureRooms() {
  const snap = await db.collection('rooms').get();
  if (snap.size >= 3) {
    console.log(`Rooms: keeping existing ${snap.size} rooms`);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  console.log('Rooms: seeding base set');
  const created = [];
  for (const r of BASE_ROOMS) {
    const ref = await db.collection('rooms').add({
      ...r,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    created.push({ id: ref.id, ...r, status: 'active' });
  }
  return created;
}

async function seedVisits(rooms) {
  const reg = rooms.find((r) => r.isRegistrationCounter);
  const others = rooms.filter((r) => !r.isRegistrationCounter && r.status === 'active');
  if (others.length === 0) throw new Error('No non-registration rooms');

  const codes = [];
  for (let i = 1; i <= 100; i++) {
    codes.push(String(10000000 + i)); // 10000001 - 10000100
  }

  const STAFF_UID = 'seed-script-staff';
  const STAFF_EMAIL = 'seed@local';

  const now = Date.now();
  let nDone = 0, nInHouse = 0, nError = 0;
  const batch = [];

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    // Distribute across 14 days
    const daysAgo = randInt(0, 13);
    const baseTime = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    // Random hour 7am-4pm VN
    baseTime.setHours(7 + Math.floor(Math.random() * 9));
    baseTime.setMinutes(randInt(0, 59));
    baseTime.setSeconds(0);
    const date = dateStrVN(baseTime);
    const visitId = `${date}_${code}`;

    // Decide outcome
    const roll = Math.random();
    const outcome = roll < 0.05 ? 'error' : roll < 0.15 ? 'in_house' : 'done';

    // Pick 2-4 rooms (subset of others) in random order
    const roomCount = randInt(2, Math.min(4, others.length));
    const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, roomCount);

    let currentTime = baseTime.getTime();
    const events = [];
    const expiresAt = Timestamp.fromMillis(currentTime + RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const registeredAt = Timestamp.fromMillis(currentTime);

    // registered event
    if (reg) {
      events.push({
        type: 'registered',
        roomId: null,
        roomNameSnapshot: null,
        timestamp: Timestamp.fromMillis(currentTime),
        isInferred: false,
        isManuallyEdited: false,
        hasError: false,
        editHistory: [],
        expiresAt,
      });
    }

    // wait 5-25 min before first room
    currentTime += randInt(5, 25) * 60 * 1000;

    let currentRoomId = null;
    let currentRoomInAt = null;
    let hasError = false;
    let errorCount = 0;

    for (let j = 0; j < shuffled.length; j++) {
      const r = shuffled[j];
      const isLast = j === shuffled.length - 1;

      // room_in
      events.push({
        type: 'room_in',
        roomId: r.id,
        roomNameSnapshot: r.name,
        timestamp: Timestamp.fromMillis(currentTime),
        isInferred: false,
        isManuallyEdited: false,
        hasError: false,
        editHistory: [],
        expiresAt,
      });
      currentRoomId = r.id;
      currentRoomInAt = Timestamp.fromMillis(currentTime);

      // Stay 5-40 min
      const stayMin = randInt(5, 40);
      currentTime += stayMin * 60 * 1000;

      // For 'error' case, on the LAST room, simulate forgot OUT (no OUT event, hasError flag)
      if (outcome === 'error' && isLast) {
        // Insert an inferred OUT at the same time as IN (zero duration), flagged
        events.push({
          type: 'room_out',
          roomId: r.id,
          roomNameSnapshot: r.name,
          timestamp: currentRoomInAt, // zero duration
          isInferred: true,
          isManuallyEdited: false,
          hasError: true,
          editHistory: [],
          expiresAt,
        });
        hasError = true;
        errorCount += 1;
        // After inferred OUT, currentRoom resets to null
        currentRoomId = null;
        currentRoomInAt = null;
        break;
      }

      // For 'in_house' case, on the LAST room, skip OUT
      if (outcome === 'in_house' && isLast) {
        break;
      }

      // Otherwise, write OUT
      events.push({
        type: 'room_out',
        roomId: r.id,
        roomNameSnapshot: r.name,
        timestamp: Timestamp.fromMillis(currentTime),
        isInferred: false,
        isManuallyEdited: false,
        hasError: false,
        editHistory: [],
        expiresAt,
      });
      currentRoomId = null;
      currentRoomInAt = null;

      // Wait 3-15 min before next room
      if (!isLast) currentTime += randInt(3, 15) * 60 * 1000;
    }

    const lastEventAt = Timestamp.fromMillis(currentTime);

    // Stage visit doc
    const visitData = {
      code,
      date,
      registeredAt,
      registeredByUid: STAFF_UID,
      currentRoomId,
      currentRoomInAt,
      lastEventAt,
      status: outcome === 'in_house' ? 'active' : 'closed',
      hasError,
      errorCount,
      expiresAt,
    };

    batch.push({ visitId, visitData, events, staffUid: STAFF_UID, staffEmail: STAFF_EMAIL });

    if (outcome === 'done') nDone++;
    else if (outcome === 'in_house') nInHouse++;
    else nError++;
  }

  // Write in chunks (Firestore batch limit: 500 ops)
  console.log(`Writing ${batch.length} visits...`);
  for (const item of batch) {
    const b = db.batch();
    b.set(db.collection('visits').doc(item.visitId), item.visitData);
    for (const e of item.events) {
      const ref = db
        .collection('visits')
        .doc(item.visitId)
        .collection('events')
        .doc();
      b.set(ref, {
        ...e,
        staffUid: item.staffUid,
        staffEmailSnapshot: item.staffEmail,
      });
    }
    await b.commit();
  }

  console.log(
    `Seeded ${batch.length} visits: ${nDone} done, ${nInHouse} in-house, ${nError} with errors`
  );
  return codes;
}

async function generateBarcodesHtml(codes) {
  console.log('Generating barcode images...');
  const images = [];
  for (const code of codes) {
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: code,
      scale: 2,
      height: 14,
      includetext: true,
      textxalign: 'center',
      backgroundcolor: 'FFFFFF',
    });
    images.push({ code, dataUrl: `data:image/png;base64,${png.toString('base64')}` });
  }

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Sample barcodes (100 codes) — BVQ7 Tracking test</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; margin: 1rem; background: #f6f6f6; }
    h1 { font-size: 1.25rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; }
    .card { background: white; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; text-align: center; }
    img { max-width: 100%; height: auto; image-rendering: pixelated; }
    .code { font-family: ui-monospace, Menlo, monospace; font-size: 0.8rem; margin-top: 4px; }
    @media print {
      body { background: white; }
      .card { break-inside: avoid; border: 1px solid #999; }
    }
  </style>
</head>
<body>
  <h1>Sample barcodes — ${codes.length} codes (Code 128)</h1>
  <p style="font-size:0.85rem;color:#666;">
    In ra giấy hoặc mở trên màn hình khác, hướng camera tracking vào để quét.
    Có thể giữ điện thoại sát màn hình laptop hiển thị page này.
  </p>
  <div class="grid">
    ${images
      .map(
        ({ code, dataUrl }) => `<div class="card"><img src="${dataUrl}" alt="${code}"><div class="code">${code}</div></div>`
      )
      .join('\n')}
  </div>
</body>
</html>`;

  const out = 'sample-barcodes.html';
  writeFileSync(out, html);
  console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
  console.log(`Open in browser: file://${process.cwd()}/${out}`);
}

const rooms = await ensureRooms();
const codes = await seedVisits(rooms);
await generateBarcodesHtml(codes);

console.log('\n✓ Seed complete');
console.log('   - 100 sample visits across the past 14 days');
console.log('   - sample-barcodes.html: open and scan to test tracking');
process.exit(0);
