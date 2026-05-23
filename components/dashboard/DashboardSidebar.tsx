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
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
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

interface DashboardSidebarProps {
  onNavItemClick?: () => void;
  isMobile?: boolean;
}

export function DashboardSidebar({ onNavItemClick, isMobile = false }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { role, signOut, displayName } = useAuth();

  const handleLinkClick = () => {
    if (onNavItemClick) {
      onNavItemClick();
    }
  };

  const navContent = (
    <div className="flex flex-col gap-1.5 flex-1">
      {items.map((item) => {
        if (item.adminOnly && !isAdmin(role)) return null;
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleLinkClick}
            className={cn(
              'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted font-medium',
              active && 'bg-primary/10 text-primary hover:bg-primary/15 font-semibold dark:bg-primary/20 dark:text-primary-foreground dark:hover:bg-primary/25 shadow-xs'
            )}
          >
            <Icon className="size-4.5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  const footerContent = (
    <div className="mt-auto border-t border-border/60 pt-3">
      <div className="flex flex-col gap-0.5 px-3 py-2 bg-muted/40 rounded-xl mb-2 text-xs">
        <span className="font-semibold text-foreground truncate">{displayName}</span>
        <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-bold">{role}</span>
      </div>
      <Button
        onClick={signOut}
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-9 px-3.5 font-medium transition-colors"
      >
        <LogOut className="mr-2 size-4" />
        Đăng xuất
      </Button>
    </div>
  );

  // If mobile, just return the contents without fixed width/sidebar containers
  if (isMobile) {
    return (
      <div className="flex flex-col h-full gap-4">
        {navContent}
        {footerContent}
      </div>
    );
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-border/60 bg-card p-4.5 shadow-xs transition-colors duration-200">
      {/* Sidebar Header with Brand Logo & ThemeToggle */}
      <div className="flex items-center justify-between mb-6 px-2.5">
        <span className="font-bold text-sm tracking-tight text-primary dark:text-foreground">BVQ7 Tracking</span>
        <ThemeToggle />
      </div>

      {navContent}
      {footerContent}
    </aside>
  );
}

