'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, LogIn, LogOut, FileText } from 'lucide-react';
import type { ScanAction, ScanInferenceResult } from '@/lib/tracking/scan-handler';

interface Props {
  code: string;
  inference: ScanInferenceResult;
  selected: ScanAction;
  onSelect: (action: ScanAction) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  selectedIsRegistration: boolean;
}

const actionLabels: Record<ScanAction, { label: string; Icon: typeof LogIn }> = {
  registered: { label: 'Lấy sổ (đăng ký)', Icon: FileText },
  room_in: { label: 'VÀO phòng', Icon: LogIn },
  room_out: { label: 'RA khỏi phòng', Icon: LogOut },
};

export function ScanResultCard({
  code,
  inference,
  selected,
  onSelect,
  onSubmit,
  onCancel,
  submitting,
  selectedIsRegistration,
}: Props) {
  const choices: ScanAction[] = selectedIsRegistration
    ? ['registered']
    : ['room_in', 'room_out'];

  return (
    <Card className="w-full max-w-sm p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Mã vừa quét</p>
          <p className="font-mono text-lg font-semibold">{code}</p>
        </div>
        <Badge variant="secondary">Suggest: {actionLabels[inference.suggested].label}</Badge>
      </div>

      {inference.warning && (
        <div className="mt-3 flex items-start gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{inference.warning}</span>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {choices.map((action) => {
          const { label, Icon } = actionLabels[action];
          const active = selected === action;
          return (
            <Button
              key={action}
              variant={active ? 'default' : 'outline'}
              onClick={() => onSelect(action)}
              className="h-auto py-3"
            >
              <Icon className="mr-2 size-4" />
              {label}
            </Button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Huỷ
        </Button>
        <Button onClick={onSubmit} disabled={submitting} className="flex-1">
          {submitting ? 'Đang gửi...' : 'Gửi'}
        </Button>
      </div>
    </Card>
  );
}
