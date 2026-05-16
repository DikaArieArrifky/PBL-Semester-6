import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Crossing } from '@/lib/types';

export function useCrossings() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'Admin';

  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const [selected, setSelected]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    // Tunggu auth selesai load dulu
    if (authLoading) return;

    // Kalau tidak ada profile, tidak ada yang perlu di-fetch
    if (!profile) {
      setLoading(false);
      return;
    }

    // Capture ke local variable agar TypeScript tahu nilainya non-null di dalam async
    const currentProfile = profile;
    const currentIsAdmin = isAdmin;

    async function fetchCrossings() {
      setLoading(true);
      try {
        let query = supabase
          .from('crossings')
          .select('*')
          .eq('status', 'active')
          .order('name');

        // Staff hanya lihat crossing yang ditugaskan
        if (!currentIsAdmin && currentProfile.cross_id) {
          query = query.eq('cross_id', currentProfile.cross_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        const list = data || [];
        setCrossings(list);

        // Auto-select: staff langsung ke crossing mereka, admin ke pertama
        if (!currentIsAdmin && currentProfile.cross_id) {
          setSelected(currentProfile.cross_id);
        } else if (list.length > 0) {
          setSelected(prev => prev ?? list[0].cross_id);
        }
      } catch (err) {
        console.error('[useCrossings] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCrossings();
  }, [profile?.id, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  return { crossings, selected, setSelected, loading };
}
