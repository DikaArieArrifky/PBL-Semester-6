"use client";
import { X, ArrowRight } from 'lucide-react';
import type { CrossingStatus } from '@/hooks/useAdminDashboard';
import { formatTime } from '@/components/dashboard/dashboardUtils';

export default function DetailModal({
  cs,
  onClose,
  onOpenPage,
}: {
  cs: CrossingStatus | null;
  onClose: () => void;
  onOpenPage?: (id: string) => void;
}) {
  if (!cs) return null;

  const { crossing } = cs;
  const sensorItems = [
    { label: 'Healthy', count: cs.sensorsHealthy, color: 'bg-emerald-400', textColor: 'text-emerald-400' },
    { label: 'Warning', count: cs.sensorsWarning, color: 'bg-amber-300', textColor: 'text-amber-300' },
    { label: 'Faulty', count: cs.sensorsFaulty, color: 'bg-red-400', textColor: 'text-red-400' },
    { label: 'Offline', count: cs.sensorsOffline ?? 0, color: 'bg-slate-500', textColor: 'text-slate-500' },
  ];
  const totalSensors = Math.max(sensorItems.reduce((s, it) => s + it.count, 0), 1);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0f18] border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">{crossing.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{crossing.location || '—'}</p>
          </div>
          <div className="flex items-center gap-3">
            {onOpenPage && (
              <button
                onClick={() => onOpenPage(crossing.cross_id)}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20"
              >
                Buka halaman <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Gate</p>
              <p className="mt-1 font-bold text-white">{cs.gateState ?? 'UNKNOWN'}</p>
              <p className="text-xs text-slate-600">Terakhir: {formatTime(cs.lastEventTime)}</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Devices</p>
              <p className="mt-1 font-bold text-white">{cs.devicesOnline}/{cs.devicesTotal}</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Alerts</p>
              <p className="mt-1 font-bold text-orange-400">{cs.alertCount}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Sensors</p>
              <div className="mt-3 space-y-3">
                {sensorItems.map(item => {
                  const pct = Math.round((item.count / totalSensors) * 100);
                  return (
                    <div key={item.label} className="">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${item.textColor}`}>{item.label}</span>
                        <span className="text-slate-500">{item.count}</span>
                      </div>
                      <div className="h-2 mt-1 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                        <div className={`${item.color} h-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}

                <div className="text-[10px] text-slate-400">
                  <span className="text-cyan-300 font-bold">Stale: {cs.sensorsStale}</span>
                </div>
              </div>
            </div>

            {/* Info Lain removed per request */}
          </div>
        </div>
      </div>
    </div>
  );
}
