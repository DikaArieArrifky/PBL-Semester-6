"use client";
import { useRouter } from 'next/router';
import { ArrowRight } from 'lucide-react';
import type { Alert } from '@/lib/types';
import { formatTime, severityClass } from '@/components/dashboard/dashboardUtils';

export default function AlertCard({ alert }: { alert: Alert & { crossings?: { name: string } } }) {
  const router = useRouter();
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${severityClass(alert.severity)}`}>
              {alert.severity}
            </span>
            <span className="text-xs text-slate-600">{formatTime(alert.triggered_at)} WIB</span>
          </div>
          <h3 className="mt-2 truncate text-sm font-bold text-white">{alert.crossings?.name || 'Perlintasan tidak diketahui'}</h3>
          <p className="mt-1 text-sm text-slate-400">{alert.message}</p>
        </div>
        <button
          type="button"
          aria-label={`Buka detail alert di ${alert.crossings?.name ?? 'perlintasan'}`}
          onClick={() => router.push(`/admin/crossing/${alert.cross_id}`)}
          className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 transition hover:text-cyan-300"
        >
          Detail <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </article>
  );
}
