'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download } from 'lucide-react';
import { visitsToCsv, downloadCsv } from '@/lib/dashboard/csv';
import type { VisitDocWithId } from '@/types/visit';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Banner shown when there are visits expiring within 7 days (TTL retention boundary).
 * Lets manager download the affected visits as CSV before they're auto-deleted by Firestore TTL.
 */
export function RetentionBanner() {
  const [expiring, setExpiring] = useState<VisitDocWithId[]>([]);

  useEffect(() => {
    const { db } = getFirebaseClient();
    const threshold = Timestamp.fromMillis(Date.now() + SEVEN_DAYS_MS);
    const q = query(
      collection(db, 'visits'),
      where('expiresAt', '<=', threshold),
      orderBy('expiresAt', 'asc'),
      limit(500)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setExpiring(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<VisitDocWithId, 'id'>),
          }))
        );
      },
      () => {
        // ignore — old visits without expiresAt won't match; banner just stays hidden
      }
    );
    return unsub;
  }, []);

  if (expiring.length === 0) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
      <div className="flex-1">
        <p className="font-medium">
          {expiring.length} lượt khám sẽ tự xoá trong vòng 7 ngày tới
        </p>
        <p className="text-xs text-muted-foreground">
          Firestore TTL sẽ xoá khi đến hạn — tải CSV để giữ bản sao trước khi mất.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          downloadCsv(
            `expiring-visits-${new Date().toISOString().slice(0, 10)}.csv`,
            visitsToCsv(expiring)
          )
        }
      >
        <Download className="mr-2 size-4" />
        Tải CSV
      </Button>
    </div>
  );
}
