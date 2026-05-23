'use client';

import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';

interface Props {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
}

export function DateRangeFilter({ from, to, onChange }: Props) {
  return (
    <div className="flex flex-row items-end gap-2 w-full sm:w-auto">
      <div className="grid gap-1.5 flex-1 min-w-0">
        <Label className="text-xs font-semibold text-muted-foreground pl-0.5">Từ ngày</Label>
        <DatePicker
          value={from}
          onChange={(val) => onChange({ from: val, to })}
        />
      </div>
      <div className="grid gap-1.5 flex-1 min-w-0">
        <Label className="text-xs font-semibold text-muted-foreground pl-0.5">Đến ngày</Label>
        <DatePicker
          value={to}
          onChange={(val) => onChange({ from, to: val })}
        />
      </div>
    </div>
  );
}
