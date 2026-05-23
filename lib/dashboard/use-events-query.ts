'use client';

import { useEffect, useState } from 'react';
import {
  collectionGroup,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import type { VisitEventDocWithId } from '@/types/event';
import { Timestamp } from 'firebase/firestore';

export interface EventsFilter {
  /** YYYY-MM-DD inclusive */
  from: string;
  /** YYYY-MM-DD inclusive */
  to: string;
}

/**
 * One-shot fetch of all events (collection group) whose timestamp is in [from, to].
 * Suitable for analytics: max ~60 days × 500 patients × 5 events ≈ 150K — limit ranges accordingly.
 */
export function useEventsQuery(filter: EventsFilter) {
  const [events, setEvents] = useState<VisitEventDocWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const { db } = getFirebaseClient();
    const fromTs = Timestamp.fromDate(new Date(filter.from + 'T00:00:00+07:00'));
    const toTs = Timestamp.fromDate(new Date(filter.to + 'T23:59:59+07:00'));
    const q = query(
      collectionGroup(db, 'events'),
      where('timestamp', '>=', fromTs),
      where('timestamp', '<=', toTs),
      orderBy('timestamp', 'asc')
    );
    getDocs(q)
      .then((snap) => {
        setEvents(
          snap.docs.map((d) => ({
            id: d.id,
            visitId: d.ref.parent.parent!.id,
            ...(d.data() as Omit<VisitEventDocWithId, 'id' | 'visitId'>),
          }))
        );
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [filter.from, filter.to]);

  return { events, loading, error };
}
