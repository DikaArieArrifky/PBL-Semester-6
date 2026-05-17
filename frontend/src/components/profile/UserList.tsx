import React, { useState, useEffect } from 'react';
import { User, Eye, Mail } from 'lucide-react';
import Link from 'next/link';
import type { Profile } from '@/lib/types';

interface UserListProps {
  users: Profile[];
  loading?: boolean;
  onSelectUser?: (user: Profile) => void;
  showLink?: boolean;
}

export function UserList({ users, loading = false, onSelectUser, showLink = true }: UserListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Tidak ada user ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map(user => (
        <div
          key={user.id}
          className="flex items-center gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 hover:bg-slate-900/70 transition-all group cursor-pointer"
          onClick={() => onSelectUser?.(user)}
        >
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-6 h-6 text-slate-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm">{user.name}</h3>
            <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
          </div>

          {/* Role Badge */}
          <span
            className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full whitespace-nowrap ${
              user.role === 'super_admin'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
            }`}
          >
            {user.role === 'super_admin' ? 'Admin' : 'Staff'}
          </span>

          {/* Action */}
          {showLink && (
            <Link
              href={`/user/${user.id}`}
              onClick={e => e.stopPropagation()}
              className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all opacity-0 group-hover:opacity-100"
              title="Lihat Profil"
            >
              <Eye className="w-4 h-4" />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
