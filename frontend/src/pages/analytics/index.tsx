"use client";
import { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, TrendingUp, Train, ArrowUpRight, AlertCircle, 
  MapPin, Clock, Timer, AlertTriangle, CalendarDays, Map 
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCrossings } from '@/hooks/useCrossings';

type Period = 'daily' | 'monthly' | 'yearly';

const PERIOD_LABELS: Record<Period, string> = {
  daily:   'Harian',
  monthly: 'Bulanan',
  yearly:  'Tahunan',
};

// --- INTERFACES ---
interface PeakHour { jam: number; frekuensi: number; }
interface DurationStats { rata2_detik: number; rata2_menit: number; std_detik: number; max_detik: number; min_detik: number; }
interface AnomalyStats { jumlah_anomali: number; total_event: number; persen_anomali: number; }
interface WdWeStats { tipe_hari: string; rata2_kereta_per_hari: number; jumlah_hari: number; }
interface HeatmapStats { hari: number; jam: number; frekuensi: number; }

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('daily');
  
  // Ambil data perlintasan
  const { crossings, selected: crossId, setSelected, loading: crossLoading } = useCrossings();
  
  // Analisis 2: Tren Harian
  const { data, loading: analyticsLoading, error } = useAnalytics(crossId, period);

  // States untuk 5 Analisis Spark Lainnya
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [duration, setDuration] = useState<DurationStats | null>(null);
  const [anomaly, setAnomaly] = useState<AnomalyStats | null>(null);
  const [wdwe, setWdwe] = useState<WdWeStats[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapStats[]>([]);
  const [loadingSpark, setLoadingSpark] = useState(false);

  useEffect(() => {
    if (!crossId) return;
    setLoadingSpark(true);
    
    // Fetch semua data Analisis Spark dari backend secara bersamaan
    const fetchAllSparkData = async () => {
      try {
        const [resPeak, resDur, resAnom, resWdwe, resHeat] = await Promise.all([
          fetch(`${BACKEND_URL}/api/crossings/${crossId}/peakhours`).then(r => r.json()),
          fetch(`${BACKEND_URL}/api/crossings/${crossId}/duration`).then(r => r.json()),
          fetch(`${BACKEND_URL}/api/crossings/${crossId}/anomaly`).then(r => r.json()),
          fetch(`${BACKEND_URL}/api/crossings/${crossId}/weekday-weekend`).then(r => r.json()),
          fetch(`${BACKEND_URL}/api/crossings/${crossId}/heatmap`).then(r => r.json())
        ]);

        if (Array.isArray(resPeak)) setPeakHours(resPeak);
        if (resDur) setDuration(resDur);
        if (resAnom) setAnomaly(resAnom);
        if (Array.isArray(resWdwe)) setWdwe(resWdwe);
        if (Array.isArray(resHeat)) setHeatmap(resHeat);
      } catch (err) {
        console.error("Gagal mengambil data Spark:", err);
      } finally {
        setLoadingSpark(false);
      }
    };

    fetchAllSparkData();
  }, [crossId]);

  const loading = crossLoading || analyticsLoading;

  // Format chart data (Analisis 2)
  const chartData = useMemo(() => data.map(row => ({
    label: period === 'daily'
      ? new Date(row.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      : period === 'monthly'
      ? new Date(row.tanggal).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      : new Date(row.tanggal).getFullYear().toString(),
    count: row.total_kereta,
  })), [data, period]);

  const maxValue    = chartData.length > 0 ? Math.max(...chartData.map(d => d.count), 1) : 1;
  const totalTrains = chartData.reduce((acc, d) => acc + d.count, 0);
  const peakDay     = chartData.length > 0 ? chartData.reduce((prev, curr) => curr.count > prev.count ? curr : prev, chartData[0]) : null;
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

  // Logika Heatmap (Analisis 4)
  const daysLabel = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const maxHeatmapFreq = heatmap.length > 0 ? Math.max(...heatmap.map(h => h.frekuensi), 1) : 1;

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-10">

      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/50 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-cyan-500/10 p-2 rounded-lg">
              <TrendingUp className="text-cyan-400 w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Analisis <span className="text-cyan-400">Lalu Lintas</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-1">
            Data historis perlintasan — <span className="text-slate-300">Hasil Komputasi Agregasi Spark</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500" />
            <select
              value={crossId || ''}
              onChange={(e) => setSelected(e.target.value)}
              disabled={crossLoading || crossings.length === 0}
              className="bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-8 text-sm font-semibold focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 w-full sm:w-48 appearance-none cursor-pointer text-slate-200"
            >
              <option value="" disabled>{crossLoading ? 'Memuat...' : 'Pilih Perlintasan'}</option>
              {crossings.map(c => <option key={c.cross_id} value={c.cross_id}>{c.name}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
          </div>

          <div className="flex bg-slate-900/50 border border-slate-800 p-1 rounded-xl w-fit">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(opt => (
              <button
                key={opt}
                onClick={() => setPeriod(opt)}
                className={`px-6 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                  period === opt ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {PERIOD_LABELS[opt]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ANALISIS 2: TREN HARIAN */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-[#0a0f18] border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mb-1">Analisis 2</p>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Tren Volume Kereta <ArrowUpRight className="w-4 h-4 text-cyan-500" />
              </h3>
            </div>
            <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800 text-right">
              <span className="text-cyan-400 font-black text-2xl">{loading ? '...' : totalTrains.toLocaleString()}</span>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-tighter">Total Kereta</p>
            </div>
          </div>

          <div className="relative h-[280px] w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">Belum ada data</div>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 700 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 80, 120, 160, 200].map(y => <line key={y} x1="50" x2="650" y1={y} y2={y} className="stroke-slate-800/50 stroke-[1]" strokeDasharray="6,6" />)}
                {svgPoints && (
                  <>
                    <polygon points={`50,200 ${svgPoints} 650,200`} fill="url(#areaGrad)" />
                    <polyline points={svgPoints} fill="none" stroke="#22d3ee" strokeWidth="3" />
                  </>
                )}
                {chartData.map((item, i) => {
                  const x = i * (600 / Math.max(chartData.length - 1, 1)) + 50;
                  const y = 200 - (item.count / maxValue) * 160;
                  return (
                    <g key={i} className="group/pt cursor-crosshair">
                      <circle cx={x} cy={y} r="5" className="fill-slate-950 stroke-cyan-400 stroke-[3]" />
                      <text x={x} y={y - 15} textAnchor="middle" className="fill-white text-[10px] font-black opacity-0 group-hover/pt:opacity-100 transition-opacity">{item.count}</text>
                      <text x={x} y="235" textAnchor="middle" className="fill-slate-600 text-[9px] font-bold uppercase">{item.label}</text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex-1 bg-slate-900/30 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
            <div className="bg-emerald-500/10 w-fit p-3 rounded-2xl mb-4"><Train className="text-emerald-400 w-6 h-6" /></div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Hari Tersibuk</p>
              <h4 className="text-2xl font-black text-white italic">{loading ? '...' : peakDay?.label || '—'}</h4>
              <p className="text-slate-600 text-xs mt-1">{loading ? '' : `${peakDay?.count ?? 0} kereta lewat`}</p>
            </div>
          </div>
          <div className="flex-1 bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/10 p-6 rounded-3xl flex flex-col justify-between">
            <div className="bg-cyan-500/10 w-fit p-3 rounded-2xl mb-4"><Calendar className="text-cyan-400 w-6 h-6" /></div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Rata-Rata Harian</p>
              <h4 className="text-2xl font-black text-white italic">{loading ? '...' : avgRate}</h4>
              <p className="text-cyan-400/60 text-[10px] font-bold italic mt-1 uppercase">Kereta / Hari</p>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD 6 ANALISIS SPARK */}
      <div className="pt-4 border-t border-slate-800">
        <h2 className="text-lg font-black uppercase tracking-wider text-white mb-6">🌐 Ringkasan Analisis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Analisis 1: Jam Sibuk */}
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-6 col-span-1 md:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="text-cyan-400 w-5 h-5" />
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Analisis 1: Distribusi Jam Paling Sibuk</h3>
                <p className="text-slate-500 text-[11px] uppercase font-bold">Top 5 Waktu Rawan</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {loadingSpark ? <p className="text-slate-500 text-sm">Memuat...</p> : peakHours.map((ph, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex flex-col items-center gap-1">
                  <span className="text-slate-400 text-xs font-bold">Jam {ph.jam < 10 ? `0${ph.jam}` : ph.jam}:00</span>
                  <span className="text-cyan-400 text-3xl font-black">{ph.frekuensi}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Analisis 3: Durasi */}
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-6">
            <Timer className="text-emerald-400 w-6 h-6 mb-4" />
            <h3 className="text-white font-bold text-lg">Analisis 3: Durasi Palang</h3>
            <p className="text-slate-500 text-[11px] uppercase font-bold mb-4">Rata-rata Waktu Tunggu</p>
            <p className="text-4xl font-black text-emerald-400">{loadingSpark ? '...' : duration?.rata2_menit || 0} <span className="text-sm text-emerald-400/50">Menit</span></p>
            <div className="mt-4 flex justify-between text-xs text-slate-400 bg-slate-900/50 p-2 rounded-lg">
              <span>Max: {duration?.max_detik || 0}s</span>
              <span>Min: {duration?.min_detik || 0}s</span>
            </div>
          </div>

          {/* Analisis 5: Anomali */}
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-6">
            <AlertTriangle className="text-rose-400 w-6 h-6 mb-4" />
            <h3 className="text-white font-bold text-lg">Analisis 5: Deteksi Anomali</h3>
            <p className="text-slate-500 text-[11px] uppercase font-bold mb-4">Kereta Diluar Jadwal / Telat</p>
            <p className="text-4xl font-black text-rose-400">{loadingSpark ? '...' : anomaly?.jumlah_anomali || 0} <span className="text-sm text-rose-400/50">Kejadian</span></p>
            <div className="mt-4 text-xs text-rose-400/80 bg-rose-500/10 p-2 rounded-lg text-center font-bold">
              Tingkat Anomali: {anomaly?.persen_anomali || 0}%
            </div>
          </div>

          {/* Analisis 6: Weekday vs Weekend */}
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-6">
            <CalendarDays className="text-purple-400 w-6 h-6 mb-4" />
            <h3 className="text-white font-bold text-lg">Analisis 6: Tipe Hari</h3>
            <p className="text-slate-500 text-[11px] uppercase font-bold mb-4">Kerja vs Libur</p>
            <div className="flex gap-4">
              {loadingSpark ? <p className="text-slate-500">Memuat...</p> : wdwe.map(d => (
                <div key={d.tipe_hari} className="flex-1 bg-slate-900/50 border border-slate-800 p-3 rounded-xl text-center">
                  <p className="text-slate-400 text-[10px] font-bold uppercase">{d.tipe_hari}</p>
                  <p className="text-2xl font-black text-purple-400 mt-1">{d.rata2_kereta_per_hari}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Analisis 4: Heatmap Kepadatan (Hari vs Jam) */}
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-6 col-span-1 md:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-3 mb-6">
              <Map className="text-amber-400 w-5 h-5" />
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Analisis 4: Heatmap Kepadatan</h3>
                <p className="text-slate-500 text-[11px] uppercase font-bold">Sebaran Volume Kereta Berdasarkan Hari & Jam</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
              {loadingSpark ? <p className="text-slate-500 text-sm text-center py-4">Menggambar Heatmap...</p> : daysLabel.map((day, dIdx) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs font-bold w-8">{day}</span>
                  <div className="flex flex-1 gap-1">
                    {Array.from({length: 24}).map((_, h) => {
                      const cell = heatmap.find(x => x.hari === dIdx + 1 && x.jam === h);
                      const freq = cell ? cell.frekuensi : 0;
                      const opacity = freq / maxHeatmapFreq;
                      return (
                        <div 
                          key={h} 
                          title={`Jam ${h}:00 - ${freq} Kereta`}
                          className="h-6 flex-1 rounded-sm bg-amber-400 hover:bg-amber-300 transition-colors cursor-crosshair" 
                          style={{ opacity: freq === 0 ? 0.05 : Math.max(0.15, opacity) }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex justify-between mt-2 pl-11 text-slate-600 text-[10px] font-bold">
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}