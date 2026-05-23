'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { UserActionsMenu } from './UserActionsMenu';
import type { UserDocWithId } from '@/types/user';

export function UsersTable({ users }: { users: UserDocWithId[] }) {
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">Chưa có user nào</p>;
  }

  return (
    <>
      {/* Mobile: card list */}
      <ul className="md:hidden divide-y divide-border/50">
        {users.map((u) => (
          <li key={u.id} className="flex items-start gap-3 px-4 py-3">
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-sm font-medium truncate">{u.email}</p>
              {u.displayName && (
                <p className="text-xs text-muted-foreground">{u.displayName}</p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                <Badge variant={u.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                  {u.status}
                </Badge>
              </div>
            </div>
            <UserActionsMenu user={u} />
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden md:block">
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
                <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                <TableCell>
                  <Badge variant={u.status === 'active' ? 'default' : 'destructive'}>{u.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{u.uid ?? '(chưa login)'}</TableCell>
                <TableCell className="text-right"><UserActionsMenu user={u} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
