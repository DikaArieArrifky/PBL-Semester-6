"use client";
import { useMemo } from "react";
import StatusCard from "../components/layouts/status/statuscard";
import { Train, ShieldCheck, Activity, Radio, Zap, AlertTriangle } from "lucide-react";
import { useDashboardData } from "../hooks/useDashboardData";
import { formatLocalShortTime, toSafeLabel } from "../utils/dashboardFormatters";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const {
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
    sensorReadings,
    alerts,
    activeAlertsCount,
  } = useDashboardData();

  const trainPresence = useMemo(() => {
    if (!latestTrain) return { value: "IDLE", status: "safe" as const, desc: "Tidak ada aktivitas" };

    const status = (latestTrain.status ?? "").toLowerCase();
    if (status === "passing") {
      return { value: "MELINTAS", status: "danger" as const, desc: "Kereta sedang di perlintasan" };
    }
    if (status === "anomaly") {
      return { value: "ANOMALI", status: "warning" as const, desc: "Deteksi tidak wajar" };
    }
    return { value: "BERSIH", status: "safe" as const, desc: "Perlintasan kosong" };
  }, [latestTrain]);

  const gateStatus = useMemo(() => {
    const state = (latestGateEvent?.new_state ?? "UNKNOWN").toUpperCase();
    if (state.includes("OPEN")) return "safe" as const;
    if (state.includes("CLOSE")) return "warning" as const;
    return "warning" as const;
  }, [latestGateEvent]);

  const latestUltrasonic = useMemo(
    () => sensorReadings.find((s) => s.sensor_type.toLowerCase() === "ultrasonic"),
    [sensorReadings]
  );

  const latestInfrared = useMemo(
    () => sensorReadings.find((s) => s.sensor_type.toLowerCase() === "infrared"),
    [sensorReadings]
  );

  // Tambahkan di dalam fungsi Home, sebelum return
  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq("alert_id", alertId);

      if (error) throw error;
      // Data akan ter-update otomatis di UI berkat Realtime Channel di hook
    } catch (err) {
      console.error("Gagal menangani alert:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/50 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-cyan-500 text-xs font-bold uppercase tracking-widest">Real-time Monitor</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            RAIL<span className="text-cyan-400">SAFE</span> <span className="font-light text-slate-500">v2.4</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold" htmlFor="crossing-filter">
              Filter Crossing
            </label>
            <select
              id="crossing-filter"
              value={selectedCrossId}
              onChange={(e) => setSelectedCrossId(e.target.value)}
              className="bg-slate-900/80 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Semua Crossing</option>
              {crossings.map((crossing) => (
                <option key={crossing.cross_id} value={crossing.cross_id}>
                  {crossing.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              Aktif: <span className="text-slate-300">{selectedCrossingName}</span>
            </p>
          </div>
          {crossingHint && <p className="text-xs text-amber-400 mt-2">{crossingHint}</p>}
          {error && <p className="text-xs text-rose-400 mt-2">Supabase error: {error}</p>}
          {loading && <p className="text-xs text-cyan-400/80 mt-2">Memuat data Supabase...</p>}
        </div>

        <div className="flex gap-4">
          <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-xl">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Active Alerts</p>
            <p className={`text-xl font-mono font-bold ${activeAlertsCount > 0 ? "text-rose-500" : "text-emerald-500"}`}>
              {activeAlertsCount} Issues
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-xl text-right">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Last Sync</p>
            <p className="text-xl font-mono font-bold text-cyan-400">{lastUpdatedAt || "--:--"}</p>
          </div>
        </div>
      </header>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatusCard
            title="Status Perlintasan"
            value={trainPresence.value}
            icon={<Train className={trainPresence.status === "danger" ? "animate-bounce" : ""} />}
            status={trainPresence.status}
            desc={trainPresence.desc}
          />
          <StatusCard
            title="Posisi Palang"
            value={toSafeLabel(latestGateEvent?.new_state, "UNKNOWN")}
            icon={<ShieldCheck />}
            status={gateStatus}
            desc="Berdasarkan event terakhir"
          />
          <StatusCard
            title="Kesehatan Sistem"
            value={activeAlertsCount === 0 ? "STABIL" : "GANGGUAN"}
            icon={<Zap />}
            status={activeAlertsCount === 0 ? "active" : "danger"}
            desc={`${activeAlertsCount} peringatan aktif`}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-4">
          <h2 className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">Sensor Telemetry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatusCard
              variant="compact"
              title="Ultrasonic Distance"
              value={
                latestUltrasonic?.distance_cm !== null && latestUltrasonic?.distance_cm !== undefined
                  ? `${latestUltrasonic.distance_cm} cm`
                  : "N/A"
              }
              icon={<Radio className="w-4 h-4" />}
              status={latestUltrasonic ? "active" : "warning"}
            />
            <StatusCard
              variant="compact"
              title="Infrared Status"
              value={latestInfrared?.object_detected ? "OBSTRUKSI" : latestInfrared ? "CLEAR" : "N/A"}
              icon={<Activity className="w-4 h-4" />}
              status={latestInfrared?.object_detected ? "danger" : latestInfrared ? "safe" : "warning"}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">Recent Critical Alerts</h2>
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
            {activeAlertsCount === 0 ? (
              <div className="p-8 text-center text-slate-600 text-sm italic">Tidak ada gangguan terdeteksi</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {alerts.map((alert) => (
                  <div key={alert.alert_id} className="p-4 flex items-center gap-4">
                    <div className="bg-rose-500/20 p-2 rounded-lg">
                      <AlertTriangle className="text-rose-500 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {toSafeLabel(alert.alert_type, "Alert")}
                        {alert.severity ? (
                          <span className="ml-2 text-[10px] uppercase text-amber-400">{alert.severity}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-500">{toSafeLabel(alert.message, "Tanpa pesan alert")}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{formatLocalShortTime(alert.triggered_at)}</p>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alert.alert_id)}
                      className="ml-auto text-[10px] bg-slate-800 hover:bg-emerald-600 hover:text-white px-3 py-1 rounded-md transition-all active:scale-95"
                    >
                      TANGANI
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
