import { ReactNode, useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-context";
import { BarChart2, Ship, Wallet, Map, User, Anchor, Users, ShieldAlert, LogOut, Bell, X, Info, AlertTriangle, Megaphone, Wrench, Tag, ChevronRight } from "lucide-react";

// ─── Announcement Popup ──────────────────────────────────────────────────────

const DISMISSED_KEY = "tb_dismissed_announcements";
const BASE = import.meta.env.BASE_URL ?? "/";

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: string;
  targetAudience: string;
  scheduledAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

function getDismissed(): number[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

function addDismissed(id: number) {
  const current = getDismissed();
  if (!current.includes(id)) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...current, id]));
  }
}

const announcementTypeIcon: Record<string, typeof Info> = {
  banner: Megaphone,
  popup: Megaphone,
  information: Info,
  update: Info,
  warning: AlertTriangle,
  maintenance: Wrench,
  promotion: Tag,
};

const announcementTypeColor: Record<string, { bg: string; border: string; icon: string; badge: string; badgeBg: string }> = {
  banner:      { bg: "#eff6ff", border: "#bfdbfe", icon: "#2563eb", badge: "Info",        badgeBg: "#dbeafe" },
  popup:       { bg: "#eff6ff", border: "#bfdbfe", icon: "#2563eb", badge: "Notice",      badgeBg: "#dbeafe" },
  information: { bg: "#eff6ff", border: "#bfdbfe", icon: "#2563eb", badge: "Info",        badgeBg: "#dbeafe" },
  update:      { bg: "#ecfdf5", border: "#a7f3d0", icon: "#059669", badge: "Update",      badgeBg: "#d1fae5" },
  warning:     { bg: "#fef3c7", border: "#fcd34d", icon: "#d97706", badge: "Warning",     badgeBg: "#fde68a" },
  maintenance: { bg: "#f5f3ff", border: "#ddd6fe", icon: "#7c3aed", badge: "Maintenance", badgeBg: "#ede9fe" },
  promotion:   { bg: "#fdf2f8", border: "#f5d0fe", icon: "#a21caf", badge: "Promotion",   badgeBg: "#fae8ff" },
};

function matchesAudience(audience: string, userRole?: string): boolean {
  if (audience === "all") return true;
  if (audience === "admins" && userRole === "admin") return true;
  if (audience === "traders" && userRole !== "admin") return true;
  if (audience === "investors" && userRole !== "admin") return true;
  if (audience === "vip" && userRole !== "admin") return true;
  if (audience === "new_users" && userRole !== "admin") return true;
  return false;
}

function AnnouncementPopup({ user }: { user: { role?: string } | null }) {
  const [popup, setPopup] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const apiBase = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
    fetch(`${apiBase}/api/announcements`)
      .then(r => r.ok ? r.json() : [])
      .then((list: Announcement[]) => {
        const dismissed = getDismissed();
        const now = new Date();
        const candidate = list.find(a => {
          if (a.type !== "popup") return false;
          if (dismissed.includes(a.id)) return false;
          if (!matchesAudience(a.targetAudience, user?.role)) return false;
          if (a.scheduledAt && new Date(a.scheduledAt) > now) return false;
          if (a.expiresAt && new Date(a.expiresAt) < now) return false;
          return true;
        });
        if (candidate) {
          setPopup(candidate);
          setTimeout(() => setVisible(true), 600);
        }
      })
      .catch(() => {});
  }, [user]);

  const dismiss = useCallback(() => {
    if (!popup) return;
    addDismissed(popup.id);
    setVisible(false);
    setTimeout(() => setPopup(null), 300);
  }, [popup]);

  if (!popup) return null;

  const cfg = announcementTypeColor[popup.type] || announcementTypeColor.information;
  const Icon = announcementTypeIcon[popup.type] || Info;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
          zIndex: 1000, opacity: visible ? 1 : 0,
          transition: "opacity 0.25s ease",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Dialog */}
      <div style={{
        position: "fixed", left: "50%", top: "50%",
        transform: visible ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -50%) scale(0.93)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.25s ease, opacity 0.25s ease",
        zIndex: 1001,
        width: "min(400px, calc(100vw - 32px))",
        background: "#ffffff",
        borderRadius: "20px",
        boxShadow: "0 24px 48px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}>
        {/* Colored top band */}
        <div style={{ height: "4px", background: cfg.icon }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px 16px 12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={18} color={cfg.icon} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
              <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", color: cfg.icon, background: cfg.badgeBg }}>
                {cfg.badge}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
              {popup.title}
            </h3>
          </div>
          <button
            onClick={dismiss}
            style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <X size={13} color="#64748b" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "0 16px 16px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: 1.65 }}>
            {popup.message}
          </p>

          {popup.expiresAt && (
            <p style={{ margin: "10px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              Expires {new Date(popup.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
          <button
            onClick={dismiss}
            style={{
              flex: 1, height: "40px", borderRadius: "12px",
              background: "#f1f5f9", border: "1px solid #e2e8f0",
              fontSize: "13px", fontWeight: 600, color: "#64748b",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
          <button
            onClick={dismiss}
            style={{
              flex: 1, height: "40px", borderRadius: "12px",
              background: cfg.icon, border: "none",
              fontSize: "13px", fontWeight: 700, color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Got it →
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
            <Link href="/notifications">
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Bell size={15} color="#64748b" />
              </div>
            </Link>
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
        <main style={{ flex: 1, overflowY: "auto", paddingBottom: "80px" }} className="page-main">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 50, display: "flex", height: "64px",
        alignItems: "center", justifyContent: "space-around",
        padding: "0 8px",
        background: "#ffffff",
        borderTop: "1px solid #e8edf2",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
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

      {/* Announcement Popup — rendered outside the scroll container */}
      <AnnouncementPopup user={user} />

      <style>{`
        @media (min-width: 768px) {
          .md-sidebar { display: flex !important; }
          .mobile-header { display: none !important; }
          #mobile-nav { display: none !important; }
          .main-content { margin-left: 240px; }
          .page-main { padding-bottom: 0 !important; }
        }
        /* Safe area insets for devices with home indicator */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          #mobile-nav { padding-bottom: env(safe-area-inset-bottom); height: calc(64px + env(safe-area-inset-bottom)); }
          .page-main { padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
    </div>
  );
}
