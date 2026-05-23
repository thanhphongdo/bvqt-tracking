'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { isAdmin } from '@/lib/role';
import {
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  AlertTriangle,
  LogOut,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const items: NavItem[] = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/dashboard/visits', label: 'Bệnh nhân', icon: BarChart3 },
  { href: '/dashboard/analytics', label: 'Thống kê', icon: BarChart3 },
  { href: '/dashboard/warnings', label: 'Cảnh báo & Lỗi', icon: AlertTriangle },
  { href: '/dashboard/rooms', label: 'Phòng', icon: Building2 },
  { href: '/dashboard/users', label: 'Nhân viên', icon: Users, adminOnly: true },
  { href: '/dashboard/audit', label: 'Audit log', icon: ScrollText, adminOnly: true },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { role, signOut, displayName } = useAuth();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-muted/40 p-3">
      <div className="mb-4 px-2 text-sm font-semibold">BVQT Tracking</div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          if (item.adminOnly && !isAdmin(role)) return null;
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted',
                active && 'bg-muted font-medium'
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-2 border-t pt-2">
        <p className="px-2 py-1 text-xs text-muted-foreground">
          {displayName} ({role})
        </p>
        <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start">
          <LogOut className="mr-2 size-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
