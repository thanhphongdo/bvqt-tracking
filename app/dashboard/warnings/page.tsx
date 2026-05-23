'use client';

import Link from 'next/link';
import { useVisitsQuery } from '@/lib/dashboard/use-visits-query';
import { useWarnings } from '@/lib/tracking/use-warnings';
import { useUrlState, defaultDateRange } from '@/lib/dashboard/url-state';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Tab = 'open' | 'errors';

export default function WarningsDashboardPage() {
  const defaults = defaultDateRange();
  const [state, setState] = useUrlState({ from: defaults.from, to: defaults.to });
  const warnings = useWarnings();
  const { visits, loading } = useVisitsQuery({
    from: state.from,
    to: state.to,
    hasError: 'true',
    limit: 1000,
  });

  return (
    <Tabs defaultValue="open" className="flex flex-col flex-1 overflow-hidden gap-4 px-4 pb-4 md:px-6 md:pb-6 pt-4 md:pt-6">
      <div className="space-y-4 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Cảnh báo & Lỗi</h1>
        <TabsList variant="line" className="w-full border-b border-border/40 rounded-none h-auto pb-0 justify-start gap-0">
          <TabsTrigger value="open" className="rounded-none px-4 py-2 text-sm">
            Cảnh báo đang mở ({warnings.length})
          </TabsTrigger>
          <TabsTrigger value="errors" className="rounded-none px-4 py-2 text-sm">
            Dữ liệu lỗi
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="open" className="flex-1 overflow-auto min-h-0">
        <div className="space-y-2 pb-2">
          {warnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có cảnh báo nào.</p>
          ) : (
            warnings.map((w) => (
              <Card key={w.visit.id} className="border-amber-500/40 p-3 rounded-xl shadow-xs">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 size-5 shrink-0 text-amber-600 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm">
                      <Link
                        href={`/dashboard/visits/${w.visit.id}`}
                        className="font-mono hover:underline text-primary"
                      >
                        {w.visit.code}
                      </Link>{' '}
                      chưa check-out khỏi <strong>{w.room?.name ?? '(phòng không tồn tại)'}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Đã ở phòng {Math.round(w.minutesIn)} phút (ngưỡng {w.thresholdMinutes}p) ·{' '}
                      {w.visit.date}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="errors" className="flex-1 overflow-auto min-h-0">
        <div className="space-y-3 pb-2">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card/50 p-3 shadow-xs">
            <DateRangeFilter
              from={state.from}
              to={state.to}
              onChange={(r) => setState({ from: r.from, to: r.to })}
            />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Đang tải...</p>
          ) : visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có lượt khám có lỗi trong khoảng này.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground font-medium pl-1">
                {visits.length} lượt có lỗi (đã loại khỏi thống kê)
              </p>
              <div className="border border-border/60 rounded-xl bg-card shadow-xs overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Số lỗi</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono">
                          <Link href={`/dashboard/visits/${v.id}`} className="hover:underline text-primary">
                            {v.code}
                          </Link>
                        </TableCell>
                        <TableCell>{v.date}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{v.errorCount}</Badge>
                        </TableCell>
                        <TableCell>{v.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
