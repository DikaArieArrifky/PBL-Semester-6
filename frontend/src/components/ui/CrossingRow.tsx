"use client";
import { useRouter } from 'next/router';
import { ShieldCheck, ShieldX, ArrowRight } from 'lucide-react';
import type { CrossingStatus } from '@/hooks/useAdminDashboard';
import { formatTime } from '@/components/dashboard/dashboardUtils';

export default function CrossingRow({ cs, onOpenDetail }: { cs: CrossingStatus; onOpenDetail?: (cs: CrossingStatus) => void }) {
  const router = useRouter();
  return (
    <tr key={cs.crossing.cross_id} className="hover:bg-slate-900/30 transition-colors group">
      <td className="px-5 py-4">
        <p className="text-sm font-bold text-white">{cs.crossing.name}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{cs.crossing.location || '—'}</p>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {cs.gateState === 'CLOSED' ? (
            <ShieldX className="w-4 h-4 text-red-400" />
          ) : cs.gateState === 'OPEN' ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-slate-500" />
          )}
          <div>
            <span className={`text-xs font-bold ${cs.gateState === 'CLOSED' ? 'text-red-400' : cs.gateState === 'OPEN' ? 'text-emerald-400' : 'text-slate-400'}`}>{cs.gateState ?? 'UNKNOWN'}</span>
            <p className="text-[9px] text-slate-600">{formatTime(cs.lastEventTime)}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="text-sm font-bold text-white">{cs.trainToday}</span>
        <span className="text-[10px] text-slate-500 ml-1">hari ini</span>
      </td>
      <td className="px-5 py-4">
        <span className={`text-sm font-bold ${cs.devicesOnline === cs.devicesTotal ? 'text-emerald-400' : 'text-amber-400'}`}>{cs.devicesOnline}/{cs.devicesTotal}</span>
      </td>
      <td className="px-5 py-4">
        <span className={`text-sm font-bold ${cs.alertCount > 0 ? 'text-orange-400' : 'text-slate-500'}`}>{cs.alertCount}</span>
      </td>
      <td className="px-5 py-4">
        <div className="text-[10px] leading-4 text-slate-400">
          <span className="text-emerald-400 font-bold">H {cs.sensorsHealthy}</span>
          <span className="mx-1 text-slate-600">/</span>
          <span className="text-amber-300 font-bold">W {cs.sensorsWarning}</span>
          <span className="mx-1 text-slate-600">/</span>
          <span className="text-red-400 font-bold">F {cs.sensorsFaulty}</span>
          <span className="mx-1 text-slate-600">/</span>
          <span className="text-cyan-300 font-bold">S {cs.sensorsStale}</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <button
          type="button"
          aria-label={`Buka detail ${cs.crossing.name}`}
          onClick={() => onOpenDetail ? onOpenDetail(cs) : router.push(`/admin/crossing/${cs.crossing.cross_id}`)}
          className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300 transition hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-200 whitespace-nowrap"
        >
          Detail <ArrowRight className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}
