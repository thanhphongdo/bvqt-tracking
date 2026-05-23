'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { makeVisitId } from './visit-id';
import type { VisitDocWithId } from '@/types/visit';

/**
 * Live-subscribe to a visit doc by (date, code).
 * Returns null while loading; { exists: false } when no doc; visit data otherwise.
 */
export function useVisit(date: string | null, code: string | null) {
  const [visit, setVisit] = useState<{ exists: boolean; data: VisitDocWithId | null } | null>(
    null
  );

  useEffect(() => {
    if (!date || !code) {
      setVisit(null);
      return;
    }
    const { db } = getFirebaseClient();
    const ref = doc(db, 'visits', makeVisitId(date, code));
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setVisit({
          exists: true,
          data: { id: snap.id, ...(snap.data() as Omit<VisitDocWithId, 'id'>) },
        });
      } else {
        setVisit({ exists: false, data: null });
      }
    });
    return unsub;
  }, [date, code]);

  return visit;
}
