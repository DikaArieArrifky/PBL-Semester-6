"use client";
import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Activity, AlertTriangle, Train, Cpu, MapPin,
  ShieldCheck, ShieldX, ArrowRight, RefreshCw
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import type { Alert } from '@/lib/types';
import type { CrossingStatus } from '@/hooks/useAdminDashboard';
import AlertCard from '@/components/ui/AlertCard';
import CrossingRow from '@/components/ui/CrossingRow';
import { formatTime, severityClass, severityRank } from './dashboardUtils';

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


export default function AdminDashboard() {
  const { crossingStatuses, stats, recentAlerts, loading, refetch } = useAdminDashboard();
  const router  = useRouter();
  const [search, setSearch] = useState('');

  const activeCrossings = useMemo(() => crossingStatuses.filter(cs => cs.crossing.status === 'active').length, [crossingStatuses]);
  const maintenanceCrossings = useMemo(() => crossingStatuses.filter(cs => cs.crossing.status === 'maintenance').length, [crossingStatuses]);
  const inactiveCrossings = useMemo(() => crossingStatuses.filter(cs => cs.crossing.status === 'inactive').length, [crossingStatuses]);

  const prioritizedAlerts = useMemo(() => {
    return [...recentAlerts]
      .sort((a, b) => {
        const severityDiff = severityRank(b.severity) - severityRank(a.severity);
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime();
      })
      .slice(0, 5);
  }, [recentAlerts]);

  const prioritizedCrossings = useMemo(() => {
    return [...crossingStatuses]
      .sort((a, b) => {
        const scoreA = (a.alertCount * 3) + a.sensorsStale + Math.max(0, a.devicesTotal - a.devicesOnline);
        const scoreB = (b.alertCount * 3) + b.sensorsStale + Math.max(0, b.devicesTotal - b.devicesOnline);
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }, [crossingStatuses]);

  const filtered = crossingStatuses.filter(cs =>
    cs.crossing.name.toLowerCase().includes(search.toLowerCase()) ||
    cs.crossing.location?.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredMemo = useMemo(() => filtered, [crossingStatuses, search]);

  

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-10">

      {/* Header */}
      <header className="flex flex-col gap-1 border-b border-slate-800/50 pb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <h1 className="text-3xl font-black tracking-tight text-white italic">
              ADMIN <span className="text-cyan-400">OVERVIEW</span>
            </h1>
          </div>
          <button
            type="button"
            aria-label="Refresh dashboard data"
            onClick={refetch}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Data
          </button>
        </div>
        <p className="text-slate-500 text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-500" />
          Monitoring seluruh perlintasan
        </p>
      </header>

      {/* Statistik Perlintasan */}
      {stats && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
          <StatCard
            label="Total Perlintasan"
            value={stats.totalCrossings}
            icon={<MapPin className="w-5 h-5 text-cyan-400" />}
            color="bg-cyan-500/10"
          />
          <StatCard
            label="Perlintasan Aktif"
            value={activeCrossings}
            icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
            color="bg-emerald-500/10"
          />
          <StatCard
            label="Maintenance"
            value={maintenanceCrossings}
            icon={<ShieldX className="w-5 h-5 text-amber-400" />}
            color="bg-amber-500/10"
          />
          <StatCard
            label="Tidak Aktif"
            value={inactiveCrossings}
            icon={<ShieldX className="w-5 h-5 text-red-400" />}
            color="bg-red-500/10"
          />
          <StatCard
            label="Kereta Hari Ini"
            value={stats.totalTrainToday}
            icon={<Train className="w-5 h-5 text-violet-400" />}
            color="bg-violet-500/10"
          />
          <StatCard
            label="Alert Aktif"
            value={stats.totalAlertOpen}
            icon={<AlertTriangle className="w-5 h-5 text-orange-400" />}
            color="bg-orange-500/10"
          />
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-[#0a0f18] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
                Alert Prioritas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Daftar alert unresolved yang paling penting untuk ditangani lebih dulu.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Cpu className="h-4 w-4 text-cyan-400" />
              {stats ? `${stats.totalDeviceOnline}/${stats.totalDeviceAll} device online` : '—'}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-900/70 animate-pulse" />
              ))}
            </div>
          ) : prioritizedAlerts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-500">
              Tidak ada alert aktif saat ini.
            </div>
          ) : (
            <div className="space-y-3">
              {prioritizedAlerts.map(alert => (
                <AlertCard key={alert.alert_id} alert={alert} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-800 bg-[#0a0f18] p-5">
          <h2 className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
            Ringkasan Operasional
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Device Online</p>
              <p className="mt-2 text-2xl font-black text-white">
                {stats?.totalDeviceOnline ?? 0}
                <span className="ml-2 text-sm font-semibold text-slate-500">/ {stats?.totalDeviceAll ?? 0}</span>
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Alert Aktif</p>
              <p className="mt-2 text-2xl font-black text-white">{stats?.totalAlertOpen ?? 0}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Sensor Sehat</p>
              <p className="mt-2 text-2xl font-black text-white">{stats?.totalSensorsHealthy ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Sensor Warning</p>
              <p className="mt-2 text-2xl font-black text-white">{stats?.totalSensorsWarning ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">Sensor Faulty</p>
              <p className="mt-2 text-2xl font-black text-white">{stats?.totalSensorsFaulty ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Sensor Stale</p>
              <p className="mt-2 text-2xl font-black text-white">{stats?.totalSensorsStale ?? 0}</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Fokuskan perhatian pada crossing dengan alert severity tinggi dan device offline.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-[#0a0f18] p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
              Crossing Prioritas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Crossing dengan kombinasi alert, sensor stale, dan device offline tertinggi.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Skor prioritas otomatis
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 rounded-2xl bg-slate-900/70 animate-pulse" />
            ))
          ) : prioritizedCrossings.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-500 lg:col-span-3">
              Tidak ada crossing yang membutuhkan perhatian khusus saat ini.
            </div>
          ) : (
            prioritizedCrossings.map(({ crossing, alertCount, devicesOnline, devicesTotal, sensorsStale, gateState }) => (
              <article
                key={crossing.cross_id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{crossing.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{crossing.location || '—'}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Buka detail ${crossing.name}`}
                    onClick={() => router.push(`/admin/crossing/${crossing.cross_id}`)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 transition hover:text-cyan-300"
                  >
                    Detail <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Gate</p>
                    <p className={`mt-1 font-bold ${gateState === 'CLOSED' ? 'text-red-400' : gateState === 'OPEN' ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {gateState ?? 'UNKNOWN'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Alert</p>
                    <p className={`mt-1 font-bold ${alertCount > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
                      {alertCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Device</p>
                    <p className={`mt-1 font-bold ${devicesOnline === devicesTotal ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {devicesOnline}/{devicesTotal}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Stale Sensor</p>
                    <p className="mt-1 font-bold text-cyan-300">
                      {sensorsStale}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

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
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Alert</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Sensor</th>
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
                ) : filteredMemo.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-600 text-sm">
                      Tidak ada perlintasan ditemukan
                    </td>
                  </tr>
                      ) : (
                        filteredMemo.map(cs => (
                          <CrossingRow key={cs.crossing.cross_id} cs={cs} />
                        ))
                      )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
