import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
    import type {
      TrainLogRow,
      CrossingRow,
      GateEventRow,
      DeviceRow,
      SensorReadingRow,
      AlertRow,
      DashboardData,
    } from "../types/dashboard";

// const AUTO_REFRESH_MS = 10000;

export function useDashboardData(): DashboardData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const [crossings, setCrossings] = useState<CrossingRow[]>([]);
  const [crossingHint, setCrossingHint] = useState<string | null>(null);
  const [selectedCrossId, setSelectedCrossId] = useState<string>("");
  const [latestTrain, setLatestTrain] = useState<TrainLogRow | null>(null);
  const [latestGateEvent, setLatestGateEvent] = useState<GateEventRow | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [sensorReadings, setSensorReadings] = useState<SensorReadingRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);
  const [trainHistory, setTrainHistory] = useState<TrainLogRow[]>([]);

  const selectedCrossingName = useMemo(() => {
    if (!selectedCrossId) return "Semua crossing";
    const selected = crossings.find((crossing) => crossing.cross_id === selectedCrossId);
    return selected?.name ?? "Crossing terpilih";
  }, [crossings, selectedCrossId]);

  const fetchDashboard = useCallback(async (crossId: string, silent = false) => {
    if (!silent) setLoading(true);
    
    let trainQuery = supabase
      .from("train_logs")
      .select("train_id, cross_id, status, detected_at, cleared_at")
      .order("detected_at", { ascending: false })
      .limit(1);

    let gateEventQuery = supabase
      .from("gate_events")
      .select("event_id, cross_id, new_state, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(1);

    let devicesQuery = supabase
      .from("devices")
      .select("device_id, cross_id, type, status")
      .order("registered_at", { ascending: false })
      .limit(30);

    let sensorQuery = supabase
      .from("sensor_readings")
      .select("sensor_id, cross_id, sensor_type, distance_cm, object_detected, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(100);

    let alertQuery = supabase
      .from("alerts")
      .select("alert_id", { count: "exact" })
      .eq("resolved", false);

    let alertListQuery = supabase
      .from("alerts")
      .select("alert_id, cross_id, severity, message, alert_type, triggered_at, resolved")
      .eq("resolved", false)
      .order("triggered_at", { ascending: false })
      .limit(5);

  // Query untuk daftar riwayat (untuk tabel history)
    let historyQuery = supabase.from("train_logs").select("*").order("detected_at", { ascending: false }).limit(20);

    if (crossId) {
      trainQuery = trainQuery.eq("cross_id", crossId);
      gateEventQuery = gateEventQuery.eq("cross_id", crossId);
      devicesQuery = devicesQuery.eq("cross_id", crossId);
      sensorQuery = sensorQuery.eq("cross_id", crossId);
      alertQuery = alertQuery.eq("cross_id", crossId);
      alertListQuery = alertListQuery.eq("cross_id", crossId);
      historyQuery = historyQuery.eq("cross_id", crossId);
    }

    const [
      trainRes, 
      gateRes, 
      devRes, 
      sensRes, 
      alertRes, 
      alertListRes, 
      historyRes
    ] = await Promise.all([
      trainQuery.maybeSingle(),
      gateEventQuery.maybeSingle(),
      devicesQuery,
      sensorQuery,
      alertQuery,
      alertListQuery,
      historyQuery,
    ]);

    // Tambahkan historyRes.error ke pengecekan error
    const firstError =
      trainRes.error || gateRes.error || devRes.error || 
      sensRes.error || alertRes.error || alertListRes.error || historyRes.error;

    if (firstError) {
      setError(firstError.message);
    } else {
      setError(null);
    }

    // UPDATE STATE (Sudah diperbaiki)
    setLatestTrain(trainRes.data ?? null);
    setTrainHistory(historyRes.data ?? []); // Mengisi tabel history
    setLatestGateEvent(gateRes.data ?? null);
    setDevices(devRes.data ?? []);
    setSensorReadings(sensRes.data ?? []);
    setActiveAlertsCount(alertRes.count ?? 0);
    setAlerts(alertListRes.data ?? []);

    setLastUpdatedAt(new Date().toLocaleTimeString("id-ID"));
    setLoading(false);
  }, []);

  useEffect(() => {
    const fetchCrossings = async () => {
      setCrossingHint(null);
      const { data, error: crossingsError } = await supabase
        .from("crossings")
        .select("cross_id, name, status")
        .order("name", { ascending: true });

      if (crossingsError) {
        setError(crossingsError.message);
      }

      if ((data ?? []).length > 0) {
        setCrossings(data ?? []);
        return;
      }

      const [fromDevices, fromTrainLogs, fromGateEvents, fromSensorReadings] = await Promise.all([
        supabase.from("devices").select("cross_id").not("cross_id", "is", null).limit(200),
        supabase.from("train_logs").select("cross_id").not("cross_id", "is", null).limit(200),
        supabase.from("gate_events").select("cross_id").not("cross_id", "is", null).limit(200),
        supabase.from("sensor_readings").select("cross_id").not("cross_id", "is", null).limit(200),
      ]);

      const fallbackError =
        fromDevices.error || fromTrainLogs.error || fromGateEvents.error || fromSensorReadings.error;

      if (fallbackError) {
        setError(fallbackError.message);
        setCrossings([]);
        return;
      }

      const crossIdSet = new Set<string>();
      for (const row of fromDevices.data ?? []) {
        if (row.cross_id) crossIdSet.add(row.cross_id);
      }
      for (const row of fromTrainLogs.data ?? []) {
        if (row.cross_id) crossIdSet.add(row.cross_id);
      }
      for (const row of fromGateEvents.data ?? []) {
        if (row.cross_id) crossIdSet.add(row.cross_id);
      }
      for (const row of fromSensorReadings.data ?? []) {
        if (row.cross_id) crossIdSet.add(row.cross_id);
      }

      const fallbackCrossings = Array.from(crossIdSet).map((crossId, index) => ({
        cross_id: crossId,
        name: `Crossing ${index + 1} (${crossId.slice(0, 8)})`,
        status: null,
        created_at: new Date(),
      }));

      setCrossings(fallbackCrossings);
      if (fallbackCrossings.length > 0) {
        setCrossingHint("Nama crossing diambil dari telemetry karena tabel crossings kosong atau belum bisa diakses.");
      }
    };

    fetchCrossings();
  }, []);

  useEffect(() => {
    fetchDashboard(selectedCrossId, false);

    // const intervalId = window.setInterval(() => {
    //   fetchDashboard(selectedCrossId, true);
    // }, );

    const realtimeFilter = selectedCrossId ? `cross_id=eq.${selectedCrossId}` : undefined;

    const channel = supabase
      .channel(`dashboard-live-${selectedCrossId || "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "train_logs", filter: realtimeFilter }, () => {
        fetchDashboard(selectedCrossId, true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "gate_events", filter: realtimeFilter }, () => {
        fetchDashboard(selectedCrossId, true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "devices", filter: realtimeFilter }, () => {
        fetchDashboard(selectedCrossId, true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sensor_readings", filter: realtimeFilter }, () => {
        fetchDashboard(selectedCrossId, true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: realtimeFilter }, () => {
        fetchDashboard(selectedCrossId, true);
      })
      .subscribe();

    return () => {
      // window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [fetchDashboard, selectedCrossId]);

  useEffect(() => {
    if (!selectedCrossId) return;
    const stillExists = crossings.some((crossing) => crossing.cross_id === selectedCrossId);
    if (!stillExists) {
      setSelectedCrossId("");
    }
  }, [crossings, selectedCrossId]);

  return {
    loading,
    error,
    lastUpdatedAt,
    crossings,
    crossingHint,
    selectedCrossId,
    setSelectedCrossId,
    selectedCrossingName,
    latestTrain,
    latestGateEvent,
    devices,
    sensorReadings,
    alerts,
    activeAlertsCount,
    trainHistory,
  };
}

