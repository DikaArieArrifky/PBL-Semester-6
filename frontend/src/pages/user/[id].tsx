"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Loader2, AlertCircle, Mail, Shield, MapPin, Calendar } from 'lucide-react';
import { withAuth } from '../../components/ui/withAuth';
import supabase from '../../lib/supabase';
import type { Profile } from '../../lib/types';

function UserDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    async function fetchUser() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (err) {
        setError('User tidak ditemukan.');
      } else {
        setUser(data as Profile);
      }
      setLoading(false);
    }

    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">User Tidak Ditemukan</h1>
          <p className="text-slate-500 mb-6">{error || 'User yang Anda cari tidak tersedia.'}</p>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>

        {/* Profile Card */}
        <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl overflow-hidden">
          {/* Header Background */}
          <div className="h-32 bg-gradient-to-r from-cyan-500/20 to-slate-900 relative" />

          {/* Content */}
          <div className="px-8 pb-8">
            {/* Avatar */}
            <div className="flex items-end gap-6 -mt-16 mb-8">
              <div className="w-32 h-32 rounded-2xl border-4 border-[#0a0f18] overflow-hidden flex-shrink-0 bg-slate-900">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 text-2xl font-bold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-black text-white">{user.name}</h1>
                <p className="text-slate-500 text-base font-mono mt-1">@{user.username}</p>
              </div>

              {/* Details */}
              <div className="space-y-4 pt-6 border-t border-slate-800">
                <div className="flex items-start gap-4">
                  <Mail className="w-5 h-5 text-cyan-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-bold tracking-wider">Email</p>
                    <p className="text-base text-slate-300 mt-1 break-all">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Shield className="w-5 h-5 text-cyan-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-bold tracking-wider">Role</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-sm font-bold px-3 py-1 rounded-full ${
                          user.role === 'super_admin'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}
                      >
                        {user.role === 'super_admin' ? 'Super Admin' : 'Staff Perlintasan'}
                      </span>
                    </div>
                  </div>
                </div>

                {user.role === 'staff' && (
                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-cyan-400 mt-1 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-600 uppercase font-bold tracking-wider">
                        Perlintasan
                      </p>
                      <p className="text-base text-slate-300 mt-1 font-mono">
                        {user.cross_id || 'Tidak Ada'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <Calendar className="w-5 h-5 text-cyan-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-bold tracking-wider">
                      Bergabung
                    </p>
                    <p className="text-base text-slate-300 mt-1">
                      {new Date(user.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Calendar className="w-5 h-5 text-slate-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-bold tracking-wider">
                      Terakhir Diupdate
                    </p>
                    <p className="text-base text-slate-400 mt-1">
                      {new Date(user.updated_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-6 py-4 text-sm text-cyan-300">
          <p>💡 Ini adalah halaman profil publik. Konten yang ditampilkan adalah informasi umum user.</p>
        </div>
      </div>
    </div>
  );
}

export default withAuth(UserDetailPage);
