"use client";
import { useState } from 'react';
import { History, Search, Clock, ShieldX, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { useHistory } from '@/hooks/useHistory';
import { useCrossings } from '@/hooks/useCrossings';
import type { GateEventType } from '@/lib/types';

function EventBadge({ type }: { type: GateEventType }) {
  const map: Record<GateEventType, { label: string; cls: string }> = {
    GATE_WARNING:   { label: 'WARNING',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    GATE_CLOSING:   { label: 'CLOSING',   cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    GATE_CLOSED:    { label: 'CLOSED',    cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
    GATE_OPENING:   { label: 'OPENING',   cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    GATE_OPEN:      { label: 'OPEN',      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    GATE_CANCELLED: { label: 'CANCELLED', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  };
  const { label, cls } = map[type] ?? { label: type, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function StateBadge({ prev, next }: { prev: string | null; next: string | null }) {
  if (!prev && !next) return <span className="text-slate-600">—</span>;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {prev && (
        <span className="text-slate-500 font-mono">{prev}</span>
      )}
      {prev && next && <ArrowRight className="w-3 h-3 text-slate-600" />}
      {next && (
        <span className={`font-bold font-mono ${
          next === 'CLOSED' || next === 'CLOSING'
            ? 'text-red-400'
            : next === 'OPEN'
            ? 'text-emerald-400'
            : 'text-amber-400'
        }`}>
          {next}
        </span>
      )}
    </div>
  );
}

const EVENT_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all',            label: 'Semua' },
  { value: 'GATE_WARNING',   label: 'Warning' },
  { value: 'GATE_CLOSING',   label: 'Closing' },
  { value: 'GATE_CLOSED',    label: 'Closed' },
  { value: 'GATE_OPENING',   label: 'Opening' },
  { value: 'GATE_OPEN',      label: 'Open' },
  { value: 'GATE_CANCELLED', label: 'Cancelled' },
];

export default function HistoryPage() {
  const { selected: crossId } = useCrossings();
  const { events, loading, error } = useHistory(crossId, 100);
  const [search, setSearch]       = useState('');
  const [filterType, setFilter]   = useState('all');

  const filtered = events.filter(e => {
    const matchSearch = !search ||
      e.event_type.toLowerCase().includes(search.toLowerCase()) ||
      (e.trigger_source?.toLowerCase() ?? '').includes(search.toLowerCase());
    const matchType = filterType === 'all' || e.event_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-8">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/50 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-cyan-500/10 p-2 rounded-lg">
              <History className="text-cyan-400 w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Gate <span className="text-cyan-400">History</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-1">
            Riwayat event palang — update realtime via Supabase
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cari event / sumber..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 w-52 transition-all"
            />
          </div>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {EVENT_FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
              filterType === opt.value
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50">
                {['Waktu (WIB)', 'Event', 'Sumber', 'State Transition'].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-3 bg-slate-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-slate-600 text-sm">
                    {search || filterType !== 'all'
                      ? 'Tidak ada event yang cocok'
                      : 'Belum ada riwayat event'}
                  </td>
                </tr>
              ) : (
                filtered.map(ev => (
                  <tr key={ev.event_id} className="hover:bg-cyan-500/[0.02] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                        <div>
                          <p className="text-sm font-bold text-slate-200">
                            {new Date(ev.occurred_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
                          </p>
                          <p className="text-[10px] text-slate-600 font-mono">
                            {new Date(ev.occurred_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <EventBadge type={ev.event_type} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {ev.trigger_source || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StateBadge prev={ev.previous_state} next={ev.new_state} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-900/20 flex items-center justify-between">
          <p className="text-xs text-slate-600 px-2">
            {loading ? 'Memuat...' : `${filtered.length} event ditampilkan`}
          </p>
          <p className="text-[10px] text-slate-700 px-2">
            Update realtime • Max 100 event terbaru
          </p>
        </div>
      </div>
    </div>
  );
}