'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { VisitDocWithId } from '@/types/visit';
import { Timestamp } from 'firebase/firestore';

function formatVN(ts: Timestamp) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(ts.toDate());
}

function totalMinutes(v: VisitDocWithId): string {
  const start = v.registeredAt.toMillis();
  const end = v.lastEventAt.toMillis();
  const m = Math.round((end - start) / 60_000);
  if (m < 60) return `${m}p`;
  return `${Math.floor(m / 60)}g${m % 60}p`;
}

export function VisitsList({ visits }: { visits: VisitDocWithId[] }) {
  if (visits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Không có lượt khám nào.</p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Ngày</TableHead>
          <TableHead>Bắt đầu</TableHead>
          <TableHead>Kết thúc</TableHead>
          <TableHead>Tổng TG</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Phòng đang ở</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visits.map((v) => (
          <TableRow key={v.id}>
            <TableCell className="font-mono">
              <Link href={`/dashboard/visits/${v.id}`} className="hover:underline">
                {v.code}
              </Link>
            </TableCell>
            <TableCell>{v.date}</TableCell>
            <TableCell className="text-xs">{formatVN(v.registeredAt)}</TableCell>
            <TableCell className="text-xs">{formatVN(v.lastEventAt)}</TableCell>
            <TableCell>{totalMinutes(v)}</TableCell>
            <TableCell>
              {v.hasError ? (
                <Badge variant="destructive">Lỗi ({v.errorCount})</Badge>
              ) : (
                <Badge variant="default">OK</Badge>
              )}
            </TableCell>
            <TableCell className="text-xs">{v.currentRoomId ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
