'use client';

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { RoomDurationStats } from '@/lib/dashboard/analytics';

const COLORS = [
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
  '#ea580c',
  '#0284c7',
];

export function RoomDurationPie({ data }: { data: RoomDurationStats[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>;
  }
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="totalMinutes"
            nameKey="roomName"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ payload }: { payload?: RoomDurationStats }) =>
              payload ? `${payload.roomName} (${Math.round(payload.totalMinutes)} phút)` : ''
            }
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => {
              const v = Number(value ?? 0);
              const p = item.payload as RoomDurationStats;
              return [
                `${Math.round(v)} phút tổng (${p.visitCount} lượt, Trung bình ${Math.round(p.avgMinutes)} phút)`,
                p.roomName,
              ];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RoomDurationBar({ data }: { data: RoomDurationStats[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>;
  }
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 60, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="roomName" width={120} />
          <Tooltip formatter={(value) => `${Math.round(Number(value ?? 0))} phút trung bình`} />
          <Bar dataKey="avgMinutes" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
