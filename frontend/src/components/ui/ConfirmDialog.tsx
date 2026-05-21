import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, User, Mail, Shield, Check, MapPin } from 'lucide-react';

type UserData = {
  name?: string;
  email?: string;
  role?: string;
  crossing_name?: string;
};

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  userData?: UserData;
  verificationText?: string;
  verificationInputValue?: string;
  onVerificationChange?: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya',
  cancelLabel = 'Batal',
  loading = false,
  userData,
  verificationText,
  verificationInputValue = '',
  onVerificationChange,
  onCancel,
  onConfirm,
}: Props) {
  const [localVerification, setLocalVerification] = useState('');

  useEffect(() => {
    if (!open) {
      setLocalVerification('');
    }
  }, [open]);

  if (!open) return null;

  const isVerificationMatched = !verificationText || localVerification === verificationText;
  const isConfirmDisabled = loading || !isVerificationMatched;
  const isDestructive = confirmLabel?.toLowerCase().includes('hapus');
  const isWarning = message?.toLowerCase().includes('tidak bisa dibatalkan') || message?.toLowerCase().includes('permanen');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-[#0a0f18] to-[#05070a] border border-slate-700/50 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in scale-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-900/40 to-transparent">
          <div className="flex items-center gap-3">
            {isDestructive ? (
              <div className="p-2 rounded-xl bg-rose-500/10">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-cyan-500/10">
                <CheckCircle className="w-5 h-5 text-cyan-400" />
              </div>
            )}
            <h3 className={`text-lg font-black tracking-tight ${isDestructive ? 'text-rose-400' : 'text-cyan-400'}`}>
              {title}
            </h3>
          </div>

          <button
            onClick={onCancel}
            disabled={loading}
            className="text-slate-500 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Message */}
          {message && (
            <p className={`text-sm leading-relaxed ${isWarning ? 'text-rose-300 bg-rose-500/5 border border-rose-500/20 px-4 py-3 rounded-xl' : 'text-slate-300'}`}>
              {message}
            </p>
          )}

          {/* User Data */}
          {userData && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Detail User</p>
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 space-y-3 backdrop-blur-sm">
                {userData.name && (
                  <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{userData.name}</span>
                  </div>
                )}
                {userData.email && (
                  <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</span>
                    </div>
                    <span className="text-sm text-slate-300 truncate">{userData.email}</span>
                  </div>
                )}
                {userData.role && (
                  <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Role</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                      <Shield className="w-3 h-3 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-400">{userData.role}</span>
                    </span>
                  </div>
                )}
                {userData.crossing_name && (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Perlintasan</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400">{userData.crossing_name}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verification Input */}
          {verificationText && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Verifikasi Konfirmasi
                </label>
                <p className="text-xs text-slate-400">Ketik: <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded">{verificationText}</span></p>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={localVerification}
                  onChange={(e) => {
                    setLocalVerification(e.target.value);
                    onVerificationChange?.(e.target.value);
                  }}
                  placeholder="Ketik di sini..."
                  className="w-full bg-slate-900/50 border-2 border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all duration-200 disabled:opacity-50"
                  disabled={loading}
                />
                {isVerificationMatched && localVerification.length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="w-5 h-5 text-emerald-400" />
                  </div>
                )}
              </div>
              {!isVerificationMatched && localVerification.length > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  Teks tidak cocok. Silakan cek kembali.
                </p>
              )}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/50 font-bold text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-slate-600"
            >
              {cancelLabel}
            </button>

            <button
              onClick={onConfirm}
              disabled={isConfirmDisabled}
              className={`px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                isDestructive
                  ? `bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-rose-500/30'}`
                  : `bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-cyan-500/30'}`
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                ''
              )}
              {loading ? 'Memproses...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
