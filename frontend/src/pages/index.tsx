import { useAuth } from '@/lib/auth';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import StaffDashboard from '@/components/dashboard/StaffDashboard';

export default function Home() {
  const { profile, loading } = useAuth();
  const isAdmin = profile?.role === 'Admin'; // ✅ Fix: was 'super_admin', sesuaikan dengan nilai di DB

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
      </div>
    );
  }

  return isAdmin ? <AdminDashboard /> : <StaffDashboard profile={profile} />;
}