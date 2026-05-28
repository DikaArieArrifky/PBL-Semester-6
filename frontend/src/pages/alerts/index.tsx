"use client";
import { useState } from 'react';
import { Bell, ShieldCheck, AlertTriangle, CheckCircle, Clock, Filter, MapPin } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { useCrossings } from '@/hooks/useCrossings';
import type { Alert } from '@/lib/types';

function SeverityBadge({ severity }: { severity: Alert['severity'] }) {
  const map = {
    low:      'bg-slate-500/10 text-slate-400 border-slate-500/20',
    medium:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const labelMap = {
    low: 'Rendah',
    medium: 'Sedang',
    high: 'Tinggi',
    critical: 'Kritis',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${map[severity]}`}>
      {labelMap[severity]}
    </span>
  );
}

function AlertTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    SENSOR_TIMEOUT:   'bg-orange-500/10 text-orange-300 border-orange-500/20',
    WATCHDOG_RESTART: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    BLIND_SPOT:       'bg-red-500/10 text-red-300 border-red-500/20',
  };
  const cls = map[type] ?? 'bg-slate-500/10 text-slate-300 border-slate-500/20';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${cls}`}>
      {type}
    </span>
  );
}

const SEVERITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low'] as const;

export default function AlertsPage() {
  // 1. Ambil data crossings dan setSelected biar dropdownnya jalan
  const { crossings, selected: crossId, setSelected, loading: crossLoading } = useCrossings();
  
  // 2. Tarik data alerts berdasarkan crossId yang dipilih
  const { alerts, loading, error, resolveAlert } = useAlerts(crossId);

  const [filterResolved, setFilterResolved]   = useState<'active' | 'resolved' | 'all'>('active');
  const [filterSeverity, setFilterSeverity]   = useState<string>('all');
  const [resolvingId, setResolvingId]         = useState<string | null>(null);

  const filtered = alerts.filter(a => {
    const matchResolved =
      filterResolved === 'all'
        ? true
        : filterResolved === 'active'
        ? !a.resolved
        : a.resolved;
    const matchSeverity = filterSeverity === 'all' || a.severity === filterSeverity;
    return matchResolved && matchSeverity;
  });

  const activeCount   = alerts.filter(a => !a.resolved).length;
  const resolvedCount = alerts.filter(a => a.resolved).length;
  const criticalCount = alerts.filter(a => !a.resolved && a.severity === 'critical').length;

  async function handleResolve(alertId: string) {
    setResolvingId(alertId);
    await resolveAlert(alertId);
    setResolvingId(null);
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-8">

      {/* Header dengan Dropdown */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/50 pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 mb-1">
            <div className={`p-2 rounded-lg ${activeCount > 0 ? 'bg-red-500/10' : 'bg-cyan-500/10'}`}>
              <Bell className={`w-5 h-5 ${activeCount > 0 ? 'text-red-400' : 'text-cyan-400'}`} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Peringatan <span className="text-cyan-400">Sistem</span>
            </h1>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                {criticalCount} KRITIS
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm ml-1">
            Notifikasi anomali sensor, waktu habis, dan area tak terlihat
          </p>
        </div>

        {/* Dropdown Pemilih Perlintasan (Baru Ditambah) */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500 group-focus-within:text-cyan-400" />
            <select
              value={crossId || ''}
              onChange={(e) => setSelected(e.target.value)}
              disabled={crossLoading || crossings.length === 0}
              className="bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-8 text-sm font-semibold focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 w-full md:w-48 appearance-none cursor-pointer disabled:opacity-50 transition-all text-slate-200"
            >
              <option value="" disabled>
                {crossLoading ? 'Memuat lokasi...' : 'Pilih Perlintasan'}
              </option>
              {crossings.map(c => (
                <option key={c.cross_id} value={c.cross_id} className="bg-slate-900">
                  {c.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
               ▼
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Peringatan Aktif',    value: activeCount,   color: activeCount > 0 ? 'text-red-400' : 'text-slate-400' },
          { label: 'Peringatan Kritis', value: criticalCount, color: criticalCount > 0 ? 'text-red-400' : 'text-slate-400' },
          { label: 'Telah Diselesaikan', value: resolvedCount, color: 'text-emerald-400' },
        ].map((s, i) => (
          <div key={i} className="bg-[#0a0f18] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">{s.label}</p>
            <h2 className={`text-3xl font-black ${s.color}`}>{s.value}</h2>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 bg-slate-900/50 border border-slate-800 p-1 rounded-xl">
          {(['active', 'all', 'resolved'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setFilterResolved(opt)}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                filterResolved === opt
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-500 hover:text-white hover:bg-slate-800'
              }`}
            >
              {opt === 'active' ? 'Aktif' : opt === 'resolved' ? 'Selesai' : 'Semua'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <div className="flex gap-1">
            {SEVERITY_FILTERS.map(s => {
              const labelMap: Record<string, string> = {
                all: 'Semua Keparahan',
                critical: 'Kritis',
                high: 'Tinggi',
                medium: 'Sedang',
                low: 'Rendah'
              };
              return (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                  filterSeverity === s
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-600 hover:text-white hover:bg-slate-800'
                }`}
              >
                {labelMap[s]}
              </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Alert list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[#0a0f18] border border-slate-800 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-16 text-center">
          <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-400 font-bold">
            {filterResolved === 'active' ? 'Tidak ada peringatan aktif' : 'Tidak ada peringatan ditemukan'}
          </p>
          <p className="text-slate-600 text-sm mt-1">Sistem berjalan normal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert => (
            <div
              key={alert.alert_id}
              className={`bg-[#0a0f18] border rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                !alert.resolved && alert.severity === 'critical'
                  ? 'border-red-500/30 shadow-red-500/5'
                  : !alert.resolved && alert.severity === 'high'
                  ? 'border-orange-500/20'
                  : alert.resolved
                  ? 'border-slate-800/50 opacity-60 hover:opacity-100'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={alert.severity} />
                    <AlertTypeBadge type={alert.alert_type} />
                    {alert.resolved && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        SELESAI
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 font-medium">{alert.message}</p>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        Dipicu:{' '}
                        {new Date(alert.triggered_at).toLocaleString('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          day: '2-digit', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {alert.resolved && alert.resolved_at && (
                      <div className="flex items-center gap-1.5 text-emerald-500/60">
                        <CheckCircle className="w-3 h-3" />
                        <span>
                          Diselesaikan:{' '}
                          {new Date(alert.resolved_at).toLocaleString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {!alert.resolved && (
                  <button
                    onClick={() => handleResolve(alert.alert_id)}
                    disabled={resolvingId === alert.alert_id}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase transition-all disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {resolvingId === alert.alert_id ? 'Menyimpan...' : 'Selesaikan'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}