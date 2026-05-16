import { useAuth } from '@/lib/auth';
import AdminDevices from '@/components/devices/AdminDevices';
import StaffDevices from '@/components/devices/StaffDevices';

export default function DevicesPage() {
  const { profile, loading } = useAuth();
  const isAdmin = profile?.role === 'super_admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
      </div>
    );
  }

  return isAdmin ? <AdminDevices /> : <StaffDevices />;
}