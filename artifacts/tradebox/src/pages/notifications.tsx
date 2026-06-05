import { useState, useEffect } from "react";
import { Bell, BellOff, Check, CheckCheck, Megaphone, Info, AlertTriangle, Zap, Clock } from "lucide-react";
import { usePublicAnnouncements } from "@workspace/api-client-react/src/extra-hooks";
import { format, parseISO } from "date-fns";

const STORAGE_KEY = "tb_read_notifications";

function getReadIds(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

const typeConfig: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  announcement: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: Megaphone, label: "Announcement" },
  alert:        { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: AlertTriangle, label: "Alert" },
  maintenance:  { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: AlertTriangle, label: "Maintenance" },
  promotion:    { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: Zap, label: "Promotion" },
  info:         { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", icon: Info, label: "Info" },
};

function S({ h = 80 }: { h?: number }) {
  return <div className="shimmer" style={{ height: h, borderRadius: 14 }} />;
}

export default function NotificationsPage() {
  const { data: announcements, isLoading } = usePublicAnnouncements();
  const [readIds, setReadIds] = useState<Set<number>>(getReadIds);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    saveReadIds(readIds);
  }, [readIds]);

  const active = announcements ?? [];

  const unreadCount = active.filter(a => !readIds.has(a.id)).length;
  const displayed = filter === "unread" ? active.filter(a => !readIds.has(a.id)) : active;

  const markAllRead = () => {
    const next = new Set(readIds);
    active.forEach(a => next.add(a.id));
    setReadIds(next);
  };

  const markRead = (id: number) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>

      {/* Header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "20px 16px 16px" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: unreadCount > 0 ? "#eff6ff" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <Bell size={18} color={unreadCount > 0 ? "#2563eb" : "#94a3b8"} />
                  {unreadCount > 0 && (
                    <div style={{ position: "absolute", top: "-4px", right: "-4px", width: "16px", height: "16px", borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "white", fontFamily: "'JetBrains Mono', monospace" }}>{Math.min(unreadCount, 9)}{unreadCount > 9 ? "+" : ""}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>Notifications</h1>
                  <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                  </p>
                </div>
              </div>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 13px", borderRadius: "10px", background: "#f1f5f9", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
            {(["all", "unread"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", textTransform: "capitalize", background: filter === f ? "#2563eb" : "#f1f5f9", color: filter === f ? "white" : "#64748b", transition: "all 0.15s ease" }}>
                {f}{f === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[...Array(4)].map((_, i) => <S key={i} h={100} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <BellOff size={28} color="#cbd5e1" />
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}>
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              {filter === "unread" ? "You're all caught up!" : "Platform announcements will appear here."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {displayed.map(a => {
              const cfg = typeConfig[a.type] || typeConfig.info;
              const Icon = cfg.icon;
              const isRead = readIds.has(a.id);
              const ts = a.scheduledAt ? parseISO(a.scheduledAt as string) : parseISO(a.createdAt as string);

              return (
                <div
                  key={a.id}
                  onClick={() => markRead(a.id)}
                  style={{
                    background: isRead ? "#ffffff" : "#fafcff",
                    border: `1px solid ${isRead ? "#e8edf2" : cfg.border}`,
                    borderRadius: "16px",
                    padding: "14px 16px",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    transition: "border-color 0.2s ease",
                    boxShadow: isRead ? "none" : "0 2px 8px rgba(37,99,235,0.06)",
                  }}
                >
                  {/* Unread left accent */}
                  {!isRead && (
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: cfg.color, borderRadius: "0 2px 2px 0" }} />
                  )}

                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} color={cfg.color} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {cfg.label}
                          </span>
                          {!isRead && (
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb", flexShrink: 0 }} />
                          )}
                        </div>
                        {isRead && (
                          <Check size={12} color="#a3b8cc" style={{ flexShrink: 0, marginTop: "1px" }} />
                        )}
                      </div>

                      <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: isRead ? 500 : 700, color: "#0f172a", lineHeight: 1.4 }}>
                        {a.title}
                      </p>
                      <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
                        {a.message}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Clock size={10} color="#94a3b8" />
                        <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                          {format(ts, "MMM dd, yyyy · HH:mm")}
                        </span>
                        {a.expiresAt && (
                          <span style={{ marginLeft: "4px", fontSize: "9px", color: "#d97706", fontFamily: "'JetBrains Mono', monospace" }}>
                            · Expires {format(parseISO(a.expiresAt as string), "MMM dd")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {active.length > 0 && (
          <p style={{ textAlign: "center", marginTop: "20px", fontSize: "10px", color: "#cbd5e1", fontFamily: "'JetBrains Mono', monospace" }}>
            {active.length} notification{active.length !== 1 ? "s" : ""} total
          </p>
        )}
      </div>
    </div>
  );
}
