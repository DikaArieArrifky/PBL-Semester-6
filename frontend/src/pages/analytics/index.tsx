"use client";
import { useState, useMemo } from 'react';
import { Calendar, TrendingUp, Train, ArrowUpRight, AlertCircle } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCrossings } from '@/hooks/useCrossings';

type Period = 'daily' | 'monthly' | 'yearly';

const PERIOD_LABELS: Record<Period, string> = {
  daily:   'Daily',
  monthly: 'Monthly',
  yearly:  'Yearly',
};

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('daily');
  const { selected: crossId } = useCrossings();
  const { data, loading, error } = useAnalytics(crossId, period);

  // Format label sumbu X sesuai period
  const chartData = useMemo(() => data.map(row => ({
    label: period === 'daily'
      ? new Date(row.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      : period === 'monthly'
      ? new Date(row.tanggal).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      : new Date(row.tanggal).getFullYear().toString(),
    count:          row.total_kereta,
    avgDuration:    row.rata_durasi,
    maxDuration:    row.durasi_terlama,
  })), [data, period]);

  const maxValue    = chartData.length > 0 ? Math.max(...chartData.map(d => d.count), 1) : 1;
  const totalTrains = chartData.reduce((acc, d) => acc + d.count, 0);
  const peakDay     = chartData.reduce((prev, curr) => curr.count > prev.count ? curr : prev, chartData[0]);
  const avgRate     = chartData.length > 0 ? (totalTrains / chartData.length).toFixed(1) : '0';

  const svgPoints = useMemo(() => {
    if (chartData.length < 2) return '';
    const spacing = 600 / (chartData.length - 1);
    return chartData.map((item, i) => {
      const x = i * spacing + 50;
      const y = 200 - (item.count / maxValue) * 160;
      return `${x},${y}`;
    }).join(' ');
  }, [chartData, maxValue]);

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-10">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/50 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-cyan-500/10 p-2 rounded-lg">
              <TrendingUp className="text-cyan-400 w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Traffic <span className="text-cyan-400">Analytics</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-1">
            Data historis perlintasan —{' '}
            <span className="text-slate-300">realtime dari database</span>
          </p>
        </div>

        {/* Period filter */}
        <div className="flex bg-slate-900/50 border border-slate-800 p-1 rounded-xl w-fit">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(opt => (
            <button
              key={opt}
              onClick={() => setPeriod(opt)}
              className={`px-6 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                period === opt
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {PERIOD_LABELS[opt]}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Gagal mengambil data: {error}. Pastikan backend berjalan.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Main chart */}
        <div className="lg:col-span-3 bg-[#0a0f18] border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mb-1">
                Data Visualization
              </p>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Jumlah Kereta <ArrowUpRight className="w-4 h-4 text-cyan-500" />
              </h3>
            </div>
            <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800 text-right">
              <span className="text-cyan-400 font-black text-2xl tracking-tighter">
                {loading ? '...' : totalTrains.toLocaleString()}
              </span>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-tighter">
                Total Kereta
              </p>
            </div>
          </div>

          <div className="relative h-[280px] w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                Belum ada data untuk periode ini
              </div>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 700 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 80, 120, 160, 200].map(y => (
                  <line key={y} x1="50" x2="650" y1={y} y2={y}
                    className="stroke-slate-800/50 stroke-[1]" strokeDasharray="6,6" />
                ))}
                {svgPoints && (
                  <>
                    <polygon
                      points={`50,200 ${svgPoints} 650,200`}
                      fill="url(#areaGrad)"
                    />
                    <polyline
                      points={svgPoints}
                      fill="none" stroke="#22d3ee" strokeWidth="3"
                      strokeLinecap="round" strokeLinejoin="round"
                    />
                  </>
                )}
                {chartData.map((item, i) => {
                  const spacing = 600 / Math.max(chartData.length - 1, 1);
                  const x = i * spacing + 50;
                  const y = 200 - (item.count / maxValue) * 160;
                  return (
                    <g key={i} className="group/pt cursor-crosshair">
                      <circle cx={x} cy={y} r="5"
                        className="fill-slate-950 stroke-cyan-400 stroke-[3]" />
                      <rect x={x - 18} y={y - 36} width="36" height="20" rx="4"
                        className="fill-cyan-500 opacity-0 group-hover/pt:opacity-100 transition-opacity" />
                      <text x={x} y={y - 22} textAnchor="middle"
                        className="fill-slate-950 text-[10px] font-black opacity-0 group-hover/pt:opacity-100 transition-opacity">
                        {item.count}
                      </text>
                      <text x={x} y="235" textAnchor="middle"
                        className="fill-slate-600 text-[9px] font-bold uppercase">
                        {item.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Stats side */}
        <div className="flex flex-col gap-6">
          <div className="flex-1 bg-slate-900/30 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
            <div className="bg-emerald-500/10 w-fit p-3 rounded-2xl mb-4">
              <Train className="text-emerald-400 w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">
                Peak Period
              </p>
              <h4 className="text-2xl font-black text-white italic">
                {loading ? '...' : peakDay?.label || '—'}
              </h4>
              <p className="text-slate-600 text-xs mt-1">
                {loading ? '' : `${peakDay?.count ?? 0} kereta`}
              </p>
            </div>
          </div>

          <div className="flex-1 bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/10 p-6 rounded-3xl flex flex-col justify-between">
            <div className="bg-cyan-500/10 w-fit p-3 rounded-2xl mb-4">
              <Calendar className="text-cyan-400 w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">
                Avg Rate
              </p>
              <h4 className="text-2xl font-black text-white italic">
                {loading ? '...' : avgRate}
              </h4>
              <p className="text-cyan-400/60 text-[10px] font-bold italic mt-1 uppercase">
                Kereta / Periode
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}