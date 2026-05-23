'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { VisitDocWithId } from '@/types/visit';
import { Timestamp, collection, onSnapshot } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';

function formatVN(ts: Timestamp) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(ts.toDate());
}

function totalMinutes(v: VisitDocWithId): string {
  const start = v.registeredAt.toMillis();
  const end = v.lastEventAt.toMillis();
  const m = Math.round((end - start) / 60_000);
  if (m < 60) return `${m}p`;
  return `${Math.floor(m / 60)}g${m % 60}p`;
}

export function VisitsList({ visits }: { visits: VisitDocWithId[] }) {
  const [roomMap, setRoomMap] = useState<Map<string, string>>(new Map());
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    const { db } = getFirebaseClient();
    const unsub = onSnapshot(collection(db, 'rooms'), (snap) => {
      const map = new Map<string, string>();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        map.set(doc.id, data.name || doc.id);
      });
      setRoomMap(map);
    });
    return unsub;
  }, []);

  const columns = useMemo<ColumnDef<VisitDocWithId>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        cell: (info) => {
          const v = info.row.original;
          return (
            <Link href={`/dashboard/visits/${v.id}`} className="hover:underline font-mono">
              {v.code}
            </Link>
          );
        },
      },
      {
        accessorKey: 'date',
        header: 'Ngày',
      },
      {
        accessorKey: 'registeredAt',
        header: 'Bắt đầu',
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.registeredAt.toMillis();
          const b = rowB.original.registeredAt.toMillis();
          return a - b;
        },
        cell: (info) => {
          const v = info.row.original;
          return <span className="text-xs">{formatVN(v.registeredAt)}</span>;
        },
      },
      {
        accessorKey: 'lastEventAt',
        header: 'Kết thúc',
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.lastEventAt.toMillis();
          const b = rowB.original.lastEventAt.toMillis();
          return a - b;
        },
        cell: (info) => {
          const v = info.row.original;
          return <span className="text-xs">{formatVN(v.lastEventAt)}</span>;
        },
      },
      {
        id: 'totalTime',
        header: 'Tổng TG',
        sortingFn: (rowA, rowB) => {
          const durationA = rowA.original.lastEventAt.toMillis() - rowA.original.registeredAt.toMillis();
          const durationB = rowB.original.lastEventAt.toMillis() - rowB.original.registeredAt.toMillis();
          return durationA - durationB;
        },
        cell: (info) => {
          const v = info.row.original;
          return totalMinutes(v);
        },
      },
      {
        accessorKey: 'hasError',
        header: 'Trạng thái',
        sortingFn: (rowA, rowB) => {
          const errA = rowA.original.hasError ? rowA.original.errorCount || 1 : 0;
          const errB = rowB.original.hasError ? rowB.original.errorCount || 1 : 0;
          return errA - errB;
        },
        cell: (info) => {
          const v = info.row.original;
          return v.hasError ? (
            <Badge variant="destructive">Lỗi ({v.errorCount})</Badge>
          ) : (
            <Badge variant="default">OK</Badge>
          );
        },
      },
      {
        accessorKey: 'currentRoomId',
        header: 'Phòng đang ở',
        sortingFn: (rowA, rowB) => {
          const nameA = roomMap.get(rowA.original.currentRoomId ?? '') ?? '';
          const nameB = roomMap.get(rowB.original.currentRoomId ?? '') ?? '';
          return nameA.localeCompare(nameB, 'vi');
        },
        cell: (info) => {
          const v = info.row.original;
          if (!v.currentRoomId) return '—';
          return roomMap.get(v.currentRoomId) ?? v.currentRoomId;
        },
      },
    ],
    [roomMap]
  );

  const table = useReactTable({
    data: visits,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (visits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Không có lượt khám nào.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const isSortable = header.column.getCanSort();
              return (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={isSortable ? 'cursor-pointer select-none hover:bg-muted/50 transition-colors' : ''}
                >
                  <div className="flex items-center gap-1.5 py-1">
                    <span>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {isSortable && (
                      <span className="inline-flex shrink-0">
                        {{
                          asc: <ArrowUp className="size-3.5 text-foreground" />,
                          desc: <ArrowDown className="size-3.5 text-foreground" />,
                        }[header.column.getIsSorted() as string] ?? <ArrowUpDown className="size-3.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors" />}
                      </span>
                    )}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
