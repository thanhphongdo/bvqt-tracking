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
    <div className="px-4 pb-4 md:px-6 md:pb-6 flex flex-col h-full overflow-hidden gap-4 pt-4 md:pt-6">
      {/* Top Header, Filters & Data Summary (Stationary) */}
      <div className="space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Bệnh nhân</h1>
          <Button
            variant="outline"
            size="sm"
            disabled={visits.length === 0}
            onClick={() =>
              downloadCsv(`visits-${state.from}-to-${state.to}.csv`, visitsToCsv(visits))
            }
            className="rounded-xl h-9 px-4 font-medium"
          >
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end rounded-xl border bg-card/50 p-3 shadow-xs">
          <DateRangeFilter
            from={state.from}
            to={state.to}
            onChange={(r) => setState({ from: r.from, to: r.to })}
          />
          <div className="flex flex-row gap-2 sm:gap-3.5 w-full sm:w-auto shrink-0">
            <div className="grid gap-1 flex-1 min-w-0 sm:w-40 sm:flex-none">
              <Label htmlFor="code" className="text-xs font-semibold text-muted-foreground pl-1">Code</Label>
              <Input
                id="code"
                placeholder="Tìm code..."
                value={state.code}
                onChange={(e) => setState({ code: e.target.value })}
                className="w-full sm:w-40 rounded-xl h-9"
              />
            </div>
            <div className="grid gap-1 flex-1 min-w-0 sm:w-32 sm:flex-none">
              <Label htmlFor="hasError" className="text-xs font-semibold text-muted-foreground pl-1">Trạng thái</Label>
              <Select value={state.hasError} onValueChange={(v) => setState({ hasError: v ?? undefined })}>
                <SelectTrigger id="hasError" className="w-full sm:w-32 rounded-xl h-9">
                  <SelectValue>
                    {(v: string | null) =>
                      ({ all: 'Tất cả', false: 'Bình thường', true: 'Có lỗi' }[v ?? ''] ?? v ?? 'Tất cả')
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="false">Bình thường</SelectItem>
                  <SelectItem value="true">Có lỗi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Summary (Stationary above table) */}
        {!loading && (
          <p className="text-xs text-muted-foreground font-semibold pl-1">{visits.length} lượt khám</p>
        )}
      </div>

      {/* Main Scrollable Table Area */}
      <div className="flex-1 overflow-auto min-h-0 border border-border/60 rounded-xl bg-card shadow-xs relative">
        {error && <p className="text-sm text-destructive font-medium p-4">Lỗi: {error}</p>}
        {loading ? (
          <p className="text-sm text-muted-foreground animate-pulse p-4">Đang tải danh sách...</p>
        ) : (
          <VisitsList visits={visits} />
        )}
      </div>
    </div>
  );
}
