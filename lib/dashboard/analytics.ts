import type { VisitEventDocWithId } from '@/types/event';
import type { VisitDocWithId } from '@/types/visit';

export interface RoomDurationStats {
  roomId: string;
  roomName: string;
  totalMinutes: number;
  visitCount: number;
  avgMinutes: number;
}

export interface RoomTransitionStats {
  fromRoomId: string;
  toRoomId: string;
  fromRoomName: string;
  toRoomName: string;
  avgWaitMinutes: number;
  count: number;
}

/**
 * Group events by visitId then walk pairs to compute per-room time spent.
 * Skips events with hasError=true.
 */
export function computeRoomDurations(events: VisitEventDocWithId[]): RoomDurationStats[] {
  const byVisit = new Map<string, VisitEventDocWithId[]>();
  for (const e of events) {
    if (e.hasError) continue;
    const arr = byVisit.get(e.visitId) ?? [];
    arr.push(e);
    byVisit.set(e.visitId, arr);
  }

  const roomTotals = new Map<string, { name: string; totalMin: number; visits: Set<string> }>();
  for (const [visitId, arr] of byVisit) {
    const sorted = [...arr].sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
    // Pair each room_in with the next room_out for that room.
    const stack = new Map<string, VisitEventDocWithId>();
    for (const e of sorted) {
      if (e.type === 'room_in' && e.roomId) {
        stack.set(e.roomId, e);
      } else if (e.type === 'room_out' && e.roomId) {
        const inEvt = stack.get(e.roomId);
        if (inEvt) {
          const min = (e.timestamp.toMillis() - inEvt.timestamp.toMillis()) / 60_000;
          const key = e.roomId;
          const r = roomTotals.get(key) ?? {
            name: e.roomNameSnapshot ?? key,
            totalMin: 0,
            visits: new Set<string>(),
          };
          r.totalMin += min;
          r.visits.add(visitId);
          roomTotals.set(key, r);
          stack.delete(e.roomId);
        }
      }
    }
  }

  return Array.from(roomTotals.entries())
    .map(([roomId, v]) => ({
      roomId,
      roomName: v.name,
      totalMinutes: v.totalMin,
      visitCount: v.visits.size,
      avgMinutes: v.visits.size ? v.totalMin / v.visits.size : 0,
    }))
    .sort((a, b) => b.avgMinutes - a.avgMinutes);
}

/**
 * For each (fromRoom → toRoom) transition, average the wait time between OUT(from) and IN(to).
 */
export function computeTransitions(events: VisitEventDocWithId[]): RoomTransitionStats[] {
  const byVisit = new Map<string, VisitEventDocWithId[]>();
  for (const e of events) {
    if (e.hasError) continue;
    const arr = byVisit.get(e.visitId) ?? [];
    arr.push(e);
    byVisit.set(e.visitId, arr);
  }

  const tt = new Map<string, { from: string; to: string; fromName: string; toName: string; sum: number; count: number }>();
  for (const arr of byVisit.values()) {
    const sorted = [...arr].sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
    let lastOut: VisitEventDocWithId | null = null;
    for (const e of sorted) {
      if (e.type === 'room_out' && e.roomId) {
        lastOut = e;
      } else if (e.type === 'room_in' && e.roomId && lastOut && lastOut.roomId) {
        const wait = (e.timestamp.toMillis() - lastOut.timestamp.toMillis()) / 60_000;
        const key = `${lastOut.roomId}|${e.roomId}`;
        const r = tt.get(key) ?? {
          from: lastOut.roomId,
          to: e.roomId,
          fromName: lastOut.roomNameSnapshot ?? lastOut.roomId,
          toName: e.roomNameSnapshot ?? e.roomId,
          sum: 0,
          count: 0,
        };
        r.sum += wait;
        r.count += 1;
        tt.set(key, r);
        lastOut = null;
      }
    }
  }

  return Array.from(tt.values())
    .map((v) => ({
      fromRoomId: v.from,
      toRoomId: v.to,
      fromRoomName: v.fromName,
      toRoomName: v.toName,
      avgWaitMinutes: v.count ? v.sum / v.count : 0,
      count: v.count,
    }))
    .sort((a, b) => b.avgWaitMinutes - a.avgWaitMinutes);
}

/** Per-visit total duration (registeredAt → lastEventAt). */
export function computeVisitDurations(visits: VisitDocWithId[]): number[] {
  return visits
    .filter((v) => !v.hasError)
    .map((v) => (v.lastEventAt.toMillis() - v.registeredAt.toMillis()) / 60_000);
}

/** Histogram of patient registration counts by hour of day. */
export function computeHourlyCounts(visits: VisitDocWithId[]): { hour: number; count: number }[] {
  const counts = new Array(24).fill(0) as number[];
  for (const v of visits) {
    const h = new Date(v.registeredAt.toMillis()).getHours();
    counts[h] += 1;
  }
  return counts.map((c, h) => ({ hour: h, count: c }));
}

/** Time from registeredAt to first room_in (per visit). */
export function computeRegistrationToFirstRoom(
  events: VisitEventDocWithId[],
  visits: VisitDocWithId[]
): number[] {
  const eventsByVisit = new Map<string, VisitEventDocWithId[]>();
  for (const e of events) {
    if (e.hasError) continue;
    const arr = eventsByVisit.get(e.visitId) ?? [];
    arr.push(e);
    eventsByVisit.set(e.visitId, arr);
  }
  const out: number[] = [];
  for (const v of visits) {
    if (v.hasError) continue;
    const arr = eventsByVisit.get(v.id);
    if (!arr) continue;
    const firstIn = [...arr]
      .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())
      .find((e) => e.type === 'room_in');
    if (firstIn) {
      out.push((firstIn.timestamp.toMillis() - v.registeredAt.toMillis()) / 60_000);
    }
  }
  return out;
}

/** Average of an array. */
export function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, n) => s + n, 0) / arr.length;
}
