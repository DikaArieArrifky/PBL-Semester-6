"use client";
import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Activity, AlertTriangle, Train, Cpu, MapPin,
  ShieldCheck, ShieldX, ArrowRight, RefreshCw
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';

function StatCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-[#0a0f18] border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
      <div>
        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{label}</p>
        <h2 className="text-2xl font-black text-white mt-1">{value}</h2>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    </div>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit'
  });
}

export default function AdminDashboard() {
  const { crossingStatuses, stats, recentAlerts, loading } = useAdminDashboard();
  const router  = useRouter();
  const [search, setSearch] = useState('');

  const filtered = crossingStatuses.filter(cs =>
    cs.crossing.name.toLowerCase().includes(search.toLowerCase()) ||
    cs.crossing.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-10">

      {/* Header */}
      <header className="flex flex-col gap-1 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <h1 className="text-3xl font-black tracking-tight text-white italic">
            ADMIN <span className="text-cyan-400">OVERVIEW</span>
          </h1>
        </div>
        <p className="text-slate-500 text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-500" />
          Monitoring seluruh perlintasan
        </p>
      </header>

      {/* Statistik Perlintasan */}
      {stats && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total Perlintasan"
            value={stats.totalCrossings}
            icon={<MapPin className="w-5 h-5 text-cyan-400" />}
            color="bg-cyan-500/10"
          />
          <StatCard
            label="Perlintasan Aktif"
            value={stats.totalCrossings}
            icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
            color="bg-emerald-500/10"
          />
          <StatCard
            label="Perlintasan Tidak Aktif"
            value="0"
            icon={<ShieldX className="w-5 h-5 text-red-400" />}
            color="bg-red-500/10"
          />
        </section>
      )}

      {/* Tabel status semua perlintasan */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
              Status Semua Perlintasan
            </h2>
            <input
              type="text"
              placeholder="Cari perlintasan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 w-48 transition-all"
            />
          </div>

          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-800">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Perlintasan</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Palang</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Kereta</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Device</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {[1,2,3,4,5].map(j => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-3 bg-slate-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-600 text-sm">
                      Tidak ada perlintasan ditemukan
                    </td>
                  </tr>
                ) : (
                  filtered.map(({ crossing, gateState, lastEventTime, devicesOnline, devicesTotal, trainToday, alertCount }) => (
                    <tr key={crossing.cross_id} className="hover:bg-slate-900/30 transition-colors group">
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-white">{crossing.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{crossing.location || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {gateState === 'CLOSED' ? (
                            <ShieldX className="w-4 h-4 text-red-400" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          )}
                          <div>
                            <span className={`text-xs font-bold ${gateState === 'CLOSED' ? 'text-red-400' : 'text-emerald-400'}`}>
                              {gateState ?? 'UNKNOWN'}
                            </span>
                            <p className="text-[9px] text-slate-600">{formatTime(lastEventTime)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-white">{trainToday}</span>
                        <span className="text-[10px] text-slate-500 ml-1">hari ini</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-bold ${devicesOnline === devicesTotal ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {devicesOnline}/{devicesTotal}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => router.push(`/admin/crossing/${crossing.cross_id}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-cyan-400 text-xs font-bold"
                        >
                          Detail <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
