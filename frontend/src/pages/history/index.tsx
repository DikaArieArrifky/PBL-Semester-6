"use client";
import { useState } from 'react';
import { History, Search, AlertCircle, ArrowRight, Activity, MapPin } from 'lucide-react';
import { useHistory } from '@/hooks/useHistory';
import { useCrossings } from '@/hooks/useCrossings';
import type { GateEventType } from '@/lib/types';

function EventBadge({ type }: { type: GateEventType }) {
  const map: Record<GateEventType, { label: string; cls: string; dot: string }> = {
    GATE_WARNING:   { label: 'WARNING',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
    GATE_CLOSING:   { label: 'CLOSING',   cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dot: 'bg-orange-500' },
    GATE_CLOSED:    { label: 'CLOSED',    cls: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' },
    GATE_OPENING:   { label: 'OPENING',   cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
    GATE_OPEN:      { label: 'OPEN',      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
    GATE_CANCELLED: { label: 'CANCELLED', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20', dot: 'bg-slate-500' },
  };
  const { label, cls } = map[type] ?? { label: type, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20', dot: 'bg-slate-500' };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

function StateBadge({ prev, next }: { prev: string | null; next: string | null }) {
  if (!prev && !next) return <span className="text-slate-600">—</span>;
  return (
    <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800/50 text-xs">
      {prev && (
        <span className="text-slate-500 font-mono">{prev}</span>
      )}
      {prev && next && <ArrowRight className="w-3.5 h-3.5 text-slate-600" />}
      {next && (
        <span className={`font-bold font-mono ${
          next === 'CLOSED' || next === 'CLOSING' ? 'text-red-400'
            : next === 'OPEN' ? 'text-emerald-400'
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

function getDotColor(type: string) {
  if (type.includes('CLOSED')) return 'bg-red-500 border-red-500/30';
  if (type.includes('OPEN')) return 'bg-emerald-500 border-emerald-500/30';
  if (type.includes('WARNING') || type.includes('CLOSING')) return 'bg-amber-500 border-amber-500/30';
  return 'bg-slate-500 border-slate-500/30';
}

export default function HistoryPage() {
  // 1. Ambil data crossings dan setSelected biar dinamis
  const { crossings, selected: crossId, setSelected, loading: crossLoading } = useCrossings();
  
  // 2. Tembakan realtime-nya kembali pakai variabel crossId
  const { events, loading: historyLoading, error } = useHistory(crossId, 100);
  
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
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/50 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
              <Activity className="text-cyan-400 w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Gate <span className="text-cyan-400">History</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-1">
            Visualisasi riwayat event palang — Realtime via Supabase
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Dropdown Pemilih Perlintasan */}
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
            {/* Custom Arrow biar lebih futuristik */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
               ▼
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cari event / sumber..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 w-full md:w-64 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="flex gap-2 flex-wrap">
        {EVENT_FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${
              filterType === opt.value
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
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

      <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex justify-between items-center mb-8 border-b border-slate-800/50 pb-4">
          <h2 className="text-slate-400 text-sm font-semibold tracking-widest uppercase">Live Event Stream</h2>
          <span className="text-xs text-cyan-500 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> Live
          </span>
        </div>

        {historyLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
               <div key={i} className="h-20 bg-slate-800/50 rounded-2xl animate-pulse ml-8" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
            <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
            {search || filterType !== 'all' ? 'Tidak ada event yang cocok dengan filter' : 'Belum ada riwayat event di perlintasan ini'}
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-800/70 ml-4 md:ml-6 space-y-6 pb-4">
            {filtered.map((ev) => (
              <div key={ev.event_id} className="relative pl-8 md:pl-10 group">
                
                <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-4 border-[#0a0f18] transition-all duration-300 group-hover:scale-125 ${getDotColor(ev.event_type)}`} />
                <div className="absolute left-0 top-6 w-8 border-t-2 border-dashed border-slate-800/50 -z-10" />

                <div className="bg-slate-900/30 hover:bg-slate-800/40 transition-colors border border-slate-800/60 hover:border-slate-700 rounded-2xl p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-5">
                      <div className="flex flex-col min-w-[90px]">
                        <span className="text-base font-bold text-slate-200">
                          {new Date(ev.occurred_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {new Date(ev.occurred_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month:'short' })}
                        </span>
                      </div>
                      <EventBadge type={ev.event_type} />
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <StateBadge prev={ev.previous_state} next={ev.new_state} />
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Trigger Source</span>
                        <span className="text-xs font-mono text-cyan-400 bg-cyan-400/5 px-2.5 py-1 rounded border border-cyan-400/10">
                          {ev.trigger_source || 'MANUAL'}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}