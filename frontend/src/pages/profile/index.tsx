"use client";
import { useState, useEffect } from 'react';
import { User, Mail, Lock, LogOut, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { withAuth } from '../../components/ui/withAuth';
import { useAuth } from '../../hooks/useAuth';
import supabase from '../../lib/supabase';
import { useRouter } from 'next/router';
import type { Profile } from '../../lib/types';

function UserProfile() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [crossingName, setCrossingName] = useState<string | null>(null);

  // Profile form
  const [profileForm, setProfileForm] = useState<{ name: string; email: string }>({
    name: '',
    email: '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name,
        email: profile.email,
      });
      
      // Fetch crossing name if user is Staff
      if (profile.role === 'Staff' && profile.cross_id) {
        fetchCrossingName(profile.cross_id);
      }
    }
  }, [profile]);

  async function fetchCrossingName(crossId: string) {
    const { data } = await supabase
      .from('crossings')
      .select('name')
      .eq('cross_id', crossId)
      .single();
    if (data) {
      setCrossingName(data.name);
    }
  }

  // Update Profile
  async function handleUpdateProfile() {
    if (!profileForm.name?.trim()) {
      setMessage({ type: 'error', text: 'Nama wajib diisi.' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name: profileForm.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile?.id);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
      setIsEditing(false);
    }
    setSaving(false);
  }

  // Change Password
  async function handleChangePassword() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Semua field wajib diisi.' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Password baru tidak cocok.' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password minimal 8 karakter.' });
      return;
    }

    setSaving(true);
    
    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || '',
      password: passwordForm.currentPassword,
    });

    if (signInError) {
      setMessage({ type: 'error', text: 'Password saat ini salah.' });
      setSaving(false);
      return;
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });

    if (updateError) {
      setMessage({ type: 'error', text: updateError.message });
    } else {
      setMessage({ type: 'success', text: 'Password berhasil diubah!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  if (loading || !profile) {
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
        <header className="flex items-center justify-between border-b border-slate-800/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 p-2 rounded-lg">
              <User className="text-cyan-400 w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
                My <span className="text-cyan-400">Profile</span>
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">Kelola akun dan pengaturan pribadi Anda</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-bold"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
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
          {(['profile', 'password'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold text-sm uppercase transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'profile' && 'Profil'}
              {tab === 'password' && 'Password'}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-8 space-y-6">
            <div className="space-y-4">
              {/* Email (Read-only) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </label>
                <div className="px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-300 text-sm">
                  {profile.email}
                </div>
                <p className="text-xs text-slate-600 mt-2">Email tidak dapat diubah. Hubungi admin untuk mengubahnya.</p>
              </div>

              {/* Nama */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Nama Lengkap
                </label>
                <div className="px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-300 text-sm">
                  {profileForm.name}
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Role
                </label>
                <div className="px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-300 text-sm font-mono">
                  {profile.role === 'Admin' ? 'Admin' : 'Staff'}
                </div>
              </div>

              {/* Crossing */}
              {profile.role === 'Staff' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Perlintasan Ditugaskan
                  </label>
                  <div className="px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-300 text-sm">
                    {profile.cross_id ? (crossingName ? crossingName : 'Memuat...') : 'Tidak Ada'}
                  </div>
                </div>
              )}
 
              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Akun Dibuat</p>
                  <p className="text-sm text-slate-300 font-mono">
                    {new Date(profile.created_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Terakhir Diperbarui</p>
                  <p className="text-sm text-slate-300 font-mono">
                    {new Date(profile.updated_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-bold transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase transition-all"
                >
                  Edit Profil
                </button>
              )}
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-8 space-y-6">
            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" />
                  Password Saat Ini
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                    placeholder="Masukkan password saat ini"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Password Baru (Min 8 Karakter) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                    placeholder="Masukkan password baru"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Konfirmasi Password Baru *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                    placeholder="Konfirmasi password baru"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-400">
                <p>💡 Gunakan kombinasi huruf besar, huruf kecil, angka, dan simbol untuk password yang kuat.</p>
              </div>
            </div>

            {/* Button */}
            <button
              onClick={handleChangePassword}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {saving ? 'Mengubah Password...' : 'Ubah Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(UserProfile);
