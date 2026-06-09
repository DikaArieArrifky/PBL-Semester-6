"use client";
import { useEffect, useState } from 'react';
import {
  Train, ShieldCheck, ShieldX, Activity,
  Cpu, AlertTriangle, Clock, WifiOff
} from 'lucide-react';
import { useGateStatus } from '../../hooks/useGateStatus';
import { useSensorHealth } from '../../hooks/useSensorHealth';
import { useStaffDashboard } from '../../hooks/useStaffDashboard';
import { useRealtimeSocket } from '../../hooks/useRealtimeSocket';
import supabase from '../../lib/supabase'; // ✅ untuk fetch crossName
import type { Profile } from '../../lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(s: number): string {
  if (!s || s <= 0) return '0d';
  if (s < 60) return `${s}d`;
  return `${Math.floor(s / 60)}m ${s % 60}d`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ─── Critical Status Card ─────────────────────────────────────────────────────

interface CriticalCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  warning?: boolean;
  loading?: boolean;
}

function CriticalCard({ label, value, sub, icon, active, danger, warning, loading }: CriticalCardProps) {
  const borderColor = danger ? 'border-red-500/40'
    : warning ? 'border-amber-500/40'
      : active ? 'border-cyan-400/40'
        : 'border-slate-700/50';
  const bgColor = danger ? 'bg-red-500/5'
    : warning ? 'bg-amber-500/5'
      : active ? 'bg-cyan-500/5'
        : 'bg-[#0b1120]';
  const labelColor = danger ? 'text-red-400'
    : warning ? 'text-amber-400'
      : active ? 'text-cyan-400'
        : 'text-slate-500';
  const iconBg = danger ? 'bg-red-500/15 text-red-400'
    : warning ? 'bg-amber-500/15 text-amber-400'
      : active ? 'bg-cyan-500/15 text-cyan-400'
        : 'bg-slate-800/60 text-slate-500';
  const glowColor = danger ? 'bg-red-500'
    : warning ? 'bg-amber-500'
      : active ? 'bg-cyan-400'
        : 'bg-transparent';

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 flex items-center justify-between gap-4 transition-all duration-500 ${borderColor} ${bgColor}`}>
      <div className={`pointer-events-none absolute -bottom-8 -left-8 w-28 h-28 rounded-full blur-3xl opacity-20 transition-all duration-500 ${glowColor}`} />
      <div className="relative z-10 flex-1 min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-1 ${labelColor}`}>{label}</p>
        {loading ? (
          <div className="h-7 w-28 bg-slate-800 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-black text-white leading-tight tracking-tight truncate">{value}</p>
        )}
        <p className="text-xs text-slate-400 mt-1 leading-snug">{sub}</p>
      </div>
      <div className={`relative z-10 p-3 rounded-xl flex-shrink-0 ${iconBg}`}>{icon}</div>
    </div>
  );
}

// ─── Gate state label map ─────────────────────────────────────────────────────

const GATE_LABEL: Record<string, string> = {
  OPEN: 'TERBUKA',
  WAITING: 'MENUNGGU',
  CLOSING: 'MENUTUP',
  CLOSED: 'TERTUTUP',
  OPENING: 'MEMBUKA',
};

const GATE_SUB: Record<string, string> = {
  OPEN: 'Jalur bebas dilalui',
  WAITING: 'Safety delay — pengendara harap minggir',
  CLOSING: 'Palang sedang menutup...',
  CLOSED: 'Palang terkunci penuh',
  OPENING: 'Palang sedang membuka...',
};

// ─── Sensor Card ─────────────────────────────────────────────────────────────

type LocalSensorReading = {
  object_detected: boolean;
  distance_cm: number | null;
  recorded_at: string | null;
};

function getDistanceCm(reading: LocalSensorReading): number | null {
  return reading.distance_cm ?? null;
}

// Threshold deteksi objek ultrasonic (cm)
const ULTRASONIC_THRESHOLD_CM = 50;

function SensorCard({ type, reading }: { type: string; reading: LocalSensorReading }) {
  const distanceCm = getDistanceCm(reading);
  const isUltrasonic = type.toLowerCase().includes('ultrasonic') || distanceCm !== null;

  // Untuk ultrasonic: derive detected dari jarak <= threshold.
  // Fallback ke object_detected dari DB jika bukan ultrasonic atau jarak null.
  const detected = isUltrasonic && distanceCm !== null
    ? distanceCm <= ULTRASONIC_THRESHOLD_CM
    : reading.object_detected;

  // Sub-label
  const subLabel = isUltrasonic
    ? detected
      ? `Objek terdeteksi · ${distanceCm} cm`
      : distanceCm !== null
        ? `Jalur bebas · ${distanceCm} cm`
        : 'Jalur bebas · — cm'
    : detected
      ? 'Objek di jalur'
      : 'Jalur bebas';

  return (
    <div
      className={`p-5 rounded-2xl border flex items-center gap-4 transition-all duration-300 ${detected
        ? 'border-red-500/25 bg-red-500/5 text-red-400'
        : 'border-slate-800 bg-[#0a0f18] text-emerald-400'
        }`}
    >
      <div className="p-3 rounded-xl bg-black/20">
        <Cpu className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase font-bold opacity-60 tracking-wider mb-1">
          {type.replace(/_/g, ' ')}
        </p>
        <p className="text-lg font-bold text-slate-100">
          {detected ? 'TERDETEKSI' : 'KOSONG'}
        </p>
        <p className="text-[10px] opacity-70 mt-0.5">{subLabel}</p>
      </div>
      {/* Badge jarak khusus ultrasonic */}
      {isUltrasonic && distanceCm !== null && (
        <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums ${detected ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
          }`}>
          {distanceCm} cm
        </div>
      )}
    </div>
  );
}

// ─── StatRow ─────────────────────────────────────────────────────────────────

function StatRow({
  label, value, unit, danger,
}: {
  label: string; value: string; unit?: string; danger?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <p className="text-slate-500 text-sm">{label}</p>
      <p className={`font-bold text-sm tabular-nums ${danger ? 'text-red-400' : 'text-white'}`}>
        {value}
        {unit && <span className="text-slate-500 font-normal text-xs ml-1">{unit}</span>}
      </p>
    </div>
  );
}

// ─── LastTrainCard ────────────────────────────────────────────────────────────
// Live-update setiap menit agar "Xm lalu" tidak basi

function LastTrainCard({
  detectedAt, duration, loading,
}: {
  detectedAt: string | null; duration: number | null; loading: boolean;
}) {
  const [, tick] = useState(0);

  // Re-render setiap 30 detik agar label "Xm lalu" tetap akurat
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const minutesAgo = detectedAt
    ? Math.floor((Date.now() - new Date(detectedAt).getTime()) / 60_000)
    : null;

  const isRecent = minutesAgo !== null && minutesAgo < 10;
  const hasData = detectedAt !== null;

  const durStr = duration && duration > 0 ? ` · durasi ${formatSeconds(duration)}` : '';

  const subText = () => {
    if (loading) return 'Memuat...';
    if (!hasData) return 'Belum ada kereta hari ini';
    if (minutesAgo === 0) return `Baru saja${durStr}`;
    if (minutesAgo! < 60) return `${minutesAgo}m lalu${durStr}`;
    const h = Math.floor(minutesAgo! / 60);
    const m = minutesAgo! % 60;
    return `${h}j ${m > 0 ? ` ${m}m` : ''} lalu${durStr}`;
  };

  return (
    <CriticalCard
      label="Kereta Terakhir"
      value={loading ? '...' : hasData ? formatTime(detectedAt!) : '—'}
      sub={subText()}
      icon={<Clock className="w-5 h-5" />}
      warning={isRecent}
      active={hasData && !isRecent}
      loading={loading}
    />
  );
}

// ─── Dashboard Content ────────────────────────────────────────────────────────

function StaffDashboardContent({
  crossId, crossName, profile,
}: {
  crossId: string; crossName: string; profile: Profile | null;
}) {
  const { gateState, lastEvent, loading: gateLoad } = useGateStatus(crossId);
  const { sensors, loading: sensorLoad } = useSensorHealth(crossId);
  const { stats, cumulativeData, alerts, loading: statLoad } = useStaffDashboard(crossId);
  const { latestGateUpdate, latestSensorUpdate } = useRealtimeSocket(crossName);
  const [manualLoading, setManualLoading] = useState(false);

  // Ambil status kereta dari sensor IR, bukan dari gate
  const irA = sensors.find(s => s.component_code === 'IR_A');
  const irB = sensors.find(s => s.component_code === 'IR_B');

  const trainPresent =
    (irA?.last_bool_value === true) ||
    (irB?.last_bool_value === true);

  // Gate dianggap danger kalau benar-benar tertutup/menutup
  const gateDanger =
    gateState === 'CLOSED' ||
    gateState === 'CLOSING' ||
    gateState === 'WAITING';

  // Filter sensor yang mau ditampilkan di dashboard staff
  const visibleSensors = Object.values(
    sensors
      .filter(s =>
        ['IR_A', 'IR_B', 'ULTRASONIC'].includes(s.component_code)
      )
      .reduce((acc, sensor) => {
        const existing = acc[sensor.component_code];

        if (!existing) {
          acc[sensor.component_code] = sensor;
          return acc;
        }

        const existingTime = existing.updated_at
          ? new Date(existing.updated_at).getTime()
          : 0;

        const sensorTime = sensor.updated_at
          ? new Date(sensor.updated_at).getTime()
          : 0;

        if (sensorTime > existingTime) {
          acc[sensor.component_code] = sensor;
        }

        return acc;
      }, {} as Record<string, typeof sensors[number]>)
  );

  // hasSensors: untuk sensor section
  const hasSensors = visibleSensors.length > 0;

  // Nilai gate: saat loading masih jalan → '...'
  // saat loading selesai tapi belum ada data (null/undefined) → 'UNKNOWN'
  const gateLabel = gateLoad
    ? '...'
    : gateState
      ? (GATE_LABEL[gateState] ?? gateState)
      : 'UNKNOWN';
  const gateSub = gateLoad
    ? 'Memuat...'
    : gateState
      ? (GATE_SUB[gateState] ?? '')
      : 'Status tidak diketahui';

  // Untuk chart cumulative
  const maxCumulative = cumulativeData.length > 0
    ? Math.max(...cumulativeData.map(h => h.cumulative), 1)
    : 1;
  async function sendManualGateCommand(action: 'EMERGENCY_CLOSE' | 'EMERGENCY_OPEN') {
    const label = action === 'EMERGENCY_CLOSE'
      ? 'menutup palang secara darurat'
      : 'membuka palang secara manual';

    const ok = window.confirm(`Yakin ingin ${label}?`);

    if (!ok) return;

    try {
      setManualLoading(true);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      if (!backendUrl) {
        alert('NEXT_PUBLIC_BACKEND_URL belum diatur di .env.local');
        return;
      }

      const res = await fetch(`${backendUrl}/api/gate/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cross_id: crossId,
          action,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || 'Gagal mengirim command manual gate');
        return;
      }

      alert(
        action === 'EMERGENCY_CLOSE'
          ? 'Command tutup palang darurat berhasil dikirim'
          : 'Command buka palang manual berhasil dikirim'
      );
    } catch (err) {
      console.error('[manual gate] error:', err);
      alert('Gagal terhubung ke backend');
    } finally {
      setManualLoading(false);
    }
  }
  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-6 md:p-10 space-y-10">

      {/* Header */}
      <header className="flex flex-col gap-1 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${trainPresent ? 'bg-red-500' : 'bg-cyan-500'}`} />
          <h1 className="text-3xl font-black tracking-tight text-white italic">
            MONITORING <span className="text-cyan-400">PALANG</span>
          </h1>
        </div>
        <p className="text-slate-500 text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-500" />
          {crossName} — Selamat datang,{' '}
          <span className="text-slate-300">{profile?.name || 'Staff'}</span>
        </p>
      </header>

      {/* Critical Status Overview */}
      <section className="space-y-3">
        <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.22em]">
          Critical Status Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Train Presence */}
          <CriticalCard
            label="Train Presence"
            value={sensorLoad ? '...' : trainPresent ? 'TERDETEKSI' : 'TIDAK ADA'}
            sub={
              sensorLoad
                ? 'Memuat sensor...'
                : trainPresent
                  ? 'Sensor IR mendeteksi objek'
                  : 'Sensor IR tidak mendeteksi kereta'
            }
            icon={<Train className="w-5 h-5" />}
            danger={trainPresent}
            active={!trainPresent && !sensorLoad}
            loading={sensorLoad}
          />

          {/* Gate Position */}
          <CriticalCard
            label="Gate Position"
            value={gateLabel}
            sub={gateSub}
            icon={gateDanger ? <ShieldX className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            danger={gateDanger}
            active={!gateDanger && gateState === 'OPEN'}
            warning={!gateLoad && !gateState}
            loading={gateLoad}
          />
          {/* Kereta Terakhir */}
          <LastTrainCard
            detectedAt={stats?.lastGateEventAt ?? null}
            duration={null}
            loading={statLoad}
          />

        </div>
      </section>

      {/* Manual Gate Control */}
      <section className="space-y-3">
        <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.22em]">
          Manual Gate Control
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => sendManualGateCommand('EMERGENCY_CLOSE')}
            disabled={manualLoading || gateState === 'CLOSED' || gateState === 'CLOSING'}
            className="rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-left hover:bg-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p className="text-red-400 text-xs font-bold uppercase tracking-wider">
              Emergency Close
            </p>
            <p className="text-white text-lg font-black mt-1">
              Tutup Palang Darurat
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Gunakan jika sensor gagal mendeteksi objek atau kereta.
            </p>
          </button>

          <button
            onClick={() => sendManualGateCommand('EMERGENCY_OPEN')}
            disabled={manualLoading || gateState === 'OPEN' || gateState === 'OPENING'}
            className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-4 text-left hover:bg-cyan-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider">
              Emergency Open
            </p>
            <p className="text-white text-lg font-black mt-1">
              Buka Palang Manual
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Gunakan hanya jika jalur sudah benar-benar aman.
            </p>
          </button>
        </div>
      </section>

      {/* Sensor Hardware */}
      <section className="space-y-3">
        <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.22em]">
          Sensor Hardware
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sensorLoad ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-5 rounded-2xl border border-slate-800 bg-[#0a0f18] animate-pulse h-24" />
            ))
          ) : !hasSensors ? (
            <div className="col-span-3 p-5 rounded-2xl border border-slate-800 bg-[#0a0f18] text-center text-slate-600 text-sm flex items-center justify-center gap-2">
              <WifiOff className="w-4 h-4" />
              Belum ada data sensor — perangkat mungkin offline
            </div>
          ) : (
            visibleSensors.map(s => {
              const reading: LocalSensorReading = {
                object_detected: s.component_code === 'ULTRASONIC'
                  ? s.last_numeric_value !== null && s.last_numeric_value <= 50
                  : (s.last_bool_value ?? false),
                distance_cm: s.component_code === 'ULTRASONIC' ? s.last_numeric_value : null,
                recorded_at: s.updated_at,
              };
              return (
                <SensorCard key={s.component_id} type={s.component_code} reading={reading} />
              );
            })
          )}
        </div>
      </section>

      {/* Statistik + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Statistik */}
        <div className="space-y-3">
          <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.22em]">
            Statistik Hari Ini
          </h2>
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-6 space-y-5">
            {statLoad ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-3 w-32 bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-slate-800 rounded animate-pulse" />
                </div>
              ))
            ) : !stats ? (
              <p className="text-slate-600 text-sm text-center py-4">Gagal memuat statistik</p>
            ) : (
              <>
                <StatRow
                  label="Total kereta lewat"
                  value={`${stats.trainToday}`}
                  unit="kereta"
                />

                <StatRow
                  label="Rata-rata durasi tutup"
                  value={stats.avgClosedDuration > 0 ? formatSeconds(stats.avgClosedDuration) : '—'}
                />

                <StatRow
                  label="Durasi terlama"
                  value={stats.longestClosedDuration > 0 ? formatSeconds(stats.longestClosedDuration) : '—'}
                />
              </>
            )}
          </div>
          {lastEvent && (
            <div className="flex items-center gap-2 px-1 text-xs text-slate-600">
              <Clock className="w-3 h-3" />
              Update terakhir: {formatTime(lastEvent.occurred_at)}
            </div>
          )}
        </div>

        {/* Chart — Cumulative kereta lewat per jam */}
        <div className="lg:col-span-2 space-y-3 h-full">
          <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.22em]">
            Akumulasi Kereta Lewat (Hari Ini)
          </h2>
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-6 h-full flex flex-col">
            {statLoad ? (
              <div className="h-40 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cumulativeData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
                Belum ada data kereta hari ini
              </div>
            ) : (
              <div className="flex flex-col gap-3 flex-1">
                {/* Bar chart */}
                <div className="flex items-end gap-1 h-44 px-1 flex-1">
                  {cumulativeData.map((h, i) => {
                    const prev = i > 0 ? cumulativeData[i - 1].cumulative : 0;
                    const added = h.cumulative - prev;   // kereta baru di jam ini
                    const pct = maxCumulative > 0
                      ? Math.max((h.cumulative / maxCumulative) * 130, h.cumulative > 0 ? 6 : 1)
                      : 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10
                          hidden group-hover:flex flex-col items-center pointer-events-none">
                          <div className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5
                            text-[10px] whitespace-nowrap shadow-xl">
                            <p className="text-cyan-400 font-bold">{h.jam}</p>
                            <p className="text-white">Total: <span className="font-bold">{h.cumulative}</span> kereta</p>
                            {added > 0 && (
                              <p className="text-slate-400">+{added} jam ini</p>
                            )}
                          </div>
                          <div className="w-2 h-2 bg-slate-800 border-r border-b border-slate-700
                            rotate-45 -mt-1" />
                        </div>
                        {/* Label angka di atas bar */}
                        <span className="text-[9px] text-slate-400 font-bold leading-none mb-0.5">
                          {h.cumulative > 0 ? h.cumulative : ''}
                        </span>
                        {/* Bar */}
                        <div
                          className={`w-full rounded-t transition-all duration-300 ${added > 0
                            ? 'bg-cyan-500/60 group-hover:bg-cyan-400/90'
                            : 'bg-slate-700/50 group-hover:bg-slate-600/70'
                            }`}
                          style={{ height: `${pct}px` }}
                        />
                        {/* Label jam */}
                        <span className="text-[8px] text-slate-600 mt-0.5 rotate-45 origin-left">
                          {h.jam}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Summary bawah chart */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 mt-1">
                  <p className="text-xs text-slate-600">
                    Jam pertama:{' '}
                    <span className="text-slate-400 font-semibold">{cumulativeData[0]?.jam}</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Total s/d sekarang:{' '}
                    <span className="text-cyan-400 font-bold">
                      {cumulativeData[cumulativeData.length - 1]?.cumulative ?? 0} kereta
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>


    </div>
  );
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────

interface Props { profile: Profile | null; }

export default function StaffDashboard({ profile }: Props) {
  // ✅ Fix: pakai cross_id dari profile langsung, bukan useCrossings()
  // useCrossings() tidak filter per-user sehingga semua staff dapat crossing yang sama
  const [crossName, setCrossName] = useState('—');
  const [crossLoading, setCrossLoading] = useState(true);

  const envCrossId = process.env.NEXT_PUBLIC_CROSSING_ID ?? null;
  const crossId = profile?.cross_id || envCrossId;

  useEffect(() => {
    if (!crossId) {
      setCrossLoading(false);
      return;
    }
    supabase
      .from('crossings')
      .select('name')
      .eq('cross_id', crossId)
      .single()
      .then(({ data }) => {
        setCrossName(data?.name ?? '—');
        setCrossLoading(false);
      });
  }, [crossId]);

  if (crossLoading) {
    return (
      <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm animate-pulse">Memuat data perlintasan...</p>
      </div>
    );
  }

  if (!crossId) {
    return (
      <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-transparent rounded-full" />
        <p className="text-slate-500 text-sm">Tidak ada perlintasan yang ditugaskan</p>
        <p className="text-slate-600 text-xs max-w-xs text-center">
          Hubungi Admin untuk mendapatkan akses ke perlintasan
        </p>
      </div>
    );
  }

  return <StaffDashboardContent crossId={crossId} crossName={crossName} profile={profile} />;
}