"use client";
import { useState, useEffect } from 'react';
import { Settings, Bell, Lock, Eye, Moon, Sun, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { withAuth } from '../../components/ui/withAuth';
import { useAuth } from '../../hooks/useAuth';
import supabase from '../../lib/supabase';

interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  darkMode: boolean;
  language: 'id' | 'en';
}

function UserSettings() {
  const { profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'notifications' | 'appearance' | 'privacy'>('notifications');
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    darkMode: true,
    language: 'id',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Load preferences dari localStorage (atau bisa dari database)
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        // Default preferences
      }
    }
  }, []);

  async function handleSavePreferences() {
    setSaving(true);
    try {
      // Simpan ke localStorage
      localStorage.setItem('userPreferences', JSON.stringify(preferences));

      // Bisa juga simpan ke database jika diperlukan
      // await supabase.from('user_preferences').upsert({
      //   user_id: profile?.id,
      //   ...preferences,
      // });

      setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-slate-800/50 pb-6">
          <div className="bg-cyan-500/10 p-2 rounded-lg">
            <Settings className="text-cyan-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Settings & <span className="text-cyan-400">Preferences</span>
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Kelola pengaturan akun dan preferensi Anda</p>
          </div>
        </header>

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800/50">
          {(['notifications', 'appearance', 'privacy'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold text-sm uppercase transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'notifications' && <span className="flex items-center gap-2"><Bell className="w-4 h-4" /> Notifikasi</span>}
              {tab === 'appearance' && <span className="flex items-center gap-2"><Sun className="w-4 h-4" /> Tampilan</span>}
              {tab === 'privacy' && <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Privasi</span>}
            </button>
          ))}
        </div>

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-8 space-y-6">
            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div>
                  <h3 className="font-bold text-white">Email Notifications</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Terima notifikasi penting melalui email
                  </p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                  className={`relative w-14 h-8 rounded-full transition-all ${
                    preferences.emailNotifications ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      preferences.emailNotifications ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div>
                  <h3 className="font-bold text-white">Push Notifications</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Notifikasi realtime untuk event penting
                  </p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, pushNotifications: !prev.pushNotifications }))}
                  className={`relative w-14 h-8 rounded-full transition-all ${
                    preferences.pushNotifications ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      preferences.pushNotifications ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Info */}
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 text-sm text-cyan-300">
                <p>💡 Notifikasi akan dikirim untuk alert train detection, device issues, dan maintenance alerts.</p>
              </div>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-8 space-y-6">
            <div className="space-y-4">
              {/* Dark Mode */}
              <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                <div>
                  <h3 className="font-bold text-white">Dark Mode</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Gunakan dark theme untuk semua halaman
                  </p>
                </div>
                <button
                  onClick={() => setPreferences(prev => ({ ...prev, darkMode: !prev.darkMode }))}
                  className={`relative w-14 h-8 rounded-full transition-all ${
                    preferences.darkMode ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      preferences.darkMode ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Bahasa
                </label>
                <select
                  value={preferences.language}
                  onChange={e => setPreferences(prev => ({ ...prev, language: e.target.value as 'id' | 'en' }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Info */}
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 text-sm text-cyan-300">
                <p>💡 Pengaturan tampilan akan diterapkan secara global ke seluruh aplikasi.</p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-8 space-y-6">
            <div className="space-y-4">
              {/* Profile Visibility */}
              <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                <h3 className="font-bold text-white mb-3">Visibilitas Profil</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="visibility" checked className="w-4 h-4" readOnly />
                    <div>
                      <p className="font-semibold text-white text-sm">Public</p>
                      <p className="text-xs text-slate-500">Profil bisa dilihat oleh semua user</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer opacity-50">
                    <input type="radio" name="visibility" disabled className="w-4 h-4" />
                    <div>
                      <p className="font-semibold text-white text-sm">Private</p>
                      <p className="text-xs text-slate-500">(Fitur akan datang)</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Activity Visibility */}
              <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                <h3 className="font-bold text-white mb-3">Aktifitas</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-cyan-500" />
                  <div>
                    <p className="font-semibold text-white text-sm">Tampilkan Status Online</p>
                    <p className="text-xs text-slate-500">Tunjukkan kapan Anda sedang online</p>
                  </div>
                </label>
              </div>

              {/* Data & Privacy */}
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <h3 className="font-bold text-rose-400 mb-3">Data & Privasi</h3>
                <div className="space-y-2 text-sm text-rose-300">
                  <p>🔒 Data Anda dienkripsi dan aman</p>
                  <p>📋 Baca <a href="#" className="underline hover:no-underline">Privacy Policy</a> kami</p>
                  <p>⚠️ Untuk menghapus akun, hubungi admin</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-6 py-4 text-sm text-slate-400">
          <p>💡 Pengaturan akan disimpan otomatis ke perangkat Anda. Beberapa pengaturan mungkin memerlukan refresh halaman untuk berlaku.</p>
        </div>
      </div>
    </div>
  );
}

export default withAuth(UserSettings);
