"use client";
import { useState, useEffect } from 'react';
import { Settings2, RefreshCw, Plus, Filter, CircleDot, Wifi, Pencil, Trash2, Cpu, Activity, Radio, Eye } from 'lucide-react';
import supabase from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Device, Crossing } from '@/lib/types';

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

interface DeviceWithCrossing extends Device { crossings?: { name: string } }

export default function AdminDevices() {
  const { profile } = useAuth();
  const [devices, setDevices]         = useState<DeviceWithCrossing[]>([]);
  const [crossings, setCrossings]     = useState<Crossing[]>([]);
  const [filterCross, setFilterCross] = useState<string>('all');
  const [loading, setLoading]         = useState(true);
  const [showDetail, setShowDetail]   = useState(false);
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithCrossing | null>(null);
  const [detailForm, setDetailForm]   = useState({ type: 'ESP32', mqtt_client_id: '', cross_id: '' });
  const [saving, setSaving]           = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      console.log('Fetching devices, components, and crossings...');
      
      // Fetch devices with crossing info
      const { data: devs, error: devError } = await supabase
        .from('devices')
        .select(`
          *,
          crossings (
            name
          )
        `)
        .order('registered_at', { ascending: false });

      // Fetch device components
      const { data: components, error: compError } = await supabase
        .from('device_components')
        .select('*')
        .order('component_name');

      // Fetch crossings
      const { data: cross, error: crossError } = await supabase
        .from('crossings')
        .select('*')
        .order('name');

      console.log('Devices:', devs, 'Error:', devError);
      console.log('Components:', components, 'Error:', compError);
      console.log('Crossings:', cross, 'Error:', crossError);

      if (devError) {
        console.error('Devices fetch error:', devError);
      }
      if (compError) {
        console.error('Components fetch error:', compError);
      }
      if (crossError) {
        console.error('Crossings fetch error:', crossError);
      }

      setDevices(devs || []);
      setCrossings(cross || []);
      
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
      setCrossings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    // Set initial filter based on user role
    if (profile?.role === 'Staff' && profile?.cross_id) {
      setFilterCross(profile.cross_id);
    }
    fetchData(); 
  }, [profile]);

  const filtered = filterCross === 'all'
    ? devices
    : devices.filter(d => d.cross_id === filterCross);

  const onlineCount = devices.filter(d => d.status === 'online').length;

  function openAdd() {
    setSelectedDevice(null);
    setIsDetailEditing(true);
    setShowDetail(true);
    setDetailForm({ type: 'ESP32', mqtt_client_id: '', cross_id: crossings[0]?.cross_id || '' });
  }

  function openEdit(dev: Device) {
    setSelectedDevice(dev as DeviceWithCrossing);
    setDetailForm({ type: dev.type, mqtt_client_id: dev.mqtt_client_id || '', cross_id: dev.cross_id });
    setIsDetailEditing(true);
    setShowDetail(true);
  }

  function openDetail(dev: DeviceWithCrossing) {
    setSelectedDevice(dev);
    setDetailForm({ type: dev.type, mqtt_client_id: dev.mqtt_client_id || '', cross_id: dev.cross_id });
    setIsDetailEditing(false);
    setShowDetail(true);
  }

  async function handleSaveDetail() {
    setSaving(true);
    try {
      if (selectedDevice?.device_id) {
        const { error } = await supabase.from('devices').update(detailForm).eq('device_id', selectedDevice.device_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('devices').insert({ ...detailForm, status: 'offline' });
        if (error) throw error;
      }
      await fetchData();
      setIsDetailEditing(false);
    } catch (error) {
      console.error('Save device error:', error);
      alert('Gagal menyimpan device. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(deviceId: string) {
    if (!confirm('Hapus device ini?')) return;
    await supabase.from('devices').delete().eq('device_id', deviceId);
    fetchData();
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-8">

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/50 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-cyan-500/10 p-2 rounded-lg">
              <Settings2 className="text-cyan-400 w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Device <span className="text-cyan-400">Management</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-1">
            {profile?.role === 'Admin' ? 'Semua perangkat di seluruh perlintasan' : 'Perangkat di perlintasan saya'}
          </p>
        </div>
        {profile?.role === 'Admin' && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah Device
          </button>
        )}
      </header>
      

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Device',  value: devices.length },
          { label: 'Online',        value: onlineCount },
          { label: 'Offline',       value: devices.length - onlineCount },
          { label: 'Perlintasan',   value: crossings.length },
        ].map((s, i) => (
          <div key={i} className="bg-[#0a0f18] border border-slate-800 p-4 rounded-2xl">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{s.label}</p>
            <h2 className="text-2xl font-black text-white mt-1">{s.value}</h2>
          </div>
        ))}
      </div>

      {profile?.role === 'Admin' && (
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterCross('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterCross === 'all' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}
            >
              Semua
            </button>
            {crossings.map(c => (
              <button
                key={c.cross_id}
                onClick={() => setFilterCross(c.cross_id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterCross === c.cross_id ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="bg-[#0a0f18] border border-slate-800 rounded-3xl h-64 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {filtered.map(dev => {
            const { icon, color, text, label } = getDeviceVisuals(dev.type);
            const health = getHealth(dev.last_seen_at);
            return (
              <div key={dev.device_id} onClick={() => openDetail(dev)} className="bg-[#0a0f18] border border-slate-800 rounded-3xl overflow-hidden group hover:border-cyan-500/30 transition-all shadow-xl cursor-pointer">
                <div className="p-5 border-b border-slate-800/50 flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-cyan-400">{icon}</div>
                    <div>
                      <h3 className="font-bold text-white leading-tight">{dev.type}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{label}</p>
                      <p className="text-[10px] text-cyan-400/60 mt-0.5">{(dev as any).crossings?.name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openDetail(dev)} className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(dev.device_id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                      <p className={`text-sm font-bold ${health > 70 ? 'text-emerald-400' : health > 40 ? 'text-amber-400' : 'text-red-400'}`}>{health}%</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${color}`} style={{ width: `${health}%` }} />
                  </div>
                  <div className="border-t border-slate-800/50 pt-3">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Components</p>
                    <div className="space-y-1">
                      {((window as any).deviceComponents?.[dev.device_id] || []).map((comp: any) => (
                        <div key={comp.component_id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              comp.status === 'healthy' ? 'bg-emerald-400' :
                              comp.status === 'warning' ? 'bg-amber-400' :
                              comp.status === 'offline' ? 'bg-slate-500' : 'bg-red-400'
                            }`} />
                            <span className="text-slate-400">{comp.component_name}</span>
                          </div>
                          <span className="text-[10px] text-slate-600 font-mono">{comp.component_code}</span>
                        </div>
                      ))}
                      {(!((window as any).deviceComponents?.[dev.device_id]) || ((window as any).deviceComponents?.[dev.device_id] || []).length === 0) && (
                        <p className="text-[10px] text-slate-600 italic">No components</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-mono text-slate-500">
                        {dev.last_seen_at ? new Date(dev.last_seen_at).toLocaleTimeString('id-ID') : 'Never'}
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

      {showDetail && (selectedDevice || isDetailEditing) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <style>{`
            .device-detail-modal {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .device-detail-modal::-webkit-scrollbar {
              display: none;
            }
            .components-list {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .components-list::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="device-detail-modal bg-[#0a0f18] border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {isDetailEditing && !selectedDevice?.device_id ? (
                    <h2 className="text-white font-black text-2xl mb-1">Tambah Device</h2>
                  ) : (
                    <>
                      <h2 className="text-white font-black text-2xl mb-1 break-words">{selectedDevice?.type}</h2>
                      <p className="text-slate-500 text-sm truncate">{(selectedDevice as any)?.crossings?.name || 'No Crossing'}</p>
                    </>
                  )}
                </div>
                <button onClick={() => setShowDetail(false)} className="text-slate-500 hover:text-white text-2xl flex-shrink-0">×</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedDevice && (
                  <>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                      <p className="text-xs text-slate-500 font-bold uppercase mb-2">Device ID</p>
                      <p className="text-sm text-white font-mono truncate">{selectedDevice.device_id}</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                      <p className="text-xs text-slate-500 font-bold uppercase mb-2">Status</p>
                      <div className="flex items-center gap-2">
                        <CircleDot className={`w-3 h-3 flex-shrink-0 ${selectedDevice.status === 'online' ? 'text-emerald-400' : 'text-red-400'}`} />
                        <p className={`text-sm font-bold ${selectedDevice.status === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {selectedDevice.status.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-2">Type</p>
                  {isDetailEditing ? (
                    <select
                      value={detailForm.type}
                      onChange={e => setDetailForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="ESP32">ESP32</option>
                      <option value="HC_SR05">HC_SR05</option>
                      <option value="IR_FC51">IR_FC51</option>
                    </select>
                  ) : (
                    <p className="text-sm text-slate-300">{detailForm.type}</p>
                  )}
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-2">MQTT Client ID</p>
                  {isDetailEditing ? (
                    <input
                      type="text"
                      value={detailForm.mqtt_client_id}
                      onChange={e => setDetailForm(prev => ({ ...prev, mqtt_client_id: e.target.value }))}
                      placeholder="esp32-cross001"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                    />
                  ) : (
                    <p className="text-sm text-slate-300 font-mono truncate">{selectedDevice?.mqtt_client_id || '—'}</p>
                  )}
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-2">Perlintasan</p>
                  {isDetailEditing ? (
                    <select
                      value={detailForm.cross_id}
                      onChange={e => setDetailForm(prev => ({ ...prev, cross_id: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      {crossings.map(c => <option key={c.cross_id} value={c.cross_id}>{c.name}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm text-slate-300 truncate">{(selectedDevice as any).crossings?.name || '—'}</p>
                  )}
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-2">MAC Address</p>
                  <p className="text-sm text-slate-300 font-mono truncate">{selectedDevice?.mac_address || '—'}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-2">IP Address</p>
                  <p className="text-sm text-slate-300 font-mono truncate">{selectedDevice?.ip_address || '—'}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-2">Last Seen</p>
                  <p className="text-sm text-slate-300 truncate">
                    {selectedDevice?.last_seen_at 
                      ? new Date(selectedDevice.last_seen_at).toLocaleString('id-ID')
                      : 'Never'
                    }
                  </p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-2">Registered</p>
                  <p className="text-sm text-slate-300 truncate">
                    {selectedDevice ? new Date(selectedDevice.registered_at).toLocaleString('id-ID') : '—'}
                  </p>
                </div>
                {selectedDevice && (
                  <div className="col-span-1 md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-3">Components</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto components-list">
                      {((window as any).deviceComponents?.[selectedDevice.device_id] || []).length > 0 ? (
                        ((window as any).deviceComponents?.[selectedDevice.device_id] || []).map((comp: any) => (
                          <div key={comp.component_id} className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800 gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                comp.status === 'healthy' ? 'bg-emerald-400' :
                                comp.status === 'warning' ? 'bg-amber-400' :
                                comp.status === 'offline' ? 'bg-slate-500' : 'bg-red-400'
                              }`} />
                              <div className="min-w-0">
                                <p className="text-sm text-white font-bold truncate">{comp.component_name}</p>
                                <p className="text-xs text-slate-500 truncate">{comp.component_code}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${
                              comp.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' :
                              comp.status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                              comp.status === 'offline' ? 'bg-slate-500/20 text-slate-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {comp.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 italic">No components registered</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-6 md:p-8 border-t border-slate-800 bg-[#0a0f18] flex-shrink-0">
              {isDetailEditing ? (
                <>
                  <button 
                    onClick={() => {
                      setIsDetailEditing(false);
                      if (!selectedDevice?.device_id) {
                        setShowDetail(false);
                      }
                    }}
                    className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm font-bold hover:bg-slate-900 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleSaveDetail}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setShowDetail(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm font-bold hover:bg-slate-900 transition-all"
                  >
                    Tutup
                  </button>
                  {profile?.role === 'Admin' && (
                    <button 
                      onClick={() => setIsDetailEditing(true)}
                      className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold transition-all"
                    >
                      Edit Device
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
