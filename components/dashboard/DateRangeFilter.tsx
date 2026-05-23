'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
}

export function DateRangeFilter({ from, to, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1">
        <Label htmlFor="from">Từ</Label>
        <Input
          id="from"
          type="date"
          value={from}
          onChange={(e) => onChange({ from: e.target.value, to })}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="to">Đến</Label>
        <Input
          id="to"
          type="date"
          value={to}
          onChange={(e) => onChange({ from, to: e.target.value })}
        />
      </div>
    </div>
  );
}
