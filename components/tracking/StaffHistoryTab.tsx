'use client';

import { useEffect, useState } from 'react';
import {
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EditEventDialog } from './EditEventDialog';
import type { VisitEventDocWithId } from '@/types/event';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const EDIT_WINDOW_MS = 36 * 60 * 60 * 1000;

function formatVN(ts: Timestamp) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(ts.toDate());
}

const TYPE_LABEL: Record<string, string> = {
  registered: 'Đăng ký',
  room_in: 'Vào phòng',
  room_out: 'Ra phòng',
};

export function StaffHistoryTab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<VisitEventDocWithId[]>([]);
  const [editing, setEditing] = useState<VisitEventDocWithId | null>(null);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebaseClient();
    const cutoff = Timestamp.fromMillis(Date.now() - SEVEN_DAYS_MS);
    const q = query(
      collectionGroup(db, 'events'),
      where('staffUid', '==', user.uid),
      where('timestamp', '>', cutoff),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setEvents(
        snap.docs.map((d) => ({
          id: d.id,
          visitId: d.ref.parent.parent!.id,
          ...(d.data() as Omit<VisitEventDocWithId, 'id' | 'visitId'>),
        }))
      );
    });
    return unsub;
  }, [user]);

  function canEdit(e: VisitEventDocWithId) {
    return e.timestamp.toMillis() > Date.now() - EDIT_WINDOW_MS;
  }

  return (
    <div className="w-full max-w-3xl">
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có scan nào trong 7 ngày qua.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Mã</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Phòng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((e) => (
              <TableRow key={`${e.visitId}-${e.id}`}>
                <TableCell className="text-xs">{formatVN(e.timestamp)}</TableCell>
                <TableCell className="font-mono text-xs">{e.visitId.split('_')[1]}</TableCell>
                <TableCell>{TYPE_LABEL[e.type]}</TableCell>
                <TableCell className="text-xs">{e.roomNameSnapshot ?? '—'}</TableCell>
                <TableCell>
                  {e.hasError && <Badge variant="destructive">Lỗi</Badge>}
                  {e.isInferred && <Badge variant="secondary">Auto-out</Badge>}
                  {e.isManuallyEdited && <Badge variant="secondary">Đã sửa</Badge>}
                </TableCell>
                <TableCell>
                  {canEdit(e) && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(e)}>
                      Sửa
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {editing && (
        <EditEventDialog
          event={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
