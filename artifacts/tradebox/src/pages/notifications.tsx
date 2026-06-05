import { useState } from "react";
import { Bell, BellOff, Check, CheckCheck, Megaphone, Info, AlertTriangle, Zap, Clock, Ship, Package } from "lucide-react";
import { usePublicAnnouncements, useGetUserNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react/src/extra-hooks";
import { useShipmentStageChanged } from "@/hooks/use-socket";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";

const STORAGE_KEY = "tb_read_announcements";

function getReadAnnouncementIds(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveReadAnnouncementIds(ids: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

const announcementTypeConfig: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  announcement: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: Megaphone, label: "Announcement" },
  alert:        { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: AlertTriangle, label: "Alert" },
  maintenance:  { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: AlertTriangle, label: "Maintenance" },
  promotion:    { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: Zap, label: "Promotion" },
  info:         { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", icon: Info, label: "Info" },
};

const userNotifTypeConfig: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  shipment_update:    { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: Ship, label: "Update" },
  shipment_event:     { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: Package, label: "Event" },
  shipment_paused:    { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: AlertTriangle, label: "Paused" },
  shipment_resumed:   { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", icon: Ship, label: "Resumed" },
  shipment_delivered: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", icon: Check, label: "Delivered" },
  info:               { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", icon: Info, label: "Info" },
};

function S({ h = 80 }: { h?: number }) {
  return <div className="shimmer" style={{ height: h, borderRadius: 14 }} />;
}

type TabType = "alerts" | "system";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: announcements, isLoading: annLoading } = usePublicAnnouncements();
  const { data: userNotifs, isLoading: notifsLoading, refetch: refetchNotifs } = useGetUserNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  const [readAnnIds, setReadAnnIds] = useState<Set<number>>(getReadAnnouncementIds);
  const [activeTab, setActiveTab] = useState<TabType>("alerts");
  const [annFilter, setAnnFilter] = useState<"all" | "unread">("all");
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");

  useShipmentStageChanged(() => {
    refetchNotifs();
    qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
  });

  const anns = announcements ?? [];
  const notifs = userNotifs ?? [];

  const annUnread = anns.filter(a => !readAnnIds.has(a.id)).length;
  const notifUnread = notifs.filter(n => !n.isRead).length;
  const totalUnread = annUnread + notifUnread;

  const displayedAnns = annFilter === "unread" ? anns.filter(a => !readAnnIds.has(a.id)) : anns;
  const displayedNotifs = notifFilter === "unread" ? notifs.filter(n => !n.isRead) : notifs;

  const markAnnRead = (id: number) => {
    const next = new Set(readAnnIds);
    next.add(id);
    setReadAnnIds(next);
    saveReadAnnouncementIds(next);
  };

  const markAllAnnsRead = () => {
    const next = new Set(readAnnIds);
    anns.forEach(a => next.add(a.id));
    setReadAnnIds(next);
    saveReadAnnouncementIds(next);
  };

  const handleMarkAllRead = () => {
    if (activeTab === "alerts") markAllRead.mutate();
    else markAllAnnsRead();
  };

  const currentUnread = activeTab === "alerts" ? notifUnread : annUnread;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>

      {/* Header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "20px 16px 0" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: totalUnread > 0 ? "#eff6ff" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <Bell size={18} color={totalUnread > 0 ? "#2563eb" : "#94a3b8"} />
                {totalUnread > 0 && (
                  <div style={{ position: "absolute", top: "-4px", right: "-4px", width: "16px", height: "16px", borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "white" }}>{Math.min(totalUnread, 9)}{totalUnread > 9 ? "+" : ""}</span>
                  </div>
                )}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>Notifications</h1>
                <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
                  {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
                </p>
              </div>
            </div>
            {currentUnread > 0 && (
              <button onClick={handleMarkAllRead} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 13px", borderRadius: "10px", background: "#f1f5f9", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* Main Tabs */}
          <div style={{ display: "flex", gap: "0", borderBottom: "none" }}>
            {([
              { key: "alerts" as TabType, label: "My Alerts", count: notifUnread },
              { key: "system" as TabType, label: "System", count: annUnread },
            ]).map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                padding: "10px 16px", borderRadius: "0", border: "none", background: "none", cursor: "pointer",
                fontSize: "12px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase",
                color: activeTab === t.key ? "#2563eb" : "#94a3b8",
                borderBottom: activeTab === t.key ? "2px solid #2563eb" : "2px solid transparent",
                display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s ease",
              }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{ padding: "1px 6px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, background: activeTab === t.key ? "#2563eb" : "#f1f5f9", color: activeTab === t.key ? "white" : "#64748b" }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>

        {/* Filter sub-tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
          {(["all", "unread"] as const).map(f => {
            const active = activeTab === "alerts" ? notifFilter : annFilter;
            const setActive = activeTab === "alerts" ? setNotifFilter : setAnnFilter;
            return (
              <button key={f} onClick={() => setActive(f)} style={{ padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", textTransform: "capitalize", background: active === f ? "#2563eb" : "#f1f5f9", color: active === f ? "white" : "#64748b" }}>
                {f}{f === "unread" && currentUnread > 0 ? ` (${currentUnread})` : ""}
              </button>
            );
          })}
        </div>

        {/* My Alerts tab */}
        {activeTab === "alerts" && (
          notifsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[...Array(4)].map((_, i) => <S key={i} h={90} />)}
            </div>
          ) : displayedNotifs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 20px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <BellOff size={28} color="#cbd5e1" />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}>
                {notifFilter === "unread" ? "No unread alerts" : "No alerts yet"}
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                Shipment updates will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {displayedNotifs.map(n => {
                const cfg = userNotifTypeConfig[n.type] || userNotifTypeConfig.info;
                const Icon = cfg.icon;
                return (
                  <div key={n.id} onClick={() => !n.isRead && markRead.mutate(n.id)} style={{
                    background: n.isRead ? "#ffffff" : "#fafcff",
                    border: `1px solid ${n.isRead ? "#e8edf2" : cfg.border}`,
                    borderRadius: "16px", padding: "14px 16px", cursor: n.isRead ? "default" : "pointer",
                    position: "relative", overflow: "hidden",
                    boxShadow: n.isRead ? "none" : "0 2px 8px rgba(37,99,235,0.06)",
                  }}>
                    {!n.isRead && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: cfg.color, borderRadius: "0 2px 2px 0" }} />}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={16} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          <span style={{ padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
                            {cfg.label}
                          </span>
                          {!n.isRead && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb" }} />}
                        </div>
                        <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: n.isRead ? 500 : 700, color: "#0f172a", lineHeight: 1.4 }}>{n.title}</p>
                        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>{n.message}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Clock size={10} color="#94a3b8" />
                          <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                            {format(parseISO(n.createdAt), "MMM dd, yyyy · HH:mm")}
                          </span>
                        </div>
                      </div>
                      {n.isRead && <Check size={12} color="#a3b8cc" style={{ flexShrink: 0, marginTop: "2px" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* System tab */}
        {activeTab === "system" && (
          annLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[...Array(4)].map((_, i) => <S key={i} h={100} />)}
            </div>
          ) : displayedAnns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 20px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <BellOff size={28} color="#cbd5e1" />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}>
                {annFilter === "unread" ? "No unread announcements" : "No announcements yet"}
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                Platform announcements will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {displayedAnns.map(a => {
                const cfg = announcementTypeConfig[a.type] || announcementTypeConfig.info;
                const Icon = cfg.icon;
                const isRead = readAnnIds.has(a.id);
                const ts = a.scheduledAt ? parseISO(a.scheduledAt) : parseISO(a.createdAt);
                return (
                  <div key={a.id} onClick={() => markAnnRead(a.id)} style={{
                    background: isRead ? "#ffffff" : "#fafcff",
                    border: `1px solid ${isRead ? "#e8edf2" : cfg.border}`,
                    borderRadius: "16px", padding: "14px 16px", cursor: "pointer",
                    position: "relative", overflow: "hidden",
                    boxShadow: isRead ? "none" : "0 2px 8px rgba(37,99,235,0.06)",
                  }}>
                    {!isRead && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: cfg.color, borderRadius: "0 2px 2px 0" }} />}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={16} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          <span style={{ padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
                            {cfg.label}
                          </span>
                          {!isRead && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb" }} />}
                        </div>
                        <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: isRead ? 500 : 700, color: "#0f172a", lineHeight: 1.4 }}>{a.title}</p>
                        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>{a.message}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Clock size={10} color="#94a3b8" />
                          <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                            {format(ts, "MMM dd, yyyy · HH:mm")}
                          </span>
                          {a.expiresAt && (
                            <span style={{ marginLeft: "4px", fontSize: "9px", color: "#d97706", fontFamily: "'JetBrains Mono', monospace" }}>
                              · Expires {format(parseISO(a.expiresAt), "MMM dd")}
                            </span>
                          )}
                        </div>
                      </div>
                      {isRead && <Check size={12} color="#a3b8cc" style={{ flexShrink: 0, marginTop: "2px" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "10px", color: "#cbd5e1", fontFamily: "'JetBrains Mono', monospace" }}>
          {activeTab === "alerts"
            ? `${notifs.length} alert${notifs.length !== 1 ? "s" : ""} total`
            : `${anns.length} announcement${anns.length !== 1 ? "s" : ""} total`}
        </p>
      </div>
    </div>
  );
}
