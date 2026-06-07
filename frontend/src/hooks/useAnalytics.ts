import { useEffect, useState } from 'react';
import type { AnalyticsRow } from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function useAnalytics(
  crossId: string | null,
  period: 'daily' | 'monthly' | 'yearly' = 'daily',
  year?: number | null,
  month?: number | null
) {
  const [data, setData]       = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!crossId) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    async function fetchAnalytics() {
      try {
        const params = new URLSearchParams({ period });
        if (year)  params.set('year', String(year));
        if (month && period === 'daily') params.set('month', String(month));

        const res = await fetch(
          `${BACKEND_URL}/api/crossings/${crossId}/analytics?${params}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error('[useAnalytics] error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [crossId, period, year, month]);

  return { data, loading, error };
}