'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import type { VisitDocWithId } from '@/types/visit';
import type { RoomDocWithId } from '@/types/room';

export interface Warning {
  visit: VisitDocWithId;
  room: RoomDocWithId | null;
  minutesIn: number;
  thresholdMinutes: number;
}

/**
 * Live-compute warnings: visits with currentRoomId set whose IN time
 * exceeds the room's autoOutWarningMinutes threshold.
 * Component re-renders every 30s to re-evaluate threshold.
 */
export function useWarnings(): Warning[] {
  const [visits, setVisits] = useState<VisitDocWithId[]>([]);
  const [rooms, setRooms] = useState<Map<string, RoomDocWithId>>(new Map());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const { db } = getFirebaseClient();
    const visitQ = query(collection(db, 'visits'), where('currentRoomId', '!=', null));
    const unsubV = onSnapshot(visitQ, (snap) => {
      setVisits(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VisitDocWithId, 'id'>) }))
      );
    });
    const unsubR = onSnapshot(collection(db, 'rooms'), (snap) => {
      const map = new Map<string, RoomDocWithId>();
      snap.docs.forEach((d) =>
        map.set(d.id, { id: d.id, ...(d.data() as Omit<RoomDocWithId, 'id'>) })
      );
      setRooms(map);
    });
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      unsubV();
      unsubR();
      clearInterval(tick);
    };
  }, []);

  const warnings: Warning[] = [];
  for (const v of visits) {
    if (!v.currentRoomId || !v.currentRoomInAt) continue;
    const room = rooms.get(v.currentRoomId);
    const threshold = room?.autoOutWarningMinutes ?? 30;
    const minutesIn = (now - v.currentRoomInAt.toMillis()) / 60_000;
    if (minutesIn > threshold) {
      warnings.push({
        visit: v,
        room: room ?? null,
        minutesIn,
        thresholdMinutes: threshold,
      });
    }
  }
  return warnings.sort((a, b) => b.minutesIn - a.minutesIn);
}
