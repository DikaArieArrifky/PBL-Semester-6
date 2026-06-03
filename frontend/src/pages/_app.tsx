import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { TrainFront } from 'lucide-react';
import Sidebar from '@/components/layouts/sidebar';
import { AuthProvider, useAuth } from '@/lib/auth';

// ─── Route config ─────────────────────────────────────────────────────────────

/** Bisa diakses TANPA login */
const PUBLIC_ROUTES = ['/auth/login', '/auth/callback', '/landing'];

/** Prefix yang hanya boleh diakses admin */
const ADMIN_ONLY_PREFIXES = ['/admin'];

// ─── Root export ──────────────────────────────────────────────────────────────

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <AppShell Component={Component} pageProps={pageProps} />
    </AuthProvider>
  );
}

// ─── Shell (di dalam AuthProvider agar bisa pakai useAuth) ───────────────────

function AppShell({ Component, pageProps }: Pick<AppProps, 'Component' | 'pageProps'>) {
  const router   = useRouter();
  const pathname = router.pathname;
  const { session, profile, loading } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAdminRoute  = ADMIN_ONLY_PREFIXES.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (loading) return;

    // 1. Belum login → paksa ke landing page jika buka root, sisanya ke login
    if (!session && !isPublicRoute) {
      if (pathname === '/') {
        router.replace('/landing');
      } else {
        router.replace('/auth/login');
      }
      return;
    }
    // 2. Sudah login → jangan bisa balik ke halaman auth/landing
    if (session && isPublicRoute && pathname !== '/auth/callback') {
      router.replace('/');
      return;
    }

    // 3. Profile belum ada (masih di-fetch) → tunggu
    if (session && !profile) return;

    // 4. Staff mencoba akses /admin/* → tolak
    if (session && profile && isAdminRoute && profile.role !== 'Admin') {
      router.replace('/');
    }
  }, [loading, session, profile, pathname]);

  // Selama auth loading: jangan render apapun
  if (loading) return <FullScreenLoader />;

  // Halaman publik
  if (isPublicRoute) {
    if (session && pathname !== '/auth/callback') return <FullScreenLoader />;
    return <Component {...pageProps} />;
  }

  // Belum login → tahan
  if (!session) return <FullScreenLoader />;

  // Profil belum selesai di-fetch → tahan
  if (!profile) return <FullScreenLoader />;

  // Staff akses admin → tahan
  if (isAdminRoute && profile.role !== 'Admin') return <FullScreenLoader />;

  // Render normal dengan sidebar
  return (
    <div className="bg-[#020617] text-white min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Component {...pageProps} />
      </main>
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="bg-cyan-500/10 p-4 rounded-2xl">
          <TrainFront className="text-cyan-400 w-8 h-8" />
        </div>
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}
