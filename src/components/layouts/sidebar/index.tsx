"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Activity,      // Untuk Monitoring Real-time
  History, 
  Settings, 
  TrainFront,
  Cpu,
  Bell,          // Untuk Alerts
  MapPin         // Untuk Crossings/Infrastructure
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  // Menu Items yang disesuaikan dengan kebutuhan Database & Dashboard RailSafe
  const menuItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Live Monitor", href: "/monitor", icon: Activity }, // Memantau sensor detik demi detik
    { name: "Train History", href: "/history", icon: History },  // Log kereta dari tabel train_logs
    { name: "Alerts", href: "/alerts", icon: Bell, badge: 3 },    // Peringatan dari tabel alerts
    { name: "Infrastructure", href: "/infrastructure", icon: MapPin }, // Lokasi perlintasan
    { name: "Devices", href: "/devices", icon: Cpu },           // Status hardware ESP32
  ];

  return (
    <aside className="w-[280px] h-screen sticky top-0 bg-[#0a0f18] border-r border-slate-800 p-6 flex flex-col justify-between">
      
      <div>
        {/* LOGO SECTION */}
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-cyan-500/20 p-2 rounded-xl">
            <TrainFront className="text-cyan-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-white text-lg font-bold tracking-tight leading-none">
              Rail<span className="text-cyan-400">Safe</span>
            </h1>
            <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] mt-1">
              Control Center
            </p>
          </div>
        </div>

        {/* MENU LABEL */}
        <div className="px-4 mb-4">
          <p className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
            Main Menu
          </p>
        </div>

        {/* NAVIGATION */}
        <nav className="flex flex-col gap-1.5 flex-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  }
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span className="font-medium text-sm">{item.name}</span>
                
                {/* Dinamis Badge untuk Alerts */}
                {item.badge && !isActive && (
                  <span className="ml-auto bg-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* FOOTER / SETTINGS AREA */}
      <div className="pt-6 border-t border-slate-800">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-4 ${
            pathname === "/settings" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
        
        <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-slate-400 text-[10px] font-medium">System Online</p>
          </div>
          <p className="text-slate-500 text-[10px]">
            v2.4.0 • Singosari, MLG
          </p>
        </div>
      </div>

    </aside>
  );
}