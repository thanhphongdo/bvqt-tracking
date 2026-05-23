'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as fbLimit,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import type { VisitDocWithId } from '@/types/visit';

export interface VisitsFilter {
  /** YYYY-MM-DD inclusive */
  from: string;
  /** YYYY-MM-DD inclusive */
  to: string;
  code?: string;
  hasError?: 'all' | 'true' | 'false';
  /** Max docs returned (Firestore limit) */
  limit?: number;
}

export function useVisitsQuery(filter: VisitsFilter) {
  const [visits, setVisits] = useState<VisitDocWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memo the filter so reference changes don't re-subscribe on every render.
  const key = `${filter.from}|${filter.to}|${filter.code ?? ''}|${filter.hasError ?? 'all'}|${filter.limit ?? 500}`;

  useEffect(() => {
    setLoading(true);
    setError(null);
    const { db } = getFirebaseClient();
    const constraints = [
      where('date', '>=', filter.from),
      where('date', '<=', filter.to),
      orderBy('date', 'desc'),
      orderBy('lastEventAt', 'desc'),
      fbLimit(filter.limit ?? 500),
    ];
    if (filter.hasError === 'true' || filter.hasError === 'false') {
      // Need to be careful — Firestore requires the inequality fields be sorted first.
      // Using equality on hasError is fine alongside date range.
      constraints.unshift(where('hasError', '==', filter.hasError === 'true'));
    }
    const q = query(collection(db, 'visits'), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        let docs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<VisitDocWithId, 'id'>),
        }));
        if (filter.code) {
          const c = filter.code.toLowerCase();
          docs = docs.filter((v) => v.code.toLowerCase().includes(c));
        }
        setVisits(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useMemo(() => ({ visits, loading, error }), [visits, loading, error]);
}
