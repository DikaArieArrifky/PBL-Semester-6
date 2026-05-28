import React from 'react';
import { User, Mail, Shield, MapPin, Calendar } from 'lucide-react';
import Link from 'next/link';
import type { Profile } from '@/lib/types';

interface UserProfileCardProps {
  profile: Profile;
  isCurrentUser?: boolean;
  compact?: boolean;
}

export function UserProfileCard({
  profile,
  isCurrentUser = false,
  compact = false,
}: UserProfileCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-all">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
            <User className="w-5 h-5 text-slate-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{profile.name}</p>
        </div>
        <span
          className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full whitespace-nowrap ${
            profile.role === 'Admin'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
          }`}
        >
          {profile.role === 'Admin' ? 'Admin' : 'Staff'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl overflow-hidden">
      {/* Header Background */}
      <div className="h-24 bg-gradient-to-r from-cyan-500/20 to-slate-900 relative" />

      {/* Content */}
      <div className="px-8 pb-8">
        {/* Avatar */}
        <div className="flex items-end gap-6 -mt-12 mb-6">
          <div className="w-24 h-24 rounded-2xl border-4 border-[#0a0f18] overflow-hidden flex-shrink-0 bg-slate-900">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-12 h-12 text-slate-500" />
              </div>
            )}
          </div>
          {isCurrentUser && (
            <Link
              href="/profile"
              className="ml-auto px-4 py-2 text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Edit Profil →
            </Link>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-white">{profile.name}</h2>
          </div>

          {/* Details */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-600 uppercase font-bold">Email</p>
                <p className="text-sm text-slate-300">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-600 uppercase font-bold">Role</p>
                <p className="text-sm text-slate-300">
                  {profile.role === 'Admin' ? 'Admin' : 'Staff'}
                </p>
              </div>
            </div>

            {profile.role === 'Staff' && profile.cross_id && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-600 uppercase font-bold">Perlintasan</p>
                  <p className="text-sm text-slate-300 font-mono">{profile.cross_id}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-600 uppercase font-bold">Bergabung</p>
                <p className="text-sm text-slate-300">
                  {new Date(profile.created_at).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
