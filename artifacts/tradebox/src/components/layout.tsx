import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-context";
import { Anchor, BarChart2, Ship, Wallet, Map, Users, User, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "Market", path: "/market", icon: BarChart2 },
    { name: "Shipments", path: "/market/shipments", icon: Anchor },
    { name: "My Cargo", path: "/cargo", icon: Ship },
    { name: "Wallet", path: "/wallet", icon: Wallet },
    { name: "Tracker", path: "/tracker", icon: Map },
    { name: "Guild", path: "/guild", icon: Users },
    { name: "Profile", path: "/profile", icon: User },
  ];

  if (user?.role === "admin") {
    navItems.push({ name: "Admin", path: "/admin", icon: ShieldAlert });
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-[#F4F7FB] text-[#0F1923]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-[#EEF2F8] bg-white md:flex">
        <div className="flex h-16 items-center px-6 border-b border-[#EEF2F8]">
          <span className="text-xl font-bold font-heading text-[#0F1923] flex items-center gap-2">
            <Anchor className="h-6 w-6 text-[#0066FF]" />
            TradeBox
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-4">
          {navItems.map((item) => {
            const isActive = location === item.path || location.startsWith(`${item.path}/`);
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#0066FF]/10 text-[#0066FF]"
                      : "text-[#6A82A0] hover:bg-[#EEF2F8] hover:text-[#0F1923]"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[#EEF2F8]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-[#F8FAFD] border border-[#EEF2F8] flex items-center justify-center text-sm font-bold text-[#0F1923]">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-[#0F1923]">{user?.traderId}</p>
              <p className="truncate text-xs text-[#6A82A0]">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 mt-2" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="flex h-14 items-center justify-between border-b border-[#EEF2F8] bg-white px-4 md:hidden">
          <span className="text-lg font-bold font-heading text-[#0F1923] flex items-center gap-2">
            <Anchor className="h-5 w-5 text-[#0066FF]" />
            TradeBox
          </span>
          <div className="h-8 w-8 rounded-full bg-[#F8FAFD] border border-[#EEF2F8] flex items-center justify-center text-sm font-bold text-[#0F1923]">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#F4F7FB]">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[#DDE4EF] bg-white px-2 pb-safe md:hidden">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location === item.path || location.startsWith(`${item.path}/`);
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex flex-col items-center justify-center p-2 ${isActive ? "text-[#0066FF]" : "text-[#6A82A0]"}`}>
                <item.icon className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
