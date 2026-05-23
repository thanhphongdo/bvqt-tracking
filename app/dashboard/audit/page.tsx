'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-context';
import { isAdmin } from '@/lib/role';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Timestamp } from 'firebase/firestore';

interface AuditEntry {
  id: string;
  type: string;
  actorUid: string;
  targetId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  at: Timestamp;
}

function formatVN(ts: Timestamp) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(ts.toDate());
}

export default function AuditPage() {
  const { role, loading } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (loading || !isAdmin(role)) return;
    const { db } = getFirebaseClient();
    const q = query(collection(db, 'auditLog'), orderBy('at', 'desc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      setEntries(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditEntry, 'id'>) }))
      );
      setLogsLoading(false);
    });
    return unsub;
  }, [loading, role]);

  if (loading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  if (!isAdmin(role)) redirect('/dashboard');

  return (
    <div className="px-4 pb-4 md:px-6 md:pb-6 flex flex-col h-full overflow-hidden gap-4 pt-4 md:pt-6">
      {/* Top Header Section (Stationary) */}
      <div className="space-y-1 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-xs text-muted-foreground">200 entries gần nhất.</p>
      </div>

      {/* Scrollable Table Area */}
      <div className="flex-1 overflow-auto min-h-0 border border-border/60 rounded-xl bg-card shadow-xs relative">
        {logsLoading ? (
          <p className="text-sm text-muted-foreground animate-pulse p-4">Đang tải log...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">Chưa có log nào.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Thay đổi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{formatVN(e.at)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{e.type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.actorUid}</TableCell>
                  <TableCell className="font-mono text-xs">{e.targetId}</TableCell>
                  <TableCell className="text-xs">
                    {e.before && (
                      <div>
                        <span className="text-muted-foreground">Trước:</span>{' '}
                        <code>{JSON.stringify(e.before)}</code>
                      </div>
                    )}
                    {e.after && (
                      <div>
                        <span className="text-muted-foreground">Sau:</span>{' '}
                        <code>{JSON.stringify(e.after)}</code>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
