'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserActionsMenu } from './UserActionsMenu';
import type { UserDocWithId } from '@/types/user';

export function UsersTable({ users }: { users: UserDocWithId[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Tên</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>UID liên kết</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>{u.email}</TableCell>
            <TableCell>{u.displayName || '—'}</TableCell>
            <TableCell>
              <Badge variant="secondary">{u.role}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={u.status === 'active' ? 'default' : 'destructive'}>
                {u.status}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {u.uid ?? '(chưa login)'}
            </TableCell>
            <TableCell className="text-right">
              <UserActionsMenu user={u} />
            </TableCell>
          </TableRow>
        ))}
        {users.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Chưa có user nào
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
