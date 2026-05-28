import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-context";
import { BarChart2, Ship, Wallet, Map, User, Anchor, Users, ShieldAlert, LogOut } from "lucide-react";

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
    <div style={{ display: "flex", minHeight: "100vh", width: "100%", background: "#f6f8fb" }}>

      {/* Desktop Sidebar */}
      <aside style={{
        display: "none",
        width: "240px",
        flexDirection: "column",
        position: "fixed",
        left: 0, top: 0, bottom: 0,
        zIndex: 40,
        background: "#ffffff",
        borderRight: "1px solid #e8edf2",
        boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
      }} className="md-sidebar">
        {/* Logo */}
        <div style={{
          height: "64px", display: "flex", alignItems: "center", padding: "0 20px",
          borderBottom: "1px solid #f1f5f9",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "10px",
              background: "linear-gradient(135deg, #2563eb, #0891b2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            }}>
              <Anchor size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
                TradeBox
              </div>
              <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Global Finance
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {allSidebarItems.map((item) => {
            const isActive = location === item.path || location.startsWith(`${item.path}/`);
            return (
              <Link key={item.path} href={item.path}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "9px 12px", borderRadius: "10px",
                  marginBottom: "2px", cursor: "pointer",
                  fontSize: "13px", fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#2563eb" : "#64748b",
                  background: isActive ? "#eff6ff" : "transparent",
                  transition: "all 0.15s ease",
                }}>
                  <item.icon size={16} color={isActive ? "#2563eb" : "#94a3b8"} />
                  {item.name}
                  {isActive && (
                    <div style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb" }} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: "12px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 12px", borderRadius: "10px",
            background: "#f8fafc", marginBottom: "4px",
          }}>
            <div style={{
              height: "32px", width: "32px", borderRadius: "50%",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: 700, color: "white", flexShrink: 0,
            }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.traderId}
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button onClick={logout} style={{
            width: "100%", display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 12px", borderRadius: "8px",
            color: "#ef4444", fontSize: "12px", fontWeight: 500,
            background: "transparent", border: "none", cursor: "pointer",
            transition: "background 0.15s ease",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }} className="main-content">

        {/* Mobile Header */}
        <header style={{
          display: "flex", height: "56px", alignItems: "center",
          justifyContent: "space-between", padding: "0 16px",
          position: "sticky", top: 0, zIndex: 30,
          background: "#ffffff",
          borderBottom: "1px solid #e8edf2",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }} className="mobile-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, #2563eb, #0891b2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Anchor size={14} color="white" />
            </div>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              TradeBox
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "4px 10px", borderRadius: "20px",
              background: "#ecfdf5", border: "1px solid #a7f3d0",
            }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#059669", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Live
              </span>
            </div>
            <Link href="/profile">
              <div style={{
                height: "32px", width: "32px", borderRadius: "50%",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: 700, color: "white", cursor: "pointer",
              }}>
                {user?.email?.charAt(0).toUpperCase()}
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", paddingBottom: "72px" }} className="page-main">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 50, display: "flex", height: "64px",
        alignItems: "center", justifyContent: "space-around",
        padding: "0 8px",
      }} id="mobile-nav">
        {navItems.map((item) => {
          const isActive = location === item.path || location.startsWith(`${item.path}/`);
          return (
            <Link key={item.path} href={item.path}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "6px 14px", borderRadius: "12px",
                minWidth: "52px", cursor: "pointer", position: "relative",
                background: isActive ? "#eff6ff" : "transparent",
                transition: "all 0.15s ease",
              }}>
                <item.icon
                  size={20}
                  color={isActive ? "#2563eb" : "#94a3b8"}
                  style={{ marginBottom: "2px" }}
                />
                <span style={{
                  fontSize: "9px", fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#2563eb" : "#94a3b8",
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: "0.01em",
                }}>
                  {item.name}
                </span>
                {isActive && (
                  <div style={{
                    position: "absolute", bottom: "2px",
                    width: "18px", height: "2px", borderRadius: "1px",
                    background: "#2563eb",
                  }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <style>{`
        @media (min-width: 768px) {
          .md-sidebar { display: flex !important; }
          .mobile-header { display: none !important; }
          #mobile-nav { display: none !important; }
          .main-content { margin-left: 240px; }
          .page-main { padding-bottom: 0 !important; }
        }
      `}</style>
    </div>
  );
}
