"use client";
import { useState } from 'react';
import { Bell, ShieldCheck, AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';
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
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${map[severity]}`}>
      {severity}
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
  const { selected: crossId } = useCrossings();
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

      {/* Header */}
      <header className="flex flex-col gap-1 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className={`p-2 rounded-lg ${activeCount > 0 ? 'bg-red-500/10' : 'bg-cyan-500/10'}`}>
            <Bell className={`w-5 h-5 ${activeCount > 0 ? 'text-red-400' : 'text-cyan-400'}`} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
            System <span className="text-cyan-400">Alerts</span>
          </h1>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
              {criticalCount} CRITICAL
            </span>
          )}
        </div>
        <p className="text-slate-500 text-sm ml-1">
          Notifikasi anomali sensor, timeout, dan blind spot
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Alert Aktif',    value: activeCount,   color: activeCount > 0 ? 'text-red-400' : 'text-slate-400' },
          { label: 'Alert Critical', value: criticalCount, color: criticalCount > 0 ? 'text-red-400' : 'text-slate-400' },
          { label: 'Sudah Resolved', value: resolvedCount, color: 'text-emerald-400' },
        ].map((s, i) => (
          <div key={i} className="bg-[#0a0f18] border border-slate-800 rounded-2xl p-5">
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
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              {opt === 'active' ? 'Aktif' : opt === 'resolved' ? 'Resolved' : 'Semua'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <div className="flex gap-1">
            {SEVERITY_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                  filterSeverity === s
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-600 hover:text-white'
                }`}
              >
                {s === 'all' ? 'Semua Severity' : s}
              </button>
            ))}
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
            {filterResolved === 'active' ? 'Tidak ada alert aktif' : 'Tidak ada alert ditemukan'}
          </p>
          <p className="text-slate-600 text-sm mt-1">Sistem berjalan normal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert => (
            <div
              key={alert.alert_id}
              className={`bg-[#0a0f18] border rounded-2xl p-5 transition-all ${
                !alert.resolved && alert.severity === 'critical'
                  ? 'border-red-500/30 shadow-red-500/5 shadow-lg'
                  : !alert.resolved && alert.severity === 'high'
                  ? 'border-orange-500/20'
                  : alert.resolved
                  ? 'border-slate-800/50 opacity-60'
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
                        RESOLVED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 font-medium">{alert.message}</p>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        Triggered:{' '}
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
                          Resolved:{' '}
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
                    {resolvingId === alert.alert_id ? 'Saving...' : 'Resolve'}
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