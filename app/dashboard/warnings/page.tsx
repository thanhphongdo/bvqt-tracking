'use client';

import { useState } from 'react';
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

type Tab = 'open' | 'errors';

export default function WarningsDashboardPage() {
  const [tab, setTab] = useState<Tab>('open');
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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Cảnh báo & Lỗi</h1>

      <nav className="flex border-b">
        {(['open', 'errors'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${tab === t ? 'border-b-2 border-foreground font-medium' : 'text-muted-foreground'}`}
          >
            {t === 'open' ? `Cảnh báo đang mở (${warnings.length})` : 'Data lỗi'}
          </button>
        ))}
      </nav>

      {tab === 'open' && (
        <div className="space-y-2">
          {warnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có cảnh báo nào.</p>
          ) : (
            warnings.map((w) => (
              <Card key={w.visit.id} className="border-amber-500/40 p-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 size-5 shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm">
                      <Link
                        href={`/dashboard/visits/${w.visit.id}`}
                        className="font-mono hover:underline"
                      >
                        {w.visit.code}
                      </Link>{' '}
                      chưa check-out khỏi <strong>{w.room?.name ?? '(phòng không tồn tại)'}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Đã ở phòng {Math.round(w.minutesIn)} phút (ngưỡng {w.thresholdMinutes}p) ·{' '}
                      {w.visit.date}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'errors' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3">
            <DateRangeFilter
              from={state.from}
              to={state.to}
              onChange={(r) => setState({ from: r.from, to: r.to })}
            />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có lượt khám có lỗi trong khoảng này.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {visits.length} lượt có lỗi (đã loại khỏi thống kê)
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Số lỗi</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono">
                        <Link href={`/dashboard/visits/${v.id}`} className="hover:underline">
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
