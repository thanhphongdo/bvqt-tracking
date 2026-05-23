import { RoleGate } from '@/components/auth/RoleGate';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { RetentionBanner } from '@/components/dashboard/RetentionBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate minRole="manager">
      <div className="flex h-screen flex-1">
        <DashboardSidebar />
        <div className="flex-1 overflow-y-auto p-6">
          <RetentionBanner />
          {children}
        </div>
      </div>
    </RoleGate>
  );
}
