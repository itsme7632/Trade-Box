import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-context";
import { BarChart2, Ship, Wallet, Map, User, Anchor, Users, ShieldAlert, LogOut, TrendingUp } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "Market", path: "/market", icon: BarChart2 },
    { name: "Cargo", path: "/cargo", icon: Ship },
    { name: "Wallet", path: "/wallet", icon: Wallet },
    { name: "Tracker", path: "/tracker", icon: Map },
    { name: "Profile", path: "/profile", icon: User },
  ];

  const sidebarExtra = [
    { name: "Shipments", path: "/market/shipments", icon: Anchor },
    { name: "Guild", path: "/guild", icon: Users },
  ];

  if (user?.role === "admin") {
    sidebarExtra.push({ name: "Admin", path: "/admin", icon: ShieldAlert });
  }

  const allSidebarItems = [...navItems, ...sidebarExtra];

  return (
    <div className="flex min-h-screen w-full bg-[#050D1B] text-[#E2E8F0]">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed left-0 top-0 bottom-0 z-40"
        style={{ background: "rgba(8,18,35,0.98)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>

        {/* Logo */}
        <div className="flex h-16 items-center px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2563EB, #0891B2)", boxShadow: "0 0 20px rgba(37,99,235,0.4)" }}>
              <Anchor className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>TradeBox</span>
              <div className="text-[9px] text-[#475569] font-mono uppercase tracking-widest">Global Finance</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {allSidebarItems.map((item) => {
            const isActive = location === item.path || location.startsWith(`${item.path}/`);
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group ${
                  isActive
                    ? "text-white"
                    : "text-[#475569] hover:text-[#94A3B8] hover:bg-white/3"
                }`}
                  style={isActive ? {
                    background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(8,145,178,0.08))",
                    border: "1px solid rgba(59,130,246,0.2)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)"
                  } : { border: "1px solid transparent" }}>
                  <item.icon className={`h-4 w-4 transition-colors ${isActive ? "text-[#3B82F6]" : "text-[#334155] group-hover:text-[#64748B]"}`} />
                  {item.name}
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3B82F6]" style={{ boxShadow: "0 0 6px #3B82F6" }} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#E2E8F0] truncate">{user?.traderId}</p>
              <p className="text-xs text-[#475569] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#EF4444] text-sm font-medium hover:bg-red-500/8 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">

        {/* Mobile Header */}
        <header className="md:hidden flex h-14 items-center justify-between px-4 sticky top-0 z-30"
          style={{ background: "rgba(5,13,27,0.95)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2563EB, #0891B2)", boxShadow: "0 0 16px rgba(37,99,235,0.4)" }}>
              <Anchor className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>TradeBox</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[10px] font-mono text-[#10B981] uppercase tracking-widest">Live</span>
            </div>
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50 flex h-[64px] items-center justify-around px-2 md:hidden">
        {navItems.map((item) => {
          const isActive = location === item.path || location.startsWith(`${item.path}/`);
          return (
            <Link key={item.path} href={item.path}>
              <div className="flex flex-col items-center justify-center py-1 px-3 min-w-[52px] relative">
                {isActive && (
                  <div className="absolute inset-0 rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(8,145,178,0.1))",
                      border: "1px solid rgba(59,130,246,0.25)"
                    }} />
                )}
                <item.icon className={`h-5 w-5 relative z-10 transition-all duration-200 ${isActive ? "text-[#60A5FA]" : "text-[#334155]"}`}
                  style={isActive ? { filter: "drop-shadow(0 0 6px rgba(96,165,250,0.6))" } : {}} />
                <span className={`text-[9px] mt-1 font-medium relative z-10 transition-colors ${isActive ? "text-[#60A5FA]" : "text-[#334155]"}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.03em" }}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
