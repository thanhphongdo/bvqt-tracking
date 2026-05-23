'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useVisitsQuery } from '@/lib/dashboard/use-visits-query';
import { todayDateVN } from '@/lib/tracking/visit-id';
import { useWarnings } from '@/lib/tracking/use-warnings';
import { Card } from '@/components/ui/card';
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
import type { RoomDocWithId } from '@/types/room';

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </Card>
  );
}

function avgMinutesPerVisit(visits: VisitDocWithId[]) {
  if (visits.length === 0) return 0;
  const total = visits.reduce(
    (sum, v) => sum + (v.lastEventAt.toMillis() - v.registeredAt.toMillis()) / 60_000,
    0
  );
  return total / visits.length;
}

export default function OverviewPage() {
  const today = todayDateVN();
  const { visits } = useVisitsQuery({ from: today, to: today, limit: 2000 });
  const warnings = useWarnings();
  const [rooms, setRooms] = useState<Map<string, RoomDocWithId>>(new Map());

  useEffect(() => {
    const { db } = getFirebaseClient();
    const q = query(collection(db, 'rooms'), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => {
      const map = new Map<string, RoomDocWithId>();
      snap.docs.forEach((d) =>
        map.set(d.id, { id: d.id, ...(d.data() as Omit<RoomDocWithId, 'id'>) })
      );
      setRooms(map);
    });
    return unsub;
  }, []);

  const inHouse = visits.filter((v) => v.currentRoomId !== null);
  const inHouseByRoom = new Map<string, VisitDocWithId[]>();
  for (const v of inHouse) {
    if (!v.currentRoomId) continue;
    const arr = inHouseByRoom.get(v.currentRoomId) ?? [];
    arr.push(v);
    inHouseByRoom.set(v.currentRoomId, arr);
  }

  return (
    <div className="px-4 pb-4 md:px-6 md:pb-6 flex flex-col gap-4">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pb-4 border-b border-border/40 -mx-4 px-4 md:-mx-6 md:px-6 pt-4 md:pt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tổng quan — {today}</h1>
      </div>

      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard title="Bệnh nhân hôm nay" value={String(visits.length)} />
          <KpiCard title="Đang trong viện" value={String(inHouse.length)} />
          <KpiCard
            title="Thời gian khám trung bình mỗi lượt"
            value={`${Math.round(avgMinutesPerVisit(visits))} phút`}
          />
          <KpiCard
            title="Cảnh báo"
            value={String(warnings.length)}
            subtitle="chưa check-out quá ngưỡng"
          />
        </div>

        <Card className="p-4 rounded-xl">
          <h2 className="mb-3 text-sm font-semibold">Bệnh nhân đang ở từng phòng</h2>
          {inHouse.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có ai trong viện hiện tại.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phòng</TableHead>
                  <TableHead>Số bệnh nhân</TableHead>
                  <TableHead>Codes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(inHouseByRoom.entries()).map(([roomId, vs]) => (
                  <TableRow key={roomId}>
                    <TableCell>{rooms.get(roomId)?.name ?? roomId}</TableCell>
                    <TableCell>{vs.length}</TableCell>
                    <TableCell className="text-xs">
                      {vs.map((v) => (
                        <Badge key={v.id} variant="secondary" className="mr-1 font-mono">
                          {v.code}
                        </Badge>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
