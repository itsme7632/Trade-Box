import { useState } from "react";
import { useAdminListShipments } from "@workspace/api-client-react";
import {
  useAdminGetShipmentOverrideDetail,
  useAdminSetShipmentStage,
  useAdminClearShipmentStage,
  useAdminOverrideShipmentDates,
  useAdminAddShipmentEvent,
  useAdminPauseShipment,
  useAdminResumeShipment,
  useAdminForceDeliverShipment,
} from "@workspace/api-client-react/src/extra-hooks";
import { useToast } from "@/hooks/use-toast";
import {
  Ship, ChevronDown, ChevronUp, Pause, Play, Zap, Calendar,
  MessageSquare, AlertTriangle, CheckCircle2, Clock, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";

const STAGES = [
  { value: "booked", label: "Booked" },
  { value: "loaded", label: "Loaded" },
  { value: "departed", label: "Departed" },
  { value: "at_sea", label: "At Sea" },
  { value: "customs", label: "Customs" },
  { value: "arrived", label: "Arrived" },
  { value: "delivered", label: "Delivered" },
];

const stageColor: Record<string, { color: string; bg: string }> = {
  booked:    { color: "#64748b", bg: "#f1f5f9" },
  loaded:    { color: "#475569", bg: "#e2e8f0" },
  departed:  { color: "#0891b2", bg: "#ecfeff" },
  at_sea:    { color: "#d97706", bg: "#fffbeb" },
  customs:   { color: "#7c3aed", bg: "#f5f3ff" },
  arrived:   { color: "#2563eb", bg: "#eff6ff" },
  delivered: { color: "#059669", bg: "#ecfdf5" },
};

const EVENT_TYPES = [
  "delay", "weather_hold", "customs_hold", "inspection", "route_change",
  "port_congestion", "crew_change", "bunkering", "equipment_fault", "info",
];

function StatusBadge({ status, stageOverride, pausedAt }: { status: string; stageOverride?: string | null; pausedAt?: string | null }) {
  if (pausedAt) return <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>⏸ PAUSED</span>;
  if (stageOverride) {
    const sc = stageColor[stageOverride] || { color: "#6366f1", bg: "#eef2ff" };
    return <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", background: sc.bg, color: sc.color }}>⚡ {stageOverride.toUpperCase()}</span>;
  }
  const cfg: Record<string, { bg: string; color: string }> = {
    open:        { bg: "#fffbeb", color: "#d97706" },
    in_transit:  { bg: "#eff6ff", color: "#2563eb" },
    delivered:   { bg: "#ecfdf5", color: "#059669" },
  };
  const c = cfg[status] ?? { bg: "#f1f5f9", color: "#64748b" };
  return <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", background: c.bg, color: c.color }}>{status}</span>;
}

function ShipmentOverridePanel({ shipmentId, title, onClose }: { shipmentId: number; title: string; onClose: () => void }) {
  const { toast } = useToast();
  const { data: detail, isLoading, refetch } = useAdminGetShipmentOverrideDetail(shipmentId);
  const setStage = useAdminSetShipmentStage();
  const clearStage = useAdminClearShipmentStage();
  const overrideDates = useAdminOverrideShipmentDates();
  const addEvent = useAdminAddShipmentEvent();
  const pause = useAdminPauseShipment();
  const resume = useAdminResumeShipment();
  const forceDeliver = useAdminForceDeliverShipment();

  const [activePanel, setActivePanel] = useState<"stage" | "dates" | "event" | "status">("stage");
  const [selectedStage, setSelectedStage] = useState("");
  const [stageNote, setStageNote] = useState("");
  const [depDate, setDepDate] = useState("");
  const [arrDate, setArrDate] = useState("");
  const [dateNote, setDateNote] = useState("");
  const [eventType, setEventType] = useState("info");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [pauseNote, setPauseNote] = useState("");
  const [deliverNote, setDeliverNote] = useState("");
  const [showConfirmDeliver, setShowConfirmDeliver] = useState(false);

  const ok = (msg: string) => { toast({ title: msg }); refetch(); };
  const err = (e: any) => toast({ title: "Error", description: e?.message ?? "Request failed", variant: "destructive" });

  const handleSetStage = () => {
    if (!selectedStage) return;
    setStage.mutate({ id: shipmentId, stage: selectedStage, note: stageNote || undefined }, {
      onSuccess: () => { ok(`Stage set to ${selectedStage}`); setStageNote(""); setSelectedStage(""); },
      onError: err,
    });
  };

  const handleClearStage = () => {
    clearStage.mutate(shipmentId, { onSuccess: () => ok("Stage override cleared"), onError: err });
  };

  const handleDates = () => {
    overrideDates.mutate({ id: shipmentId, departureDate: depDate || undefined, arrivalDate: arrDate || undefined, note: dateNote || undefined }, {
      onSuccess: () => { ok("Dates updated"); setDepDate(""); setArrDate(""); setDateNote(""); },
      onError: err,
    });
  };

  const handleAddEvent = () => {
    if (!eventTitle.trim()) return;
    addEvent.mutate({ id: shipmentId, eventType, title: eventTitle, description: eventDesc || undefined }, {
      onSuccess: () => { ok("Event added"); setEventTitle(""); setEventDesc(""); },
      onError: err,
    });
  };

  const handlePause = () => {
    pause.mutate({ id: shipmentId, note: pauseNote || undefined }, {
      onSuccess: () => { ok("Shipment paused"); setPauseNote(""); },
      onError: err,
    });
  };

  const handleResume = () => {
    resume.mutate({ id: shipmentId }, { onSuccess: () => ok("Shipment resumed"), onError: err });
  };

  const handleForceDeliver = () => {
    forceDeliver.mutate({ id: shipmentId, note: deliverNote || undefined }, {
      onSuccess: (data) => { ok(`Delivered to ${data.investorCount} investor(s)!`); setShowConfirmDeliver(false); },
      onError: err,
    });
  };

  if (isLoading) return (
    <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
      Loading shipment data…
    </div>
  );

  if (!detail) return null;

  const isPaused = !!detail.pausedAt;
  const isDelivered = detail.status === "delivered";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Detail summary */}
      <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px", border: "1px solid #e8edf2" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>
          <span><span style={{ color: "#94a3b8" }}>STATUS: </span><span style={{ fontWeight: 700, color: "#0f172a" }}>{detail.status.toUpperCase()}</span></span>
          <span><span style={{ color: "#94a3b8" }}>OVERRIDE: </span><span style={{ fontWeight: 700, color: detail.stageOverride ? "#6366f1" : "#94a3b8" }}>{detail.stageOverride?.toUpperCase() ?? "AUTO"}</span></span>
          <span><span style={{ color: "#94a3b8" }}>INVESTORS: </span><span style={{ fontWeight: 700, color: "#0f172a" }}>{detail.investorCount}</span></span>
          <span><span style={{ color: "#94a3b8" }}>FUNDING: </span><span style={{ fontWeight: 700, color: "#0f172a" }}>{detail.fundingRaised.toLocaleString()}/{detail.fundingGoal.toLocaleString()}</span></span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", marginTop: "8px", color: "#64748b" }}>
          <span>DEP: {format(parseISO(detail.departureDate), "MMM dd yyyy")}</span>
          <span>ARR: {format(parseISO(detail.arrivalDate), "MMM dd yyyy")}</span>
          {isPaused && <span style={{ color: "#dc2626", fontWeight: 700 }}>⏸ PAUSED SINCE {format(parseISO(detail.pausedAt!), "MMM dd HH:mm")}</span>}
        </div>
      </div>

      {/* Panel nav */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {([
          { key: "stage", label: "Stage", icon: <Layers size={12} /> },
          { key: "dates", label: "Dates", icon: <Calendar size={12} /> },
          { key: "event", label: "Event", icon: <MessageSquare size={12} /> },
          { key: "status", label: "Status", icon: <AlertTriangle size={12} /> },
        ] as const).map(p => (
          <button key={p.key} onClick={() => setActivePanel(p.key)} style={{
            display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "8px",
            border: "1px solid", borderColor: activePanel === p.key ? "#2563eb" : "#e2e8f0",
            background: activePanel === p.key ? "#2563eb" : "white", color: activePanel === p.key ? "white" : "#64748b",
            fontSize: "11px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", cursor: "pointer",
          }}>
            {p.icon}{p.label}
          </button>
        ))}
      </div>

      {/* Stage Control */}
      {activePanel === "stage" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>Force Stage Override</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {STAGES.map(s => {
              const sc = stageColor[s.value];
              const isSelected = selectedStage === s.value;
              return (
                <button key={s.value} onClick={() => setSelectedStage(isSelected ? "" : s.value)} style={{
                  padding: "6px 12px", borderRadius: "8px", border: `1px solid ${isSelected ? sc.color : "#e2e8f0"}`,
                  background: isSelected ? sc.bg : "white", color: isSelected ? sc.color : "#64748b",
                  fontSize: "11px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
                }}>
                  {s.label}
                </button>
              );
            })}
          </div>
          <Input placeholder="Optional note to investors" value={stageNote} onChange={e => setStageNote(e.target.value)} className="text-sm bg-[#F8FAFD] border-[#EEF2F8]" />
          <div style={{ display: "flex", gap: "8px" }}>
            <Button onClick={handleSetStage} disabled={!selectedStage || setStage.isPending} className="bg-[#2563eb] text-white text-xs flex-1">
              {setStage.isPending ? "Applying…" : "Apply Stage Override"}
            </Button>
            {detail.stageOverride && (
              <Button onClick={handleClearStage} disabled={clearStage.isPending} variant="outline" className="text-xs text-[#dc2626] border-[#fecaca]">
                {clearStage.isPending ? "…" : "Clear Override"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Date Override */}
      {activePanel === "dates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>Override Schedule Dates</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div>
              <label style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", display: "block", marginBottom: "4px" }}>DEPARTURE DATE</label>
              <Input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} className="text-sm bg-[#F8FAFD] border-[#EEF2F8]" />
            </div>
            <div>
              <label style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", display: "block", marginBottom: "4px" }}>ARRIVAL DATE</label>
              <Input type="date" value={arrDate} onChange={e => setArrDate(e.target.value)} className="text-sm bg-[#F8FAFD] border-[#EEF2F8]" />
            </div>
          </div>
          <Input placeholder="Note (e.g. weather delay)" value={dateNote} onChange={e => setDateNote(e.target.value)} className="text-sm bg-[#F8FAFD] border-[#EEF2F8]" />
          <Button onClick={handleDates} disabled={(!depDate && !arrDate) || overrideDates.isPending} className="bg-[#7c3aed] text-white text-xs">
            {overrideDates.isPending ? "Updating…" : "Update Dates + Notify Investors"}
          </Button>
        </div>
      )}

      {/* Custom Event */}
      {activePanel === "event" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>Add Custom Event</div>
          <div>
            <label style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", display: "block", marginBottom: "4px" }}>EVENT TYPE</label>
            <select value={eventType} onChange={e => setEventType(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #EEF2F8", background: "#F8FAFD", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", color: "#0f172a" }}>
              {EVENT_TYPES.map(et => <option key={et} value={et}>{et.replace("_", " ").toUpperCase()}</option>)}
            </select>
          </div>
          <Input placeholder="Event title (shown to investors)" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="text-sm bg-[#F8FAFD] border-[#EEF2F8]" />
          <Input placeholder="Description (optional)" value={eventDesc} onChange={e => setEventDesc(e.target.value)} className="text-sm bg-[#F8FAFD] border-[#EEF2F8]" />
          <Button onClick={handleAddEvent} disabled={!eventTitle.trim() || addEvent.isPending} className="bg-[#0891b2] text-white text-xs">
            {addEvent.isPending ? "Adding…" : "Add Event + Notify Investors"}
          </Button>
        </div>
      )}

      {/* Pause/Resume/Force Deliver */}
      {activePanel === "status" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {!isDelivered && (
            <>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: "8px" }}>
                  {isPaused ? "Resume Shipment" : "Pause Shipment"}
                </div>
                {!isPaused && (
                  <Input placeholder="Reason for pause" value={pauseNote} onChange={e => setPauseNote(e.target.value)} className="text-sm bg-[#F8FAFD] border-[#EEF2F8] mb-2" />
                )}
                <Button
                  onClick={isPaused ? handleResume : handlePause}
                  disabled={isPaused ? resume.isPending : pause.isPending}
                  className={isPaused ? "bg-[#059669] text-white text-xs w-full" : "bg-[#d97706] text-white text-xs w-full"}
                >
                  {isPaused ? (resume.isPending ? "Resuming…" : <><Play size={13} className="mr-1" />Resume Shipment</>) : (pause.isPending ? "Pausing…" : <><Pause size={13} className="mr-1" />Pause Shipment</>)}
                </Button>
              </div>

              <div style={{ borderTop: "1px solid #fee2e2", paddingTop: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: "8px" }}>
                  Force Deliver (Admin Only)
                </div>
                <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "10px", lineHeight: 1.5 }}>
                  Immediately marks as delivered, credits profits to all {detail.investorCount} investor(s), and runs guild commissions. This cannot be undone.
                </p>
                <Button onClick={() => setShowConfirmDeliver(true)} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs w-full">
                  <Zap size={13} className="mr-1" /> Force Deliver Now
                </Button>
              </div>
            </>
          )}
          {isDelivered && (
            <div style={{ textAlign: "center", padding: "24px", color: "#059669" }}>
              <CheckCircle2 size={40} style={{ margin: "0 auto 8px" }} />
              <p style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "14px" }}>Shipment Delivered</p>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>No further actions available.</p>
            </div>
          )}
        </div>
      )}

      {/* Event log */}
      {detail.events.length > 0 && (
        <div style={{ borderTop: "1px solid #e8edf2", paddingTop: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: "8px" }}>
            Event Log ({detail.events.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
            {detail.events.map(ev => (
              <div key={ev.id} style={{ display: "flex", gap: "10px", padding: "8px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e8edf2" }}>
                <div style={{ marginTop: "2px", flexShrink: 0 }}>
                  <Clock size={12} color="#94a3b8" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a" }}>{ev.title}</div>
                  {ev.description && <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{ev.description}</div>}
                  <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", marginTop: "3px" }}>
                    {format(parseISO(ev.createdAt), "MMM dd HH:mm")} · {ev.eventType.replace("_", " ").toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Force deliver confirm dialog */}
      <Dialog open={showConfirmDeliver} onOpenChange={setShowConfirmDeliver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#dc2626]">Confirm Force Deliver</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#64748b]">
            This will immediately deliver <strong>{title}</strong> and credit profits to <strong>{detail.investorCount} investor(s)</strong>. This action cannot be undone.
          </p>
          <Input placeholder="Optional note" value={deliverNote} onChange={e => setDeliverNote(e.target.value)} className="bg-[#F8FAFD] border-[#EEF2F8]" />
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowConfirmDeliver(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleForceDeliver} disabled={forceDeliver.isPending} className="flex-1 bg-[#dc2626] text-white">
              {forceDeliver.isPending ? "Processing…" : "Confirm Deliver"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShipmentCard({ s, isExpanded, onToggle }: { s: any; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div style={{ background: "white", border: "1px solid #EEF2F8", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <button onClick={onToggle} style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Ship size={16} color="#64748b" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <StatusBadge status={s.status} stageOverride={s.stageOverride} pausedAt={s.pausedAt} />
            <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              {s.fundingRaised}/{s.fundingGoal} USDT
            </span>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
      </button>
      {isExpanded && (
        <div style={{ borderTop: "1px solid #EEF2F8", padding: "16px" }}>
          <ShipmentOverridePanel shipmentId={s.id} title={s.title} onClose={onToggle} />
        </div>
      )}
    </div>
  );
}

export function AdminShipmentOverrides() {
  const { data: shipments, isLoading } = useAdminListShipments();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_transit" | "delivered">("all");
  const [search, setSearch] = useState("");

  const filtered = (shipments ?? []).filter(s => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.vesselName?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="mt-6 space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search shipments…"
          style={{ flex: 1, padding: "8px 12px", borderRadius: "10px", border: "1px solid #EEF2F8", background: "#F8FAFD", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", color: "#0f172a", outline: "none" }}
        />
        <div style={{ display: "flex", gap: "4px" }}>
          {(["all", "open", "in_transit", "delivered"] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: "6px 12px", borderRadius: "8px", border: "1px solid",
              borderColor: statusFilter === f ? "#2563eb" : "#EEF2F8",
              background: statusFilter === f ? "#2563eb" : "white",
              color: statusFilter === f ? "white" : "#64748b",
              fontSize: "10px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", cursor: "pointer",
            }}>
              {f === "in_transit" ? "Transit" : f}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="shimmer" style={{ height: 72, borderRadius: 16 }} />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px", background: "white", borderRadius: "16px", border: "1px solid #EEF2F8" }}>
          <Ship size={32} color="#e2e8f0" style={{ margin: "0 auto 12px" }} />
          <p style={{ margin: 0, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>No shipments found</p>
        </div>
      )}

      {!isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((s: any) => (
            <ShipmentCard
              key={s.id}
              s={s}
              isExpanded={expandedId === s.id}
              onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
