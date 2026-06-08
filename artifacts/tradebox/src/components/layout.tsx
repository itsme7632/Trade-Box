import { ReactNode, useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-context";
import { BarChart2, Ship, Wallet, Map, User, Anchor, Users, ShieldAlert, LogOut, Bell, X, Info, AlertTriangle, Megaphone, Wrench, Tag, ChevronRight, Newspaper, Check, CheckCheck, Package, Zap, Clock, Sun, Moon } from "lucide-react";
import { useGetUnreadNotificationCount, useGetUserNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react/src/extra-hooks";
import { useShipmentStageChanged } from "@/hooks/use-socket";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/components/theme-context";
import { formatDistanceToNow, parseISO } from "date-fns";

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
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}
function addDismissed(id: number) {
  const current = getDismissed();
  if (!current.includes(id)) localStorage.setItem(DISMISSED_KEY, JSON.stringify([...current, id]));
}

const announcementTypeIcon: Record<string, typeof Info> = {
  banner: Megaphone, popup: Megaphone, information: Info, update: Info,
  warning: AlertTriangle, maintenance: Wrench, promotion: Tag,
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
        if (candidate) { setPopup(candidate); setTimeout(() => setVisible(true), 600); }
      }).catch(() => {});
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

  const ctaUrl = (popup as any).ctaUrl as string | undefined;
  const ctaText = (popup as any).ctaText as string | undefined;
  const imageUrl = (popup as any).imageUrl as string | undefined;

  return (
    <>
      <div onClick={dismiss} style={{ position: "fixed", inset: 0, background: "rgba(10,14,26,0.55)", zIndex: 1100, opacity: visible ? 1 : 0, transition: "opacity 0.3s ease", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", left: "50%", top: "50%", transform: visible ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -50%) scale(0.9)", opacity: visible ? 1 : 0, transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease", zIndex: 1101, width: "min(460px, calc(100vw - 24px))", background: "var(--tb-bg-card)", borderRadius: "24px", boxShadow: "0 32px 64px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.05)", overflow: "hidden" }}>

        {/* Accent bar */}
        <div style={{ height: "5px", background: `linear-gradient(90deg, ${cfg.icon}, ${cfg.icon}88)` }} />

        {/* Optional image banner */}
        {imageUrl && (
          <div style={{ width: "100%", maxHeight: "180px", overflow: "hidden" }}>
            <img src={imageUrl} alt="" style={{ width: "100%", objectFit: "cover", display: "block" }} />
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "20px 20px 14px" }}>
          <div className="tb-popup-icon-bg" style={{ width: "46px", height: "46px", borderRadius: "14px", background: cfg.bg, border: `1.5px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${cfg.icon}22` }}>
            <Icon size={20} color={cfg.icon} />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: "2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
              <span style={{ padding: "2px 9px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.07em", color: cfg.icon, background: cfg.badgeBg }}>{cfg.badge}</span>
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em", lineHeight: 1.3 }}>{popup.title}</h3>
          </div>
          <button onClick={dismiss} style={{ width: "30px", height: "30px", borderRadius: "10px", background: "var(--tb-bg-subtle)", border: "1px solid var(--tb-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: "2px" }}>
            <X size={13} color="var(--tb-text-faint)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "0 20px 18px" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--tb-text-secondary)", lineHeight: 1.7 }}>{popup.message}</p>
          {popup.expiresAt && <p style={{ margin: "10px 0 0", fontSize: "10px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: "4px" }}>⏱ Expires {new Date(popup.expiresAt).toLocaleDateString()}</p>}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", padding: "14px 20px 18px", borderTop: "1px solid var(--tb-border-subtle)" }}>
          <button onClick={dismiss} style={{ flex: "0 0 auto", height: "42px", padding: "0 16px", borderRadius: "12px", background: "var(--tb-bg-subtle)", border: "1px solid var(--tb-border)", fontSize: "13px", fontWeight: 600, color: "var(--tb-text-faint)", cursor: "pointer", whiteSpace: "nowrap" }}>
            Dismiss
          </button>
          {ctaUrl ? (
            <a href={ctaUrl} target="_blank" rel="noopener noreferrer" onClick={dismiss} style={{ flex: 1, height: "42px", borderRadius: "12px", background: cfg.icon, border: "none", fontSize: "13px", fontWeight: 700, color: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", textDecoration: "none", boxShadow: `0 4px 14px ${cfg.icon}44` }}>
              {ctaText || "Learn more"} →
            </a>
          ) : (
            <button onClick={dismiss} style={{ flex: 1, height: "42px", borderRadius: "12px", background: cfg.icon, border: "none", fontSize: "13px", fontWeight: 700, color: "#ffffff", cursor: "pointer", boxShadow: `0 4px 14px ${cfg.icon}44` }}>
              {ctaText || "Got it"} →
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Notification Drawer ──────────────────────────────────────────────────────

const notifTypeConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  shipment_update:    { color: "#2563eb", bg: "#eff6ff", icon: Ship,     label: "Update"    },
  shipment_event:     { color: "#7c3aed", bg: "#f5f3ff", icon: Package,  label: "Event"     },
  shipment_paused:    { color: "#d97706", bg: "#fffbeb", icon: Clock,    label: "Paused"    },
  shipment_resumed:   { color: "#059669", bg: "#ecfdf5", icon: Ship,     label: "Resumed"   },
  shipment_delivered: { color: "#059669", bg: "#ecfdf5", icon: Check,    label: "Delivered" },
  info:               { color: "#0891b2", bg: "#ecfeff", icon: Info,     label: "Info"      },
  news_post:          { color: "#2563eb", bg: "#eff6ff", icon: Newspaper, label: "News"     },
  deposit:            { color: "#059669", bg: "#ecfdf5", icon: Zap,      label: "Deposit"   },
  withdrawal:         { color: "#dc2626", bg: "#fef2f2", icon: Zap,      label: "Withdraw"  },
};

function NotifDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: notifs, isLoading, refetch } = useGetUserNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();
  const qc = useQueryClient();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const list = notifs ?? [];
  const unread = list.filter(n => !n.isRead).length;

  const handleMarkAll = () => {
    markAll.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/notifications"] });
        qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
        refetch();
      }
    });
  };

  const handleMarkOne = (id: number) => {
    markOne.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/notifications"] });
        qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
        refetch();
      }
    });
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }} />
      <div ref={drawerRef} className="notif-drawer">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 12px", borderBottom: "1px solid var(--tb-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bell size={16} color="#2563eb" />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Notifications</span>
            {unread > 0 && (
              <span style={{ padding: "1px 7px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: "#dc2626", color: "white", fontFamily: "'JetBrains Mono', monospace" }}>{unread}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {unread > 0 && (
              <button onClick={handleMarkAll} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "8px", background: "var(--tb-bg-muted)", border: "1px solid var(--tb-border)", fontSize: "11px", fontWeight: 600, color: "var(--tb-text-faint)", cursor: "pointer" }}>
                <CheckCheck size={12} /> All read
              </button>
            )}
            <button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "8px", background: "var(--tb-bg-muted)", border: "1px solid var(--tb-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={13} color="var(--tb-text-faint)" />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ maxHeight: "420px", overflowY: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {[...Array(4)].map((_, i) => <div key={i} className="shimmer" style={{ height: "60px", borderRadius: "12px" }} />)}
            </div>
          ) : list.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <BellOff size={28} color="var(--tb-text-muted)" style={{ marginBottom: "8px" }} />
              <p style={{ margin: 0, fontSize: "13px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>No notifications yet</p>
            </div>
          ) : (
            list.map((n, idx) => {
              const cfg = notifTypeConfig[n.type] || notifTypeConfig.info;
              const Icon = cfg.icon;
              const timeAgo = n.createdAt ? formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true }) : "";
              return (
                <div key={n.id} onClick={() => !n.isRead && handleMarkOne(n.id)} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 16px", borderBottom: idx < list.length - 1 ? "1px solid var(--tb-border-subtle)" : "none", background: n.isRead ? "transparent" : "var(--tb-bg-muted)", cursor: n.isRead ? "default" : "pointer", transition: "background 0.15s" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={15} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                      <p style={{ margin: 0, fontSize: "12px", fontWeight: n.isRead ? 500 : 700, color: "var(--tb-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{n.title}</p>
                      {!n.isRead && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb", flexShrink: 0 }} />}
                    </div>
                    <p style={{ margin: 0, fontSize: "11px", color: "var(--tb-text-secondary)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.message}</p>
                    <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--tb-border)" }}>
          <Link href="/notifications">
            <div onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "8px", borderRadius: "10px", background: "var(--tb-bg-muted)", fontSize: "12px", fontWeight: 600, color: "#2563eb", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              View all notifications <ChevronRight size={13} />
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}

// Missing import for BellOff
function BellOff({ size, color, style }: { size: number; color: string; style?: React.CSSProperties }) {
  return <Bell size={size} color={color} style={{ ...style, opacity: 0.4 }} />;
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const qc = useQueryClient();
  const { data: unreadData, refetch: refetchUnread } = useGetUnreadNotificationCount();
  const unreadCount = unreadData?.count ?? 0;
  const [notifOpen, setNotifOpen] = useState(false);

  useShipmentStageChanged(() => {
    refetchUnread();
    qc.invalidateQueries({ queryKey: ["/api/notifications"] });
  });

  const navItems = [
    { name: "Market",  path: "/market",  icon: BarChart2 },
    { name: "Cargo",   path: "/cargo",   icon: Ship      },
    { name: "Wallet",  path: "/wallet",  icon: Wallet    },
    { name: "Tracker", path: "/tracker", icon: Map       },
    { name: "Profile", path: "/profile", icon: User      },
  ];

  const sidebarExtra = [
    { name: "Shipments", path: "/market/shipments", icon: Anchor },
    { name: "Guild",     path: "/guild",             icon: Users  },
    { name: "News",      path: "/news",              icon: Newspaper },
  ];

  if (user?.role === "admin") {
    sidebarExtra.push({ name: "Admin", path: "/admin", icon: ShieldAlert });
  }

  const allSidebarItems = [...navItems, ...sidebarExtra];

  return (
    <div style={{ display: "flex", height: "100dvh", width: "100%", background: "var(--tb-bg-page)", overflow: "hidden" }}>

      {/* Desktop Sidebar */}
      <aside style={{ display: "none", width: "240px", flexDirection: "column", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40, background: "var(--tb-nav)", borderRight: "1px solid var(--tb-border)", boxShadow: "2px 0 12px rgba(0,0,0,0.04)" }} className="md-sidebar">
        <div style={{ height: "64px", display: "flex", alignItems: "center", padding: "0 20px", borderBottom: "1px solid var(--tb-border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "linear-gradient(135deg, #2563eb, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}>
              <Anchor size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>TradeBox</div>
              <div style={{ fontSize: "9px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>Global Finance</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {allSidebarItems.map((item) => {
            const isActive = location === item.path || location.startsWith(`${item.path}/`);
            return (
              <Link key={item.path} href={item.path}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "10px", marginBottom: "2px", cursor: "pointer", fontSize: "13px", fontWeight: isActive ? 600 : 500, color: isActive ? "#2563eb" : "var(--tb-text-faint)", background: isActive ? (isDark ? "rgba(37,99,235,0.15)" : "#eff6ff") : "transparent", transition: "all 0.15s ease" }}>
                  <item.icon size={16} color={isActive ? "#2563eb" : "var(--tb-text-muted)"} />
                  {item.name}
                  {isActive && <div style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb" }} />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div style={{ padding: "12px", borderTop: "1px solid var(--tb-border-subtle)" }}>
          {/* Dark mode toggle */}
          <button onClick={toggleTheme} style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "10px", background: "var(--tb-bg-muted)", border: "1px solid var(--tb-border)", fontSize: "12px", fontWeight: 500, color: "var(--tb-text-secondary)", cursor: "pointer", marginBottom: "6px" }}>
            {isDark ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#7c3aed" />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "var(--tb-bg-subtle)", marginBottom: "4px" }}>
            <div style={{ height: "32px", width: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "white", flexShrink: 0 }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--tb-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.traderId}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--tb-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", color: "#ef4444", fontSize: "12px", fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", transition: "background 0.15s ease" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }} className="main-content">

        {/* Mobile Header */}
        <header style={{ display: "flex", height: "56px", alignItems: "center", justifyContent: "space-between", padding: "0 16px", position: "sticky", top: 0, zIndex: 150, background: "var(--tb-header)", borderBottom: "1px solid var(--tb-border)", boxShadow: "var(--tb-shadow-sm)" }} className="mobile-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, #2563eb, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Anchor size={14} color="white" />
            </div>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>TradeBox</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 8px", borderRadius: "20px", background: isDark ? "rgba(16,185,129,0.1)" : "#ecfdf5", border: `1px solid ${isDark ? "rgba(167,243,208,0.2)" : "#a7f3d0"}` }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#059669", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Live</span>
            </div>
            {/* Dark mode toggle (mobile) */}
            <button onClick={toggleTheme} style={{ width: "32px", height: "32px", borderRadius: "10px", background: "var(--tb-bg-muted)", border: "1px solid var(--tb-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {isDark ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#7c3aed" />}
            </button>
            {/* Bell / Notification drawer */}
            <button onClick={() => setNotifOpen(o => !o)} style={{ width: "32px", height: "32px", borderRadius: "10px", background: notifOpen ? "#eff6ff" : (unreadCount > 0 ? "#eff6ff" : "var(--tb-bg-muted)"), border: `1px solid ${notifOpen || unreadCount > 0 ? "#bfdbfe" : "var(--tb-border)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
              <Bell size={15} color={notifOpen || unreadCount > 0 ? "#2563eb" : "var(--tb-text-faint)"} />
              {unreadCount > 0 && (
                <div style={{ position: "absolute", top: "-4px", right: "-4px", width: "14px", height: "14px", borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid var(--tb-header)" }}>
                  <span style={{ fontSize: "8px", fontWeight: 700, color: "white", lineHeight: 1 }}>{Math.min(unreadCount, 9)}{unreadCount > 9 ? "+" : ""}</span>
                </div>
              )}
            </button>
            {/* Avatar */}
            <Link href="/profile">
              <div style={{ height: "32px", width: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "white", cursor: "pointer" }}>
                {user?.email?.charAt(0).toUpperCase()}
              </div>
            </Link>
          </div>
        </header>

        {/* Notification Drawer */}
        <NotifDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", paddingBottom: "80px" }} className="page-main">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, display: "flex", height: "64px", alignItems: "center", justifyContent: "space-around", padding: "0 4px" }} id="mobile-nav">
        {navItems.map((item) => {
          const isActive = location === item.path || location.startsWith(`${item.path}/`);
          return (
            <Link key={item.path} href={item.path}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 10px", borderRadius: "12px", minWidth: "48px", cursor: "pointer", position: "relative", background: isActive ? (isDark ? "rgba(37,99,235,0.15)" : "#eff6ff") : "transparent", transition: "all 0.15s ease" }}>
                <item.icon size={20} color={isActive ? "#2563eb" : "var(--tb-text-muted)"} style={{ marginBottom: "2px" }} />
                <span style={{ fontSize: "9px", fontWeight: isActive ? 600 : 500, color: isActive ? "#2563eb" : "var(--tb-text-muted)", fontFamily: "'Inter', sans-serif", letterSpacing: "0.01em" }}>{item.name}</span>
                {isActive && <div style={{ position: "absolute", bottom: "2px", width: "18px", height: "2px", borderRadius: "1px", background: "#2563eb" }} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Announcement Popup */}
      <AnnouncementPopup user={user} />

      <style>{`
        @media (min-width: 768px) {
          .md-sidebar { display: flex !important; }
          .mobile-header { display: none !important; }
          #mobile-nav { display: none !important; }
          .main-content { margin-left: 240px; }
          .page-main { padding-bottom: 0 !important; }
        }
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          #mobile-nav { padding-bottom: env(safe-area-inset-bottom); height: calc(64px + env(safe-area-inset-bottom)); }
          .page-main { padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
    </div>
  );
}
