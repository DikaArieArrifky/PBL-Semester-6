import { useEffect, useRef, useState } from 'react';
import supabase from '@/lib/supabase';
import type { GateStateUI } from './useGateStatus';

export interface GateSensorUpdate {
  sensorType: 'IR_A' | 'IR_B' | 'ULTRASONIC';
  objectDetected: boolean;
  distanceCm: number | null;
  recordedAt: string;
}

export interface RealtimeGateUpdate {
  crossingName: string;
  eventType: string;
  newState: GateStateUI;
  occurredAt: string;
}

export function useRealtimeSocket(crossingName: string | null) {
  const [latestGateUpdate, setLatestGateUpdate]     = useState<RealtimeGateUpdate | null>(null);
  const [latestSensorUpdate, setLatestSensorUpdate] = useState<GateSensorUpdate | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!crossingName) return;

    isMountedRef.current = true;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      console.warn('[useRealtimeSocket] NEXT_PUBLIC_BACKEND_URL tidak diset, skip socket.io');
      return;
    }

    let socket: any = null;

    async function initSocket() {
      try {
        const { io } = await import('socket.io-client');

        socket = io(backendUrl!, {
          transports:        ['websocket'],
          reconnectionDelay: 2000,
          autoConnect:       true,
        });

        socket.on('connect', () => {
          console.log('[useRealtimeSocket] socket.io connected');
        });

        socket.on('disconnect', (reason: string) => {
          console.warn('[useRealtimeSocket] socket.io disconnected:', reason);
        });

        socket.on('gate_status_update', (data: any) => {
          if (!isMountedRef.current) return;
          if (data.crossing_name !== crossingName) return;

          setLatestGateUpdate({
            crossingName: data.crossing_name,
            eventType:    data.event_type,
            newState:     data.new_state ?? null,
            occurredAt:   data.occurred_at,
          });
        });

        socket.on('sensor_update', (data: any) => {
          if (!isMountedRef.current) return;
          if (data.crossing_name !== crossingName) return;

          setLatestSensorUpdate({
            sensorType:     data.sensor_type,
            objectDetected: data.object_detected,
            distanceCm:     data.distance_cm ?? null,
            recordedAt:     data.recorded_at,
          });
        });
      } catch (err) {
        console.error('[useRealtimeSocket] gagal init socket.io:', err);
      }
    }

    initSocket();

    return () => {
      isMountedRef.current = false;
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [crossingName]);

  return { latestGateUpdate, latestSensorUpdate };
}
