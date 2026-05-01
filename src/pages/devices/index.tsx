"use client";

import { Cpu, Radio, Activity, Wifi, RefreshCw, CircleDot, Settings2 } from "lucide-react";
import { useDevicesViewModel } from "../../hooks/useDevicesViewModel";
import { formatDateTime, getStatusMeta } from "../../utils/devicesFormatters";

export default function DevicesPage() {
  const {
    loading,
    error,
    crossings,
    devices,
    selectedCrossId,
    setSelectedCrossId,
    refresh,
    summary,
    selectedCrossingLabel,
    getCrossingLabel,
  } = useDevicesViewModel();

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/50 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-cyan-500/10 p-2 rounded-lg">
              <Settings2 className="text-cyan-400 w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Device <span className="text-cyan-400">Inventory</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm font-medium ml-1">
            Real-time peripheral health and connectivity status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold" htmlFor="crossing-filter">
            Crossing
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

          <button
            onClick={refresh}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            REFRESH HARDWARE
          </button>
        </div>
      </header>

      {loading && <p className="text-xs text-cyan-400/80">Memuat data perangkat...</p>}
      {error && <p className="text-xs text-rose-400">Supabase error: {error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0a0f18] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Total Hardware</p>
            <h2 className="text-2xl font-black text-white mt-1">{summary.total} Units</h2>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <Cpu className="text-cyan-400" />
          </div>
        </div>

        <div className="bg-[#0a0f18] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Online</p>
            <h2 className="text-2xl font-black text-white mt-1">{summary.online}</h2>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <Activity className="text-emerald-400" />
          </div>
        </div>

        <div className="bg-[#0a0f18] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Offline</p>
            <h2 className="text-2xl font-black text-white mt-1">{summary.offline}</h2>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <Wifi className="text-rose-400" />
          </div>
        </div>

        <div className="bg-[#0a0f18] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Maintenance</p>
            <h2 className="text-2xl font-black text-white mt-1">{summary.maintenance}</h2>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <Radio className="text-amber-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {devices.map((device) => {
          const meta = getStatusMeta(device.status);

          return (
            <div
              key={device.device_id}
              className={`rounded-3xl overflow-hidden group transition-all duration-300 shadow-xl border ${meta.cardClass}`}
            >
              <div className="p-6 border-b border-slate-800/50 flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-cyan-400 group-hover:scale-110 transition-transform">
                    {device.type.toLowerCase().includes("servo") ? (
                      <Activity className="w-5 h-5" />
                    ) : device.type.toLowerCase().includes("infra") ? (
                      <Cpu className="w-5 h-5" />
                    ) : (
                      <Radio className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg leading-tight">{device.type}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                      {device.model ?? "Unknown model"}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded-md text-slate-400 font-mono">
                  {device.device_id.slice(0, 8)}
                </span>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CircleDot className={`w-3 h-3 animate-pulse ${meta.dotClass}`} />
                      <span className={`text-xs font-black tracking-widest ${meta.textClass}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-white">
                      {device.mqtt_client_id ?? "No MQTT ID"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Last Seen</p>
                    <p className="text-sm font-bold text-slate-300">
                      {formatDateTime(device.last_seen_at)}
                    </p>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${meta.barClass}`} style={{ width: "100%" }} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div>
                    <p className="uppercase font-bold tracking-wider">MAC</p>
                    <p className="text-slate-300 break-all">{device.mac_address ?? "-"}</p>
                  </div>
                  <div>
                    <p className="uppercase font-bold tracking-wider">Firmware</p>
                    <p className="text-slate-300">{device.firmware_version ?? "-"}</p>
                  </div>
                  <div>
                    <p className="uppercase font-bold tracking-wider">Cross</p>
                    <p className="text-slate-300">{getCrossingLabel(device.cross_id)}</p>
                  </div>
                  <div>
                    <p className="uppercase font-bold tracking-wider">Registered</p>
                    <p className="text-slate-300">{formatDateTime(device.registered_at)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-mono text-slate-500">
                      {selectedCrossId ? `Filtered: ${selectedCrossingLabel}` : "All crossings"}
                    </span>
                  </div>
                  <button className="text-[10px] font-bold text-cyan-500 hover:text-cyan-300 transition-colors uppercase tracking-widest">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}