'use client';

import { useVisitsQuery } from '@/lib/dashboard/use-visits-query';
import { useUrlState, defaultDateRange } from '@/lib/dashboard/url-state';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { VisitsList } from '@/components/dashboard/VisitsList';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download } from 'lucide-react';
import { visitsToCsv, downloadCsv } from '@/lib/dashboard/csv';

export default function VisitsPage() {
  const defaults = defaultDateRange();
  const [state, setState] = useUrlState({
    from: defaults.from,
    to: defaults.to,
    code: '',
    hasError: 'all',
  });

  const { visits, loading, error } = useVisitsQuery({
    from: state.from,
    to: state.to,
    code: state.code || undefined,
    hasError: state.hasError as 'all' | 'true' | 'false',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bệnh nhân</h1>
        <Button
          variant="outline"
          size="sm"
          disabled={visits.length === 0}
          onClick={() =>
            downloadCsv(`visits-${state.from}-to-${state.to}.csv`, visitsToCsv(visits))
          }
        >
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3">
        <DateRangeFilter
          from={state.from}
          to={state.to}
          onChange={(r) => setState({ from: r.from, to: r.to })}
        />
        <div className="grid gap-1">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            placeholder="Tìm code..."
            value={state.code}
            onChange={(e) => setState({ code: e.target.value })}
            className="w-40"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="hasError">Trạng thái</Label>
          <Select value={state.hasError} onValueChange={(v) => setState({ hasError: v ?? undefined })}>
            <SelectTrigger id="hasError" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="false">Bình thường</SelectItem>
              <SelectItem value="true">Có lỗi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Lỗi: {error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{visits.length} lượt khám</p>
          <VisitsList visits={visits} />
        </>
      )}
    </div>
  );
}
