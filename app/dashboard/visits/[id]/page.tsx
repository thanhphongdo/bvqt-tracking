'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { VisitDocWithId } from '@/types/visit';
import type { VisitEventDocWithId } from '@/types/event';
import { Timestamp } from 'firebase/firestore';

function formatVN(ts: Timestamp) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(ts.toDate());
}

function diffMinutes(a: Timestamp, b: Timestamp) {
  return Math.round((b.toMillis() - a.toMillis()) / 60_000);
}

const TYPE_LABEL: Record<string, string> = {
  registered: 'Đăng ký',
  room_in: 'Vào phòng',
  room_out: 'Ra phòng',
};

const TYPE_COLOR: Record<string, string> = {
  registered: 'bg-blue-500',
  room_in: 'bg-emerald-500',
  room_out: 'bg-amber-500',
};

export default function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [visit, setVisit] = useState<VisitDocWithId | null>(null);
  const [events, setEvents] = useState<VisitEventDocWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { db } = getFirebaseClient();
    const unsubV = onSnapshot(doc(db, 'visits', id), (snap) => {
      if (snap.exists()) {
        setVisit({ id: snap.id, ...(snap.data() as Omit<VisitDocWithId, 'id'>) });
      } else {
        setVisit(null);
      }
      setLoading(false);
    });
    const eventsQ = query(
      collection(db, 'visits', id, 'events'),
      orderBy('timestamp', 'asc')
    );
    const unsubE = onSnapshot(eventsQ, (snap) => {
      setEvents(
        snap.docs.map((d) => ({
          id: d.id,
          visitId: id,
          ...(d.data() as Omit<VisitEventDocWithId, 'id' | 'visitId'>),
        }))
      );
    });
    return () => {
      unsubV();
      unsubE();
    };
  }, [id]);

  if (loading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  if (!visit) return <p className="text-sm text-destructive">Không tìm thấy lượt khám này.</p>;

  return (
    <div className="space-y-4">
      <Link href="/dashboard/visits" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        <ArrowLeft className="mr-1 size-4" />
        Quay lại
      </Link>

      <div>
        <h1 className="text-2xl font-semibold font-mono">{visit.code}</h1>
        <p className="text-sm text-muted-foreground">
          Ngày {visit.date} · {visit.hasError && <Badge variant="destructive">Có lỗi ({visit.errorCount})</Badge>}{' '}
          {visit.currentRoomId && (
            <Badge variant="secondary">Đang ở: {visit.currentRoomId}</Badge>
          )}
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
        <ol className="space-y-3">
          {events.map((e, i) => {
            const prev = events[i - 1];
            const gap = prev ? diffMinutes(prev.timestamp, e.timestamp) : null;
            return (
              <li key={e.id} className="flex items-start gap-3">
                <span
                  className={`mt-1.5 inline-block size-3 shrink-0 rounded-full ${TYPE_COLOR[e.type]}`}
                />
                <div className="flex-1">
                  <p className="text-sm">
                    <strong>{TYPE_LABEL[e.type]}</strong>
                    {e.roomNameSnapshot && <> — {e.roomNameSnapshot}</>}
                    {gap !== null && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (+{gap}p sau event trước)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatVN(e.timestamp)} · {e.staffEmailSnapshot}
                    {e.isInferred && ' · auto-out'}
                    {e.isManuallyEdited && ' · đã sửa'}
                    {e.hasError && ' · LỖI'}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
