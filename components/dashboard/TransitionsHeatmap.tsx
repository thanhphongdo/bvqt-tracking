'use client';

import type { RoomTransitionStats } from '@/lib/dashboard/analytics';

interface Props {
  data: RoomTransitionStats[];
}

/**
 * Heatmap: rows = "from room", cols = "to room", cell = avg wait minutes.
 * Cell color intensity scales with the wait value relative to the max in the set.
 */
export function TransitionsHeatmap({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có dữ liệu chuyển phòng.</p>;
  }

  const rooms = new Map<string, string>();
  data.forEach((d) => {
    rooms.set(d.fromRoomId, d.fromRoomName);
    rooms.set(d.toRoomId, d.toRoomName);
  });
  const ids = Array.from(rooms.keys());
  const max = Math.max(...data.map((d) => d.avgWaitMinutes), 1);
  const lookup = new Map(data.map((d) => [`${d.fromRoomId}|${d.toRoomId}`, d]));

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="border bg-muted/40 p-1">Từ ↓ → Đến →</th>
            {ids.map((to) => (
              <th key={to} className="border bg-muted/40 p-1 text-left">
                {rooms.get(to)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ids.map((from) => (
            <tr key={from}>
              <td className="border bg-muted/40 p-1 font-medium">{rooms.get(from)}</td>
              {ids.map((to) => {
                const cell = lookup.get(`${from}|${to}`);
                const intensity = cell ? cell.avgWaitMinutes / max : 0;
                const bg = cell
                  ? `rgba(220, 38, 38, ${(0.1 + intensity * 0.7).toFixed(2)})`
                  : 'transparent';
                return (
                  <td
                    key={to}
                    className="border p-1"
                    style={{ backgroundColor: bg }}
                    title={cell ? `${Math.round(cell.avgWaitMinutes)} phút trung bình (${cell.count} lần)` : ''}
                  >
                    {cell ? `${Math.round(cell.avgWaitMinutes)} phút` : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
