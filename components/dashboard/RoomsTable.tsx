'use client';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
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
  return (
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
              <DutyRosterDialog
                room={r}
                trigger={<Button variant="outline" size="sm">Trực</Button>}
              />
              <Button variant="ghost" size="sm" onClick={() => toggleStatus(r)}>
                {r.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {rooms.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Chưa có phòng nào
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
