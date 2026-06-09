"use client";
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Activity, AlertTriangle, Train, Cpu, MapPin,
  ShieldCheck, ShieldX, ArrowRight, RefreshCw,
  Calendar, TrendingUp, ArrowUpRight, AlertCircle
} from 'lucide-react';
import DetailModal from '@/components/ui/DetailModal';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCrossings } from '@/hooks/useCrossings';
import type { Alert } from '@/lib/types';
import type { CrossingStatus } from '@/hooks/useAdminDashboard';
import AlertCard from '@/components/ui/AlertCard';
import CrossingRow from '@/components/ui/CrossingRow';
import { formatTime, severityClass, severityRank } from './dashboardUtils';

type Period = 'daily' | 'monthly' | 'yearly';
const PERIOD_LABELS: Record<Period, string> = {
  daily:   'Daily',
  monthly: 'Monthly',
  yearly:  'Yearly',
};

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
  const [selectedCS, setSelectedCS] = useState<null | typeof crossingStatuses[number]>(null);

  const devicePendingCount = stats?.totalDevicePending || 0;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setChartWidth(Math.max(entries[0].contentRect.width, 650));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Analytics state & hooks
  const [period, setPeriod] = useState<Period>('daily');
  const now = new Date();
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);
  const { crossings: analyticsCrossings, selected: crossSelectId, setSelected: setCrossSelectId, loading: crossLoading } = useCrossings();
  const [analyticsCrossId, setAnalyticsCrossId] = useState<string>('all');
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useAnalytics(
    analyticsCrossId,
    period,
    period !== 'yearly' ? filterYear : null,
    period === 'daily' ? filterMonth : null,
    analyticsCrossings.map(c => c.cross_id).join(',')
  );

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) years.push(y);
    return years;
  }, []);

  const chartData = useMemo(() => {
    // Client-side filtering to ensure data strictly matches the selected filters
    // This acts as a fallback if the backend ignores the query params (e.g. old code running)
    const dataArray = Array.isArray(analyticsData) ? analyticsData : [];
    const filteredData = dataArray.filter(row => {
      const date = new Date(row.tanggal);
      if (period !== 'yearly' && filterYear && date.getFullYear() !== filterYear) return false;
      if (period === 'daily' && filterMonth && (date.getMonth() + 1) !== filterMonth) return false;
      return true;
    });

    return filteredData.map(row => ({
      label: period === 'daily'
        ? new Date(row.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
        : period === 'monthly'
        ? new Date(row.tanggal).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
        : new Date(row.tanggal).getFullYear().toString(),
      count:          row.total_kereta,
      avgDuration:    row.rata_durasi,
      maxDuration:    row.durasi_terlama,
    }));
  }, [analyticsData, period, filterYear, filterMonth]);

  const maxChartValue  = chartData.length > 0 ? Math.max(...chartData.map(d => d.count), 1) : 1;
  const totalTrains    = chartData.reduce((acc, d) => acc + d.count, 0);
  const peakDay        = chartData.reduce((prev, curr) => curr.count > prev.count ? curr : prev, chartData[0]);
  const avgRate        = chartData.length > 0 ? (totalTrains / chartData.length).toFixed(1) : '0';
  const chartLoading   = crossLoading || analyticsLoading;

  const svgPoints = useMemo(() => {
    if (chartData.length < 2) return '';
    const spacing = (chartWidth - 100) / Math.max(chartData.length - 1, 1);
    return chartData.map((item, i) => {
      const x = i * spacing + 50;
      const y = 200 - (item.count / maxChartValue) * 160;
      return `${x},${y}`;
    }).join(' ');
  }, [chartData, maxChartValue, chartWidth]);

  const getPriorityScore = (cs: CrossingStatus) => (
    (cs.alertCount * 3) + cs.sensorsStale + Math.max(0, cs.devicesTotal - cs.devicesOnline)
  );

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

  const filteredMemo = useMemo(() => {
    return crossingStatuses
      .filter(cs =>
        cs.crossing.name.toLowerCase().includes(search.toLowerCase()) ||
        cs.crossing.location?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  }, [crossingStatuses, search]);

  

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
        <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
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
          <StatCard
            label="Device Pending"
            value={devicePendingCount}
            icon={<Cpu className="w-5 h-5 text-amber-400" />}
            color="bg-amber-500/10"
          />
        </section>
      )}
      {selectedCS && (
        <DetailModal
          cs={selectedCS}
          onClose={() => setSelectedCS(null)}
          onOpenPage={(id) => {
            setSelectedCS(null);
            router.push(`/admin/crossing/${id}`);
          }}
        />
      )}

      {/* Analytics Chart Section */}
      <section className="space-y-4 rounded-3xl border border-slate-800 bg-[#0a0f18] p-5">
        {/* Section header with inline controls */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
              Traffic Analytics
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Data historis perlintasan — hasil komputasi agregasi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Crossing selector */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500" />
              <select
                value={analyticsCrossId}
                onChange={(e) => setAnalyticsCrossId(e.target.value)}
                disabled={crossLoading || analyticsCrossings.length === 0}
                className="bg-slate-950/60 border border-slate-800 rounded-xl py-2 pl-9 pr-7 text-xs font-bold focus:outline-none focus:border-cyan-500/50 w-44 appearance-none cursor-pointer disabled:opacity-50 transition-all text-slate-300"
              >
                <option value="all">
                  {crossLoading ? 'Memuat...' : 'Semua Perlintasan'}
                </option>
                {analyticsCrossings.map(c => (
                  <option key={c.cross_id} value={c.cross_id} className="bg-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 text-[10px]">
                ▼
              </div>
            </div>
            {/* Period filter */}
            <div className="flex bg-slate-950/60 border border-slate-800 p-0.5 rounded-lg">
              {(Object.keys(PERIOD_LABELS) as Period[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => setPeriod(opt)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${
                    period === opt
                      ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {PERIOD_LABELS[opt]}
                </button>
              ))}
            </div>
            {/* Date filters */}
            {period !== 'yearly' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {/* Year picker */}
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  className="bg-slate-950/60 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-all"
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y} className="bg-slate-900">{y}</option>
                  ))}
                </select>
                {/* Month picker (only for daily) */}
                {period === 'daily' && (
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(Number(e.target.value))}
                    className="bg-slate-950/60 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-all"
                  >
                    {[
                      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                      'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
                    ].map((label, i) => (
                      <option key={i + 1} value={i + 1} className="bg-slate-900">{label}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {analyticsError && (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 text-rose-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Gagal mengambil data: {analyticsError}
          </div>
        )}

        {/* Summary stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Total Kereta (Periode)</p>
            <p className="mt-2 text-2xl font-black text-white">
              {chartLoading ? <span className="inline-block w-8 h-5 bg-slate-800 rounded animate-pulse" /> : totalTrains.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Peak Period</p>
            <p className="mt-2 text-2xl font-black text-white">
              {chartLoading ? <span className="inline-block w-12 h-5 bg-slate-800 rounded animate-pulse" /> : peakDay?.label || '—'}
            </p>
            <p className="text-slate-500 text-[10px] mt-0.5">
              {chartLoading ? '' : `${peakDay?.count ?? 0} kereta`}
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Avg Rate</p>
            <p className="mt-2 text-2xl font-black text-white">
              {chartLoading ? <span className="inline-block w-8 h-5 bg-slate-800 rounded animate-pulse" /> : avgRate}
            </p>
            <p className="text-slate-500 text-[10px] mt-0.5">kereta / periode</p>
          </div>
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Avg Durasi</p>
            <p className="mt-2 text-2xl font-black text-white">
              {chartLoading ? (
                <span className="inline-block w-8 h-5 bg-slate-800 rounded animate-pulse" />
              ) : chartData.length > 0 ? (
                `${(chartData.reduce((a, d) => a + d.avgDuration, 0) / chartData.length).toFixed(0)}s`
              ) : '—'}
            </p>
            <p className="text-slate-500 text-[10px] mt-0.5">detik / kereta</p>
          </div>
        </div>

        {/* Chart area */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Jumlah Kereta</h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {PERIOD_LABELS[period]}
            </span>
          </div>
          <div className="relative h-[240px] w-full overflow-x-auto overflow-y-hidden custom-scrollbar" style={{ scrollbarWidth: 'none' }} ref={containerRef}>
            <div className="h-full relative" style={{ minWidth: '650px', width: chartWidth }}>
              {chartLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center text-slate-600 text-sm">
                  Belum ada data untuk periode ini
                </div>
              ) : (
                <svg width="100%" height="240" viewBox={`0 0 ${chartWidth} 240`}>
                  <defs>
                    <linearGradient id="dashAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Y-Axis Lines and Labels */}
                  {[40, 80, 120, 160, 200].map((y, i) => {
                    const val = maxChartValue * (4 - i) / 4;
                    return (
                      <g key={y}>
                        <text x="40" y={y + 3} className="fill-slate-500 text-[10px] font-mono" textAnchor="end">
                          {Math.round(val)}
                        </text>
                        <line x1="50" x2={chartWidth - 50} y1={y} y2={y}
                          className="stroke-slate-800/40 stroke-[1]" strokeDasharray="4,6" />
                      </g>
                    );
                  })}

                  {/* X-Axis and Y-Axis Main Lines */}
                  <line x1="50" x2={chartWidth - 50} y1="200" y2="200" className="stroke-slate-700 stroke-[2]" />
                  <line x1="50" x2="50" y1="40" y2="200" className="stroke-slate-700 stroke-[2]" />

                  {svgPoints && (
                    <>
                      <polygon points={`50,200 ${svgPoints} ${chartWidth - 50},200`} fill="url(#dashAreaGrad)" />
                      <polyline points={svgPoints} fill="none" stroke="#22d3ee" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  )}
                  {chartData.map((item, i) => {
                    const spacing = (chartWidth - 100) / Math.max(chartData.length - 1, 1);
                    const x = i * spacing + 50;
                    const y = 200 - (item.count / maxChartValue) * 160;
                  return (
                    <g key={i} className="group/pt cursor-crosshair">
                      <circle cx={x} cy={y} r="4" className="fill-slate-950 stroke-cyan-400 stroke-[2.5] group-hover/pt:r-5 group-hover/pt:stroke-cyan-300 transition-all" />
                      <rect x={x - 20} y={y - 34} width="40" height="20" rx="6"
                        className="fill-cyan-500 opacity-0 group-hover/pt:opacity-100 transition-opacity drop-shadow-md" />
                      <text x={x} y={y - 20} textAnchor="middle"
                        className="fill-slate-950 text-[10px] font-black opacity-0 group-hover/pt:opacity-100 transition-opacity">
                        {item.count}
                      </text>
                      <text x={x} y="224" textAnchor="middle"
                        className="fill-slate-500 text-[10px] font-bold uppercase group-hover/pt:fill-cyan-400 transition-colors">
                        {item.label}
                      </text>
                    </g>
                  );
                })}
                </svg>
              )}
            </div>
          </div>
        </div>
      </section>

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

      {/* Tabel status semua perlintasan */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
              Status Semua Perlintasan
            </h2>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                Urut berdasarkan prioritas tertinggi
              </span>
              <input
                type="text"
                placeholder="Cari perlintasan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 w-48 transition-all"
              />
            </div>
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
                          <CrossingRow key={cs.crossing.cross_id} cs={cs} onOpenDetail={(c) => setSelectedCS(c)} />
                        ))
                      )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
