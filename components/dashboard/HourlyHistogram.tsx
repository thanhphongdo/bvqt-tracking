'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function HourlyHistogram({ data }: { data: { hour: number; count: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} />
          <YAxis allowDecimals={false} />
          <Tooltip
            labelFormatter={(h) => `${h}:00 - ${h}:59`}
            formatter={(value) => [`${value} bệnh nhân`, '']}
          />
          <Bar dataKey="count" fill="#16a34a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
