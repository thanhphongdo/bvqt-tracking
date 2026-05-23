'use client';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { RoomDialog } from './RoomDialog';
import { DutyRosterDialog } from './DutyRosterDialog';
import { toast } from 'sonner';
import type { RoomDocWithId } from '@/types/room';

async function toggleStatus(room: RoomDocWithId) {
  const { db } = getFirebaseClient();
  const newStatus = room.status === 'active' ? 'disabled' : 'active';
  try {
    await updateDoc(doc(db, 'rooms', room.id), { status: newStatus, updatedAt: serverTimestamp() });
    toast.success(newStatus === 'active' ? 'Đã kích hoạt' : 'Đã vô hiệu hóa');
  } catch (err) {
    toast.error((err as Error).message);
  }
}

export function RoomsTable({ rooms }: { rooms: RoomDocWithId[] }) {
  if (rooms.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">Chưa có phòng nào</p>;
  }

  return (
    <>
      {/* Mobile: card list */}
      <ul className="md:hidden divide-y divide-border/50">
        {rooms.map((r) => (
          <li key={r.id} className="px-4 py-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.function} · Cảnh báo {r.autoOutWarningMinutes}p</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {r.isRegistrationCounter && (
                  <Badge variant="secondary" className="text-xs">Đăng ký</Badge>
                )}
                <Badge variant={r.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {r.status}
                </Badge>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <RoomDialog room={r} trigger={<Button variant="outline" size="sm" className="h-7 text-xs px-2">Sửa</Button>} />
              <DutyRosterDialog room={r} trigger={<Button variant="outline" size="sm" className="h-7 text-xs px-2">Trực</Button>} />
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => toggleStatus(r)}>
                {r.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Chức năng</TableHead>
              <TableHead>Quầy đăng ký?</TableHead>
              <TableHead>Cảnh báo (phút)</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.function}</TableCell>
                <TableCell>{r.isRegistrationCounter ? 'Có' : 'Không'}</TableCell>
                <TableCell>{r.autoOutWarningMinutes}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <RoomDialog room={r} trigger={<Button variant="outline" size="sm">Sửa</Button>} />
                  <DutyRosterDialog room={r} trigger={<Button variant="outline" size="sm">Trực</Button>} />
                  <Button variant="ghost" size="sm" onClick={() => toggleStatus(r)}>
                    {r.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
