import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard, BarChart3, History, TrainFront, Cpu,
  Bell, LogOut, User, ShieldCheck, MapPin, Users,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';

// ─── Menu definitions ─────────────────────────────────────────────────────────

const SHARED_MENU = [
  { name: 'Dashboard', href: '/',          icon: LayoutDashboard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'History',   href: '/history',   icon: History },
  { name: 'Alerts',    href: '/alerts',    icon: Bell },
];

const ADMIN_MENU = [
  { name: 'Crossings', href: '/admin/crossings', icon: MapPin },
  { name: 'Devices',   href: '/admin/devices',   icon: Cpu },
  { name: 'Users',     href: '/admin/users',     icon: Users },
];

const STAFF_MENU = [
  { name: 'Devices',   href: '/staff/devices',   icon: Cpu },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { pathname } = useRouter();
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  const isAdmin = profile.role === 'Admin';

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-[260px] h-screen sticky top-0 bg-[#0a0f18] border-r border-slate-800 flex flex-col shrink-0">

      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-white text-lg font-bold tracking-tight leading-none">
              Rail<span className="text-cyan-400">Safe</span>
            </h1>
            <p className="text-slate-600 text-[10px] uppercase tracking-[0.2em] mt-0.5">
              Control Center
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable nav area ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">

        {/* Main menu label */}
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.15em] px-3 pt-1 pb-2">
          Main Menu
        </p>

        {/* Main nav */}
        <nav className="flex flex-col gap-0.5">
          {SHARED_MENU.map(item => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        {/* Admin section — hanya untuk super_admin */}
        {isAdmin && (
          <div className="pt-3">
            {/* Divider + label */}
            <div className="flex items-center gap-2 px-3 mb-2">
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.15em] px-3 pt-1 pb-2">
                  Management
                </p>
            </div>

            {/* Admin nav */}
            <nav className="flex flex-col gap-0.5">
              {ADMIN_MENU.map(item => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} variant="admin" />
              ))}
            </nav>
          </div>
        )}

        {/* Staff menu */}
        {!isAdmin && (
          <nav className="flex flex-col gap-0.5">
            {STAFF_MENU.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} variant="admin" />
            ))}
          </nav>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-800 px-3 pt-3 pb-4 space-y-0.5">

        {/* Profile */}
        <Link
          href="/profile"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
            isActive('/profile')
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
          }`}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-slate-400">
                {profile.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-tight text-slate-200 group-hover:text-white">
              {profile.name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck className={`w-2.5 h-2.5 shrink-0 ${isAdmin ? 'text-cyan-500' : 'text-slate-600'}`} />
              <p className={`text-[9px] font-bold uppercase tracking-wider truncate ${
                isAdmin ? 'text-cyan-500/70' : 'text-slate-600'
              }`}>
                {isAdmin ? 'Super Admin' : 'Staff'}
              </p>
            </div>
          </div>
        </Link>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>

        {/* Version */}
        <p className="text-slate-700 text-[10px] text-center pt-2">
          v2.4.0 · © 2026 Railway Infrastructure
        </p>
      </div>
    </aside>
  );
}

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({
  item,
  active,
  variant = 'default',
}: {
  item: { name: string; href: string; icon: any };
  active: boolean;
  variant?: 'default' | 'admin';
}) {
  const isAdmin = variant === 'admin';

  const activeClass = isAdmin
    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
    : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20';

  const dotClass = isAdmin
    ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]'
    : 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.7)]';

  const iconActive = isAdmin ? 'text-amber-400' : 'text-cyan-400';

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
        active ? activeClass : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-100'
      }`}
    >
      <item.icon className={`w-4 h-4 shrink-0 transition-colors ${
        active ? iconActive : 'text-slate-500 group-hover:text-slate-300'
      }`} />
      <span className="text-sm font-medium">{item.name}</span>
      {active && <div className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />}
    </Link>
  );
}
