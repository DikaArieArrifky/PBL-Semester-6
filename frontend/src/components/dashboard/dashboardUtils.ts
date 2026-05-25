export function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit'
  });
}

export function severityRank(severity: string): number {
  switch (severity) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

export function severityClass(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/10 text-red-300 border-red-500/30';
    case 'high': return 'bg-orange-500/10 text-orange-300 border-orange-500/30';
    case 'medium': return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    case 'low': return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
    default: return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  }
}
