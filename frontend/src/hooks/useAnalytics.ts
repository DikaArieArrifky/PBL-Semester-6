import { useEffect, useState } from 'react';
import type { AnalyticsRow } from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function useAnalytics(
  crossId: string | null,
  period: 'daily' | 'monthly' | 'yearly' = 'daily',
  year?: number | null,
  month?: number | null,
  allCrossingIdsStr?: string
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

        let json: AnalyticsRow[] = [];
        
        if (crossId === 'all' && allCrossingIdsStr) {
          const allCrossingIds = allCrossingIdsStr.split(',').filter(Boolean);
          const promises = allCrossingIds.map(async (id) => {
            const res = await fetch(`${BACKEND_URL}/api/crossings/${id}/analytics?${params}`);
            if (!res.ok) return [];
            return res.json();
          });
          const results = await Promise.all(promises);
          
          const aggregated: Record<string, AnalyticsRow> = {};
          results.flat().forEach((row: AnalyticsRow) => {
            if (!aggregated[row.tanggal]) {
              aggregated[row.tanggal] = { ...row };
            } else {
              const prev = aggregated[row.tanggal];
              const prevCount = prev.total_kereta;
              const newCount = row.total_kereta;
              
              prev.total_kereta += newCount;
              if (prev.total_kereta > 0) {
                prev.rata_durasi = ((prev.rata_durasi * prevCount) + (row.rata_durasi * newCount)) / prev.total_kereta;
              }
              prev.durasi_terlama = Math.max(prev.durasi_terlama, row.durasi_terlama);
            }
          });
          json = Object.values(aggregated).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
        } else {
          const res = await fetch(`${BACKEND_URL}/api/crossings/${crossId}/analytics?${params}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          json = await res.json();
        }
        
        setData(json);
      } catch (err: any) {
        console.error('[useAnalytics] error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [crossId, period, year, month, allCrossingIdsStr]);

  return { data, loading, error };
}