'use client';

import { useVisitsQuery } from '@/lib/dashboard/use-visits-query';
import { useEventsQuery } from '@/lib/dashboard/use-events-query';
import { useUrlState, defaultDateRange } from '@/lib/dashboard/url-state';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import {
  avg,
  computeHourlyCounts,
  computeRegistrationToFirstRoom,
  computeRoomDurations,
  computeTransitions,
  computeVisitDurations,
} from '@/lib/dashboard/analytics';
import {
  RoomDurationBar,
  RoomDurationPie,
} from '@/components/dashboard/RoomDurationCharts';
import { HourlyHistogram } from '@/components/dashboard/HourlyHistogram';
import { TransitionsHeatmap } from '@/components/dashboard/TransitionsHeatmap';
import { Card } from '@/components/ui/card';

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </Card>
  );
}

export default function AnalyticsPage() {
  const defaults = defaultDateRange();
  const [state, setState] = useUrlState({ from: defaults.from, to: defaults.to });

  const { visits, loading: visitsLoading } = useVisitsQuery({
    from: state.from,
    to: state.to,
    limit: 5000,
  });
  const { events, loading: eventsLoading } = useEventsQuery({
    from: state.from,
    to: state.to,
  });

  const loading = visitsLoading || eventsLoading;
  const roomDurations = computeRoomDurations(events);
  const transitions = computeTransitions(events);
  const hourly = computeHourlyCounts(visits);
  const visitDurations = computeVisitDurations(visits);
  const regToFirst = computeRegistrationToFirstRoom(events, visits);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Thống kê</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3">
        <DateRangeFilter
          from={state.from}
          to={state.to}
          onChange={(r) => setState({ from: r.from, to: r.to })}
        />
        <p className="text-xs text-muted-foreground">Tối đa khuyến nghị: 60 ngày</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              title="Bệnh nhân"
              value={String(visits.length)}
              subtitle={`${visits.filter((v) => v.hasError).length} có lỗi`}
            />
            <KpiCard
              title="TB tổng TG/lượt"
              value={`${Math.round(avg(visitDurations))}p`}
              subtitle={visitDurations.length === 0 ? 'n/a' : `${visitDurations.length} lượt`}
            />
            <KpiCard
              title="TB chờ đăng ký → phòng đầu"
              value={`${Math.round(avg(regToFirst))}p`}
              subtitle={`${regToFirst.length} lượt`}
            />
            <KpiCard
              title="Số phòng"
              value={String(roomDurations.length)}
              subtitle="có dữ liệu trong khoảng"
            />
          </div>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Phân bổ thời gian khám theo phòng</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <RoomDurationPie data={roomDurations} />
              <RoomDurationBar data={roomDurations} />
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Bệnh nhân theo giờ trong ngày</h2>
            <HourlyHistogram data={hourly} />
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">TB thời gian chờ giữa các phòng</h2>
            <TransitionsHeatmap data={transitions} />
          </Card>
        </>
      )}
    </div>
  );
}
