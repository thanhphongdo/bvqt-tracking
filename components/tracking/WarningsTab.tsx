'use client';

import { useWarnings } from '@/lib/tracking/use-warnings';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export function WarningsTab() {
  const warnings = useWarnings();

  if (warnings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Không có cảnh báo nào hiện tại.</p>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      {warnings.map((w) => (
        <Card key={w.visit.id} className="border-amber-500/40 p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 size-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Code <span className="font-mono">{w.visit.code}</span> chưa check-out khỏi{' '}
                {w.room?.name ?? `(phòng không tồn tại)`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Đã ở phòng {Math.round(w.minutesIn)} phút — vượt ngưỡng{' '}
                {w.thresholdMinutes} phút.
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
