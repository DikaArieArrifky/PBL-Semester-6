import { useEffect, useRef, useState } from 'react';
import supabase from '@/lib/supabase';
import type { GateEvent } from '@/lib/types';

export type GateStateUI = 'OPEN' | 'WAITING' | 'CLOSING' | 'CLOSED' | 'OPENING' | null;

function deriveState(ev: GateEvent): GateStateUI {
  const raw = ev.new_state as string | null;
  const known: GateStateUI[] = ['OPEN', 'WAITING', 'CLOSING', 'CLOSED', 'OPENING'];
  if (raw && known.includes(raw as GateStateUI)) return raw as GateStateUI;

  switch (ev.event_type) {
    case 'GATE_WARNING': return 'WAITING';
    case 'GATE_CLOSING': return 'CLOSING';
    case 'GATE_CLOSED': return 'CLOSED';
    case 'GATE_OPENING': return 'OPENING';
    case 'GATE_OPEN': return 'OPEN';
    case 'GATE_CANCELLED': return 'OPEN';
    default: return null;
  }
}

export function useGateStatus(crossId: string | null) {
  const [gateState, setGateState] = useState<GateStateUI>(null);
  const [lastEvent, setLastEvent] = useState<GateEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const isMountedRef = useRef(true);
  const realtimeOkRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEventRef = useRef<GateEvent | null>(null); // For diff checking

  useEffect(() => {
    if (!crossId) {
      setLoading(false);
      return;
    }

    isMountedRef.current = true;
    realtimeOkRef.current = false;

    // Listen for manual refresh event
    const handleRefresh = () => {
      if (isMountedRef.current) {
        fetchLatest();
      }
    };
    window.addEventListener('force-refresh-dashboard', handleRefresh);

    function applyEvent(ev: GateEvent) {
      const state = deriveState(ev);

      lastEventRef.current = ev;
      setLastEvent(ev);
      setGateState(state);
    }
    async function fetchLatest() {
      if (!isMountedRef.current) return;

      try {
        const { data, error } = await supabase
          .from('gate_events')
          .select('*')
          .eq('cross_id', crossId)
          .order('occurred_at', { ascending: false })
          .limit(1)
          .single();

        if (!isMountedRef.current) return;

        if (error && error.code !== 'PGRST116') {
          console.error('[useGateStatus] fetch error:', error.message);
          return;
        }
        if (data) {
          applyEvent(data as GateEvent);
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    }

    fetchLatest();

    const channel = supabase
      .channel(`gate_status:${crossId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gate_events',
          filter: `cross_id=eq.${crossId}`,
        },
        payload => {
          if (!isMountedRef.current) return;
          realtimeOkRef.current = true;
          console.log('[useGateStatus] realtime event:', payload.new);
          applyEvent(payload.new as GateEvent);
        }
      )
      .subscribe(status => {
        console.log('[useGateStatus] realtime status:', status);

        if (status === 'SUBSCRIBED') {
          realtimeOkRef.current = true;
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          realtimeOkRef.current = false;
          console.warn('[useGateStatus] realtime gagal, fallback polling 10s');
          if (!pollRef.current) {
            pollRef.current = setInterval(fetchLatest, 10000); // Increased from 5s to 10s
          }
        }
      });

    const safetyTimer = setTimeout(() => {
      if (!realtimeOkRef.current && !pollRef.current && isMountedRef.current) {
        console.warn('[useGateStatus] realtime lambat, polling sementara');
        pollRef.current = setInterval(fetchLatest, 10000); // Increased from 5s to 10s
      }
    }, 5000); // Increased from 3s to 5s

    return () => {
      isMountedRef.current = false;
      clearTimeout(safetyTimer);
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener('force-refresh-dashboard', handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [crossId]);

  return { gateState, lastEvent, loading };
}
