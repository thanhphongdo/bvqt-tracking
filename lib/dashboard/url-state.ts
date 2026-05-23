'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Sync object-shaped state with URL search params.
 * Each key is read/written as a string param.
 */
export function useUrlState<T extends Record<string, string | undefined>>(
  defaults: T
): [T, (partial: Partial<T>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const state = useMemo(() => {
    const out = { ...defaults };
    for (const k of Object.keys(defaults) as Array<keyof T>) {
      const v = params.get(k as string);
      if (v != null) (out as Record<string, string>)[k as string] = v;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setState = useCallback(
    (partial: Partial<T>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(partial)) {
        if (v === undefined || v === '' || v === defaults[k]) {
          next.delete(k);
        } else {
          next.set(k, v as string);
        }
      }
      router.replace(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router, defaults]
  );

  return [state, setState];
}

/** Default 7-day window ending today, in VN local YYYY-MM-DD. */
export function defaultDateRange(): { from: string; to: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const now = new Date();
  const to = fmt.format(now);
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 6);
  const from = fmt.format(fromDate);
  return { from, to };
}
