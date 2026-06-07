"use client";
import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Cpu, AlertTriangle, Train, Shield,
  TrendingUp, Calendar, AlertCircle, ChevronRight,
  Wifi, WifiOff, Activity, Clock, Eye, Pencil, Save, X, Loader2
} from 'lucide-react';
import { withAuth } from '@/components/ui/withAuth';
import { useCrossingDetail } from '@/hooks/useCrossingDetail';
import { useAnalytics } from '@/hooks/useAnalytics';
import supabase from '@/lib/supabase';
import type { DeviceWithComponents } from '@/hooks/useCrossingDetail';
import type { Alert, GateEvent, Crossing } from '@/lib/types';

type Period = 'daily' | 'monthly' | 'yearly';
const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Daily',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

type TabKey = 'devices' | 'alerts' | 'history';

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : status === 'maintenance' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  return (
    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}

// ─── Severity Badge ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === 'critical' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    : severity === 'high'   ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
    : severity === 'medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  return (
    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${cls}`}>
      {severity}
    </span>
  );
}

// ─── Sensor Status Dot ────────────────────────────────────────────────────────
function SensorDot({ status }: { status: string }) {
  const cls =
    status === 'healthy' ? 'bg-emerald-400'
    : status === 'warning' ? 'bg-amber-400'
    : status === 'faulty' ? 'bg-rose-400'
    : 'bg-slate-500';
  return <div className={`w-2 h-2 rounded-full ${cls}`} />;
}

// ─── Gate Event Type Badge ────────────────────────────────────────────────────
function GateEventBadge({ eventType }: { eventType: string }) {
  const cls =
    eventType === 'GATE_CLOSED'  ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    : eventType === 'GATE_CLOSING' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : eventType === 'GATE_WARNING' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    : eventType === 'GATE_OPENING' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    : eventType === 'GATE_OPEN'    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  return (
    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${cls}`}>
      {eventType.replace('GATE_', '')}
    </span>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
function CrossingDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const crossId = typeof id === 'string' ? id : undefined;

  const { crossing, devices, alerts, gateEvents, summary, loading } = useCrossingDetail(crossId);

  // Analytics
  const now = new Date();
  const [period, setPeriod] = useState<Period>('daily');
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useAnalytics(
    crossId || null,
    period,
    period !== 'yearly' ? filterYear : null,
    period === 'daily' ? filterMonth : null
  );

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) years.push(y);
    return years;
  }, []);

  const chartData = useMemo(() => {
    const filteredData = analyticsData.filter(row => {
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
      count: row.total_kereta,
      avgDuration: row.rata_durasi,
      maxDuration: row.durasi_terlama,
    }));
  }, [analyticsData, period, filterYear, filterMonth]);

  const maxChartValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.count), 1) : 1;
  const totalTrains = chartData.reduce((acc, d) => acc + d.count, 0);
  const peakDay = chartData.reduce((prev, curr) => curr.count > prev.count ? curr : prev, chartData[0]);
  const avgRate = chartData.length > 0 ? (totalTrains / chartData.length).toFixed(1) : '0';

  const svgPoints = useMemo(() => {
    if (chartData.length < 2) return '';
    const spacing = 600 / (chartData.length - 1);
    return chartData.map((item, i) => {
      const x = i * spacing + 50;
      const y = 200 - (item.count / maxChartValue) * 160;
      return `${x},${y}`;
    }).join(' ');
  }, [chartData, maxChartValue]);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('devices');

  // Alerts filter
  const [alertFilter, setAlertFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'active') return alerts.filter(a => !a.resolved);
    if (alertFilter === 'resolved') return alerts.filter(a => a.resolved);
    return alerts;
  }, [alerts, alertFilter]);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Crossing>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  function openEdit() {
    if (!crossing) return;
    setEditForm({
      cross_id: crossing.cross_id,
      code: crossing.code,
      name: crossing.name,
      location: crossing.location,
      latitude: crossing.latitude,
      longitude: crossing.longitude,
      status: crossing.status,
    });
    setEditError('');
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editForm.code?.trim()) { setEditError('Kode wajib diisi.'); return; }
    if (!editForm.name?.trim()) { setEditError('Nama wajib diisi.'); return; }
    setEditSaving(true);
    setEditError('');
    const { error } = await supabase
      .from('crossings')
      .update({
        code: editForm.code,
        name: editForm.name,
        location: editForm.location,
        latitude: editForm.latitude,
        longitude: editForm.longitude,
        status: editForm.status,
      })
      .eq('cross_id', editForm.cross_id);
    setEditSaving(false);
    if (error) { setEditError(error.message); return; }
    setEditOpen(false);
    // Refresh data by re-navigating to the same page
    router.replace(router.asPath);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!crossing) {
    return (
      <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-slate-600" />
        <p className="text-slate-500 text-lg">Perlintasan tidak ditemukan</p>
        <Link
          href="/admin/crossings"
          className="text-cyan-400 hover:text-cyan-300 text-sm font-bold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
        </Link>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800/50 pb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href="/admin/crossings" className="hover:text-cyan-400 transition-colors">
            Crossings
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-300 font-bold">{crossing.name}</span>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-cyan-500/10 p-3 rounded-2xl">
              <MapPin className="text-cyan-400 w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  {crossing.name}
                </h1>
                <StatusBadge status={crossing.status} />
              </div>
              <p className="text-slate-500 text-sm mt-0.5">
                {crossing.location || '—'}
                {crossing.latitude && crossing.longitude && (
                  <span className="ml-2 text-slate-600 font-mono text-xs">
                    ({crossing.latitude}, {crossing.longitude})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-mono text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              {crossing.code}
            </span>
            <button
              onClick={openEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <Link
              href="/admin/crossings"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali
            </Link>
          </div>
        </div>
      </header>

      {/* ── Summary Stat Cards ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0a0f18] border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Device Online</p>
            <h2 className="text-2xl font-black text-white mt-1">
              {summary.devicesOnline}
              <span className="text-sm font-semibold text-slate-500 ml-1">/ {summary.devicesTotal}</span>
            </h2>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10">
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="bg-[#0a0f18] border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Sensor Sehat</p>
            <h2 className="text-2xl font-black text-white mt-1">
              {summary.sensorsHealthy}
              <span className="text-sm font-semibold text-slate-500 ml-1">/ {summary.sensorsTotal}</span>
            </h2>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div className="bg-[#0a0f18] border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Alert Aktif</p>
            <h2 className="text-2xl font-black text-white mt-1">{summary.alertsActive}</h2>
          </div>
          <div className="p-3 rounded-xl bg-orange-500/10">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
        </div>
        <div className="bg-[#0a0f18] border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Kereta Hari Ini</p>
            <h2 className="text-2xl font-black text-white mt-1">{summary.trainToday}</h2>
          </div>
          <div className="p-3 rounded-xl bg-violet-500/10">
            <Train className="w-5 h-5 text-violet-400" />
          </div>
        </div>
      </section>

      {/* ── Traffic Analytics ───────────────────────────────────────────────── */}
      <section className="space-y-4 rounded-3xl border border-slate-800 bg-[#0a0f18] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
              Traffic Analytics
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Data historis perlintasan ini
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
            {period !== 'yearly' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  className="bg-slate-950/60 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-all"
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y} className="bg-slate-900">{y}</option>
                  ))}
                </select>
                {period === 'daily' && (
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(Number(e.target.value))}
                    className="bg-slate-950/60 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-all"
                  >
                    {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'].map((label, i) => (
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

        {/* Stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Total Kereta</p>
            <p className="mt-2 text-2xl font-black text-white">
              {analyticsLoading ? <span className="inline-block w-8 h-5 bg-slate-800 rounded animate-pulse" /> : totalTrains.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Peak Period</p>
            <p className="mt-2 text-2xl font-black text-white">
              {analyticsLoading ? <span className="inline-block w-12 h-5 bg-slate-800 rounded animate-pulse" /> : peakDay?.label || '—'}
            </p>
            <p className="text-slate-500 text-[10px] mt-0.5">
              {analyticsLoading ? '' : `${peakDay?.count ?? 0} kereta`}
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Avg Rate</p>
            <p className="mt-2 text-2xl font-black text-white">
              {analyticsLoading ? <span className="inline-block w-8 h-5 bg-slate-800 rounded animate-pulse" /> : avgRate}
            </p>
            <p className="text-slate-500 text-[10px] mt-0.5">kereta / periode</p>
          </div>
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Avg Durasi</p>
            <p className="mt-2 text-2xl font-black text-white">
              {analyticsLoading ? (
                <span className="inline-block w-8 h-5 bg-slate-800 rounded animate-pulse" />
              ) : chartData.length > 0 ? (
                `${(chartData.reduce((a, d) => a + d.avgDuration, 0) / chartData.length).toFixed(0)}s`
              ) : '—'}
            </p>
            <p className="text-slate-500 text-[10px] mt-0.5">detik / kereta</p>
          </div>
        </div>

        {/* Chart */}
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
          <div className="relative h-[240px] w-full">
            {analyticsLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                Belum ada data untuk periode ini
              </div>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 700 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="detailAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 80, 120, 160, 200].map(y => (
                  <line key={y} x1="50" x2="650" y1={y} y2={y}
                    className="stroke-slate-800/40 stroke-[1]" strokeDasharray="4,6" />
                ))}
                {svgPoints && (
                  <>
                    <polygon points={`50,200 ${svgPoints} 650,200`} fill="url(#detailAreaGrad)" />
                    <polyline points={svgPoints} fill="none" stroke="#22d3ee" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
                {chartData.map((item, i) => {
                  const spacing = 600 / Math.max(chartData.length - 1, 1);
                  const x = i * spacing + 50;
                  const y = 200 - (item.count / maxChartValue) * 160;
                  return (
                    <g key={i} className="group/pt cursor-crosshair">
                      <circle cx={x} cy={y} r="4" className="fill-slate-950 stroke-cyan-400 stroke-[2.5]" />
                      <rect x={x - 16} y={y - 32} width="32" height="18" rx="4"
                        className="fill-cyan-500 opacity-0 group-hover/pt:opacity-100 transition-opacity" />
                      <text x={x} y={y - 19} textAnchor="middle"
                        className="fill-slate-950 text-[9px] font-black opacity-0 group-hover/pt:opacity-100 transition-opacity">
                        {item.count}
                      </text>
                      <text x={x} y="232" textAnchor="middle"
                        className="fill-slate-600 text-[8px] font-bold uppercase">
                        {item.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </section>

      {/* ── Tabbed Content ──────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-slate-800 bg-[#0a0f18] overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-slate-800">
          {([
            { key: 'devices' as TabKey, label: 'Devices & Sensors', icon: Cpu },
            { key: 'alerts' as TabKey, label: 'Alerts', icon: AlertTriangle },
            { key: 'history' as TabKey, label: 'Gate History', icon: Activity },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'text-cyan-400 border-cyan-500 bg-cyan-500/5'
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── Tab: Devices & Sensors ──────────────────────────────────────── */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              {devices.length === 0 ? (
                <div className="text-center text-slate-600 py-10 text-sm">
                  Belum ada device terdaftar
                </div>
              ) : (
                devices.map(device => (
                  <div key={device.device_id} className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                    {/* Device header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
                      <div className="flex items-center gap-3">
                        {device.status === 'online' ? (
                          <Wifi className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-slate-500" />
                        )}
                        <div>
                          <p className="text-sm font-bold text-white">{device.mqtt_client_id}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{device.type} · {device.device_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          device.status === 'online' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : device.status === 'error' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          : 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                        }`}>
                          {device.status}
                        </span>
                        {device.last_seen_at && (
                          <span className="text-[10px] text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(device.last_seen_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Components table */}
                    {device.device_components && device.device_components.length > 0 && (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-900/30">
                            <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Component</th>
                            <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Type</th>
                            <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Status</th>
                            <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Last Value</th>
                            <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Last Reading</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/30">
                          {device.device_components.map(comp => {
                            const state = comp.latest_component_state?.[0];
                            return (
                              <tr key={comp.component_id} className="hover:bg-slate-900/20">
                                <td className="px-4 py-2.5 text-xs font-bold text-white">{comp.component_name}</td>
                                <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{comp.component_code}</td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <SensorDot status={comp.status} />
                                    <span className="text-xs text-slate-300 capitalize">{comp.status}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">
                                  {state?.last_bool_value !== null && state?.last_bool_value !== undefined
                                    ? (state.last_bool_value ? 'TRUE' : 'FALSE')
                                    : state?.last_numeric_value !== null && state?.last_numeric_value !== undefined
                                    ? `${state.last_numeric_value}`
                                    : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-[10px] text-slate-600">
                                  {comp.last_reading_at
                                    ? new Date(comp.last_reading_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })
                                    : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Tab: Alerts ────────────────────────────────────────────────── */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex items-center gap-2">
                {(['all', 'active', 'resolved'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setAlertFilter(f)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${
                      alertFilter === f
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-500 hover:text-slate-300 bg-slate-950/60 border border-slate-800'
                    }`}
                  >
                    {f === 'all' ? 'Semua' : f === 'active' ? 'Aktif' : 'Resolved'}
                  </button>
                ))}
              </div>

              {filteredAlerts.length === 0 ? (
                <div className="text-center text-slate-600 py-10 text-sm">
                  Tidak ada alert
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900/30">
                        <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Severity</th>
                        <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Type</th>
                        <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Message</th>
                        <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Status</th>
                        <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                      {filteredAlerts.map(alert => (
                        <tr key={alert.alert_id} className="hover:bg-slate-900/20">
                          <td className="px-4 py-3">
                            <SeverityBadge severity={alert.severity} />
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 font-mono">{alert.alert_type}</td>
                          <td className="px-4 py-3 text-xs text-slate-300 max-w-[300px] truncate">{alert.message}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold ${alert.resolved ? 'text-emerald-400' : 'text-orange-400'}`}>
                              {alert.resolved ? 'Resolved' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[10px] text-slate-600">
                            {new Date(alert.triggered_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Gate History ───────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {gateEvents.length === 0 ? (
                <div className="text-center text-slate-600 py-10 text-sm">
                  Belum ada gate events
                </div>
              ) : (
                <div className="space-y-1">
                  {gateEvents.map((event, idx) => (
                    <div
                      key={event.event_id}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-950/60 transition-colors group"
                    >
                      {/* Timeline dot & line */}
                      <div className="flex flex-col items-center gap-0.5 w-4 shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                          event.event_type === 'GATE_CLOSED'  ? 'bg-rose-500 border-rose-400'
                          : event.event_type === 'GATE_OPEN'  ? 'bg-emerald-500 border-emerald-400'
                          : event.event_type === 'GATE_WARNING' ? 'bg-yellow-500 border-yellow-400'
                          : 'bg-cyan-500 border-cyan-400'
                        }`} />
                        {idx < gateEvents.length - 1 && (
                          <div className="w-px h-6 bg-slate-800" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GateEventBadge eventType={event.event_type} />
                          {event.previous_state && event.new_state && (
                            <span className="text-[10px] text-slate-600">
                              {event.previous_state} → {event.new_state}
                            </span>
                          )}
                          {event.trigger_source && (
                            <span className="text-[10px] text-slate-600 font-mono">
                              via {event.trigger_source}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-600 tabular-nums">
                          {new Date(event.occurred_at).toLocaleString('id-ID', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>

    {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
    {editOpen && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#0a0f18] border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">Edit Perlintasan</h3>
            <button onClick={() => setEditOpen(false)} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'Kode Perlintasan *', key: 'code', type: 'text' },
              { label: 'Nama Perlintasan *', key: 'name', type: 'text' },
              { label: 'Lokasi / Alamat', key: 'location', type: 'text' },
              { label: 'Latitude', key: 'latitude', type: 'number' },
              { label: 'Longitude', key: 'longitude', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={(editForm as any)[f.key] ?? ''}
                  onChange={(e) =>
                    setEditForm(prev => ({
                      ...prev,
                      [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Status
              </label>
              <select
                value={editForm.status || 'active'}
                onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {editError && (
              <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {editError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default withAuth(CrossingDetailPage, { requiredRole: 'Admin' });

