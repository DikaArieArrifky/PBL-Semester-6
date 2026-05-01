"use client";
import { useDashboardData } from "../../hooks/useDashboardData";
import { Clock, Timer, MapPin } from "lucide-react";
import { formatLocalShortTime } from "../../utils/dashboardFormatters";
import { Key } from "react";

export default function HistoryPage() {
  const dashboardData = useDashboardData();
  const { crossings, selectedCrossId, setSelectedCrossId, loading } = dashboardData;
  const trainHistory = (dashboardData as any).trainHistory ?? [];

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-10">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800/50 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-cyan-500 text-xs font-bold uppercase tracking-widest">Logs & Records</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            TRAIN<span className="text-cyan-400">HISTORY</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 p-2 rounded-xl">
          <MapPin className="text-cyan-500 w-4 h-4 ml-2" />
          <select
            value={selectedCrossId}
            onChange={(e) => setSelectedCrossId(e.target.value)}
            className="bg-transparent text-sm font-semibold outline-none text-slate-300 pr-4 cursor-pointer"
          >
            <option value="">Semua Perlintasan</option>
            {crossings.map((c) => (
              <option key={c.cross_id} value={c.cross_id}>{c.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* TABLE */}
      <div className="bg-slate-900/20 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 text-slate-500 text-[11px] uppercase tracking-[0.2em] font-bold border-b border-slate-800">
              <th className="px-8 py-5">Waktu Deteksi</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5">Durasi Penutupan</th>
              <th className="px-8 py-5 text-right">Log ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? (
              <tr><td colSpan={4} className="px-8 py-20 text-center text-cyan-500 animate-pulse">Sinkronisasi data...</td></tr>
            ) : trainHistory.length === 0 ? (
              <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-600 italic">Belum ada riwayat aktivitas kereta.</td></tr>
            ) : (
              trainHistory.map((log: { cleared_at: string | number | Date; detected_at: string | number | Date | null; train_id: any[] | Key | null | undefined; status: string; }, index: number) => {
                const detectedAt = typeof log.detected_at === "number" ? new Date(log.detected_at) : log.detected_at;
                const duration = log.cleared_at && detectedAt
                  ? `${Math.floor((new Date(log.cleared_at).getTime() - new Date(detectedAt).getTime()) / 1000)}s`
                  : "---";
                const rowKey: Key = typeof log.train_id === "string" || typeof log.train_id === "number"
                  ? log.train_id
                  : `train-log-${index}`;
                const logIdText = typeof log.train_id === "string" || typeof log.train_id === "number"
                  ? String(log.train_id).slice(0, 8)
                  : "---";

                return (
                  <tr key={rowKey} className="hover:bg-cyan-500/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-slate-800 rounded-xl group-hover:bg-cyan-500/20 transition-colors">
                          <Clock className="w-4 h-4 text-cyan-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{formatLocalShortTime(detectedAt)}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {detectedAt
                              ? new Date(detectedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
                              : "--"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${
                        log.status === 'completed' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {log.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <Timer className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-mono text-slate-300">{duration}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right font-mono text-[10px] text-slate-600">
                      #{logIdText}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}