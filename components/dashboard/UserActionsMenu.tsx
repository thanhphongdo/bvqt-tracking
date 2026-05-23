'use client';

import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { MoreHorizontal } from 'lucide-react';
import type { UserDocWithId, UserRole, UserStatus } from '@/types/user';

export function UserActionsMenu({ user }: { user: UserDocWithId }) {
  async function patch(payload: { role?: UserRole; status?: UserStatus }) {
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      toast.success('Đã cập nhật');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Tác vụ" />}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={user.role === 'admin'} onClick={() => patch({ role: 'admin' })}>
          Đặt admin
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={user.role === 'manager'}
          onClick={() => patch({ role: 'manager' })}
        >
          Đặt manager
        </DropdownMenuItem>
        <DropdownMenuItem disabled={user.role === 'staff'} onClick={() => patch({ role: 'staff' })}>
          Đặt staff
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.status === 'active' ? (
          <DropdownMenuItem
            onClick={() => patch({ status: 'disabled' })}
            className="text-destructive"
          >
            Vô hiệu hóa
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => patch({ status: 'active' })}>
            Kích hoạt lại
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
