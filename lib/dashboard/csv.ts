import type { VisitDocWithId } from '@/types/visit';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function visitsToCsv(visits: VisitDocWithId[]): string {
  const headers = [
    'Code',
    'Date',
    'Registered At',
    'Last Event At',
    'Current Room',
    'Status',
    'Has Error',
    'Error Count',
  ];
  const rows = visits.map((v) => [
    v.code,
    v.date,
    v.registeredAt.toDate().toISOString(),
    v.lastEventAt.toDate().toISOString(),
    v.currentRoomId ?? '',
    v.status,
    v.hasError,
    v.errorCount,
  ]);
  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
