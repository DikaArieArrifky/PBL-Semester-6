"use client";
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { Cpu, Radio, Activity, Wifi, RefreshCw, Settings2, CircleDot } from 'lucide-react';
import { useCrossings } from '@/hooks/useCrossings';
import type { Device } from '@/lib/types';

function getDeviceVisuals(type: string) {
  switch (type) {
    case 'HC_SR05': return { icon: <Radio className="w-5 h-5" />,    color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Distance Scanner' };
    case 'IR_FC51': return { icon: <Cpu className="w-5 h-5" />,      color: 'bg-amber-500',   text: 'text-amber-400',  label: 'Obstacle Detector' };
    case 'ESP32':   return { icon: <Activity className="w-5 h-5" />, color: 'bg-cyan-500',    text: 'text-cyan-400',   label: 'Main Controller' };
    default:        return { icon: <Cpu className="w-5 h-5" />,      color: 'bg-slate-500',   text: 'text-slate-400',  label: type };
  }
}

function getHealth(lastSeenAt: string | null): number {
  if (!lastSeenAt) return 0;
  const diffMin = (Date.now() - new Date(lastSeenAt).getTime()) / 60000;
  if (diffMin < 1)  return 100;
  if (diffMin < 5)  return 90;
  if (diffMin < 30) return 70;
  if (diffMin < 60) return 40;
  return 10;
}

export default function StaffDevices() {
  const { crossings, selected } = useCrossings();
  const [devices, setDevices]   = useState<Device[]>([]);
  const [loading, setLoading]   = useState(true);

  const crossName = crossings.find(c => c.cross_id === selected)?.name || '—';

  async function fetchDevices() {
    if (!selected) return;
    setLoading(true);
    try {
      // Fetch devices with crossing info and components
      const { data: devs, error: devError } = await supabase
        .from('devices')
        .select(`
          *,
          crossings (
            name
          )
        `)
        .eq('cross_id', selected)
        .order('registered_at', { ascending: false });

      // Fetch device components
      const { data: components, error: compError } = await supabase
        .from('device_components')
        .select('*')
        .order('component_name');

      console.log('Staff devices:', devs, 'Error:', devError);
      console.log('Components:', components, 'Error:', compError);

      setDevices(devs || []);
      
      // Group components by device_id for easier access
      const componentsByDevice = (components || []).reduce((acc, comp) => {
        if (!acc[comp.device_id]) {
          acc[comp.device_id] = [];
        }
        acc[comp.device_id].push(comp);
        return acc;
      }, {} as Record<string, any[]>);
      
      // Store components in state for display
      (window as any).deviceComponents = componentsByDevice;
    } catch (error) {
      console.error('Fetch data error:', error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDevices(); }, [selected]);

  useEffect(() => {
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, [selected]);

  const onlineCount = devices.filter(d => d.status === 'online').length;

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-8">

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/50 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-cyan-500/10 p-2 rounded-lg">
              <Settings2 className="text-cyan-400 w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Device <span className="text-cyan-400">Inventory</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-1">
            Perangkat di perlintasan: <span className="text-slate-300 font-semibold">{crossName}</span>
          </p>
        </div>
        <button
          onClick={fetchDevices}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all"
        >
          <RefreshCw className="w-4 h-4 text-cyan-400" /> Refresh
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Hardware', value: `${devices.length} Unit` },
          { label: 'Online',         value: `${onlineCount} Unit` },
          { label: 'Offline',        value: `${devices.length - onlineCount} Unit` },
        ].map((s, i) => (
          <div key={i} className="bg-[#0a0f18] border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{s.label}</p>
              <h2 className="text-2xl font-black text-white mt-1">{s.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="bg-[#0a0f18] border border-slate-800 rounded-3xl h-64 animate-pulse" />)}
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-12 text-center text-slate-600">
          Tidak ada device terdaftar di perlintasan ini
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {devices.map(dev => {
            const { icon, color, text, label } = getDeviceVisuals(dev.type);
            const health = getHealth(dev.last_seen_at);
            return (
              <div key={dev.device_id} className="bg-[#0a0f18] border border-slate-800 rounded-3xl overflow-hidden hover:border-slate-700 transition-all shadow-xl">
                <div className="p-5 border-b border-slate-800/50 flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-cyan-400">{icon}</div>
                    <div>
                      <h3 className="font-bold text-white leading-tight">{dev.type}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{label}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded-md text-slate-400 font-mono">
                    {dev.mqtt_client_id || '—'}
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CircleDot className={`w-3 h-3 animate-pulse ${text}`} />
                        <span className={`text-xs font-black tracking-widest ${text}`}>{dev.status.toUpperCase()}</span>
                      </div>
                      <p className="text-xl font-black text-white">{dev.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Health</p>
                      <p className={`text-sm font-bold ${health > 70 ? 'text-emerald-400' : health > 40 ? 'text-amber-400' : 'text-red-400'}`}>
                        {health}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${color}`} style={{ width: `${health}%` }} />
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-mono text-slate-500">
                        {dev.last_seen_at
                          ? new Date(dev.last_seen_at).toLocaleTimeString('id-ID')
                          : 'Belum pernah online'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-600">v1.0.0</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
