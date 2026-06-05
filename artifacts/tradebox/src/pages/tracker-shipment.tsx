import { useParams, useLocation } from "wouter";
import { useGetTrackerShipments, useGetShipment } from "@workspace/api-client-react";
import {
  ArrowLeft, Ship, MapPin, Calendar, Package, Clock, ArrowRight,
  CheckCircle2, AlertTriangle, Download, MessageSquare, Hash,
  Navigation, Anchor, RefreshCw, TrendingUp, ChevronRight, Globe
} from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { useTrackerPositions, useShipmentStageChanged } from "@/hooks/use-socket";
import { computeShipmentState, TIMELINE } from "@/lib/shipment-state";

// ─── constants ──────────────────────────────────────────────────────────────

const cargoColors: Record<string, string> = {
  electronics: "#2563eb", cocoa: "#92400e", coffee: "#78350f",
  lithium: "#059669", textiles: "#7c3aed", pharmaceuticals: "#db2677",
  pharma: "#db2677", agricultural: "#16a34a", minerals: "#d97706", steel: "#475569",
};

const cargoEmoji: Record<string, string> = {
  electronics: "⚡", agricultural: "🌿", cocoa: "🍫", coffee: "☕",
  minerals: "⛏️", textiles: "🧵", lithium: "🔋", pharmaceuticals: "💊",
  pharma: "💊", steel: "⚙️",
};

// ─── Deterministic container number ──────────────────────────────────────────

function containerNum(shipmentId: number, invId: number) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const prefix = alpha[(shipmentId * 3 + 7) % 26] + alpha[(invId * 5 + 11) % 26] + alpha[(shipmentId + invId) % 26] + "U";
  const nums = String((shipmentId * invId * 17 + 100000) % 1000000).padStart(6, "0");
  return `${prefix}-${nums}`;
}

// ─── Activity feed (date-anchored) ───────────────────────────────────────────

function buildActivity(
  depDate: Date | null,
  arrDate: Date | null,
  stageIdx: number,
  origin: string,
  destination: string
) {
  const originCity = origin.split(",")[0];
  const destCity = destination.split(",")[0];
  const events: Array<{ time: string; title: string; desc: string; color: string }> = [];

  const fmt = (d: Date) => format(d, "MMM dd, HH:mm");

  if (stageIdx >= 0 && depDate) {
    const bookingDate = new Date(depDate.getTime() - 4 * 86400000);
    events.push({ time: fmt(bookingDate), title: "Booking confirmed", desc: "Shipment booked and confirmed", color: "#2563eb" });
  }

  if (stageIdx >= 1 && depDate) {
    const loadDate = new Date(depDate.getTime() - 2 * 86400000);
    events.push({ time: fmt(loadDate), title: "Container loaded", desc: `Cargo loaded at ${originCity} terminal`, color: "#2563eb" });
  }

  if (stageIdx >= 2 && depDate) {
    events.push({ time: fmt(depDate), title: "Vessel departed", desc: `Left ${originCity} port`, color: "#d97706" });
  }

  if (stageIdx >= 3 && depDate) {
    const seaDate = new Date(depDate.getTime() + 2 * 86400000);
    events.push({ time: fmt(seaDate), title: "Open sea navigation", desc: "Vessel transiting international waters", color: "#0891b2" });
  }

  if (stageIdx >= 4 && arrDate) {
    const customsDate = new Date(arrDate.getTime() - 2 * 86400000);
    events.push({ time: fmt(customsDate), title: "Customs pre-clearance filed", desc: `Paperwork submitted to ${destCity} authorities`, color: "#7c3aed" });
    const inspDate = new Date(arrDate.getTime() - 1 * 86400000);
    events.push({ time: fmt(inspDate), title: "Customs inspection", desc: `Inspection underway at ${destCity} port`, color: "#7c3aed" });
  }

  if (stageIdx >= 5 && arrDate) {
    events.push({ time: fmt(arrDate), title: "Arrived at destination", desc: `Vessel berthed at ${destCity} port`, color: "#059669" });
  }

  if (stageIdx >= 6 && arrDate) {
    const delivDate = new Date(arrDate.getTime() + 86400000);
    events.push({ time: fmt(delivDate), title: "Delivery confirmed", desc: `Cargo transferred to consignee`, color: "#059669" });
  }

  return events.reverse();
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

async function downloadPdf(data: {
  vesselName: string;
  containerNum: string;
  cargoType: string;
  origin: string;
  destination: string;
  pct: number;
  etaDays: number | null;
  myAmount: number;
  invId: number;
  shipmentId: number;
  stageLabel: string;
  profitPercent: string | null;
  departureDate: Date | null;
  arrivalDate: Date | null;
  actFeed: Array<{ time: string; title: string; desc: string }>;
}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 14;
  let y = 0;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("TradeBox", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("GLOBAL TRADE FINANCE PORTAL", margin, 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("SHIPMENT REPORT", W - margin, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`INV-${String(data.invId).padStart(5, "0")}`, W - margin, 20, { align: "right" });

  y = 40;

  const sectionHeader = (label: string) => {
    doc.setFillColor(239, 246, 255);
    doc.rect(margin, y, W - margin * 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text(label.toUpperCase(), margin + 3, y + 5);
    y += 11;
  };

  const row2 = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin + 2, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(value || "—", margin + 55, y);
    y += 6;
  };

  sectionHeader("Shipment Details");
  row2("Shipment ID", `INV-${String(data.invId).padStart(5, "0")}`);
  row2("Container Number", data.containerNum);
  row2("Vessel", data.vesselName);
  row2("Cargo Type", data.cargoType.charAt(0).toUpperCase() + data.cargoType.slice(1));
  row2("Origin Port", data.origin);
  row2("Destination Port", data.destination);
  row2("Current Status", data.stageLabel);

  y += 2;

  sectionHeader("Voyage Dates");
  row2("Departure Date", data.departureDate ? format(data.departureDate, "MMM dd, yyyy") : "—");
  row2("ETA (Arrival)", data.arrivalDate ? format(data.arrivalDate, "MMM dd, yyyy") : data.etaDays != null ? `${data.etaDays} days` : "—");
  row2("Journey Progress", `${Math.round(data.pct)}%`);
  y += 2;

  sectionHeader("Investment Summary");
  row2("Investment Amount", `${data.myAmount.toLocaleString()} USDT`);
  row2("Expected Return", data.profitPercent ? `+${data.profitPercent}% APY` : "—");
  if (data.profitPercent) {
    const profit = data.myAmount * (parseFloat(data.profitPercent) / 100);
    row2("Estimated Profit", `${profit.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`);
    row2("Total Return", `${(data.myAmount + profit).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`);
  }
  y += 2;

  sectionHeader("Journey Timeline");
  const stageIdx = TIMELINE.findIndex(s => s.label === data.stageLabel);
  TIMELINE.forEach((stage, i) => {
    const done = i < stageIdx;
    const current = i === stageIdx;
    const dotX = margin + 4;
    const dotY = y - 1;
    if (done) {
      doc.setFillColor(37, 99, 235);
      doc.circle(dotX, dotY, 2, "F");
      doc.setTextColor(37, 99, 235);
    } else if (current) {
      doc.setDrawColor(37, 99, 235);
      doc.setFillColor(255, 255, 255);
      doc.circle(dotX, dotY, 2, "FD");
      doc.setTextColor(15, 23, 42);
    } else {
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(241, 245, 249);
      doc.circle(dotX, dotY, 2, "FD");
      doc.setTextColor(148, 163, 184);
    }
    doc.setFont("helvetica", current || done ? "bold" : "normal");
    doc.setFontSize(8);
    doc.text(stage.label + (current ? " ← Current" : ""), margin + 10, y);
    y += 6;
  });
  y += 2;

  if (data.actFeed.length > 0) {
    sectionHeader("Recent Activity");
    data.actFeed.slice(0, 5).forEach(evt => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const titleLines = doc.splitTextToSize(evt.title, W - margin * 2 - 20);
      doc.text(titleLines, margin + 3, y);
      y += titleLines.length * 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(evt.time, margin + 3, y);
      y += 5;
    });
  }

  const footerY = 287;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, W - margin, footerY - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("TradeBox Global Trade Finance Portal  ·  support@tradebox.io", margin, footerY);
  doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, W - margin, footerY, { align: "right" });

  doc.save(`shipment-INV-${String(data.invId).padStart(5, "0")}.pdf`);
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function S({ h = 60, radius = 12 }: { h?: number; radius?: number }) {
  return <div className="shimmer" style={{ height: h, borderRadius: radius }} />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TrackerShipmentDetail() {
  const params = useParams<{ id: string }>();
  const invId = parseInt(params.id || "0", 10);
  const [, navigate] = useLocation();

  const { data: trackerShipments, isLoading: listLoading, refetch: refetchTracker } = useGetTrackerShipments();
  const livePositions = useTrackerPositions();
  useShipmentStageChanged(() => refetchTracker());

  const inv = trackerShipments?.find(s => s.id === invId);

  // Match live socket by SHIPMENT ID (socket emits shipment IDs, not investment IDs)
  const live = livePositions.find(p => p.id === (inv?.shipmentId ?? -1));

  const shipmentId = inv?.shipmentId;
  const { data: mktShipment, isLoading: mktLoading } = useGetShipment(
    shipmentId ?? 0,
    { query: { enabled: !!shipmentId } } as any
  );

  const isLoading = listLoading || (!!shipmentId && mktLoading);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
        <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "14px 16px", position: "sticky", top: 0, zIndex: 10 }}>
          <S h={32} radius={8} />
        </div>
        <div style={{ padding: "16px", maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          <S h={100} /><S h={160} /><S h={200} /><S h={140} />
        </div>
      </div>
    );
  }

  if (!inv) {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
        <Ship size={40} color="#cbd5e1" />
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}>Shipment not found</h2>
        <button onClick={() => navigate("/tracker")} style={{ padding: "8px 16px", borderRadius: "10px", background: "#2563eb", border: "none", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          Back to Tracker
        </button>
      </div>
    );
  }

  const color = cargoColors[inv.cargoType] || "#2563eb";
  const emoji = cargoEmoji[inv.cargoType] || "📦";

  // Parse dates — prefer mktShipment (full data), fall back to API fields
  const depDate = mktShipment?.departureDate
    ? (typeof mktShipment.departureDate === "string"
      ? parseISO(mktShipment.departureDate)
      : new Date(mktShipment.departureDate))
    : (inv as any).departureDate
      ? parseISO((inv as any).departureDate)
      : null;

  const arrDate = mktShipment?.arrivalDate
    ? (typeof mktShipment.arrivalDate === "string"
      ? parseISO(mktShipment.arrivalDate)
      : new Date(mktShipment.arrivalDate))
    : (inv as any).arrivalDate
      ? parseISO((inv as any).arrivalDate)
      : null;

  // ── SINGLE SOURCE OF TRUTH: state engine ─────────────────────────────────
  // DB status drives ALL display logic — no independent calculations elsewhere
  const dbStatus: string = (mktShipment as any)?.status ?? (inv as any)?.dbStatus ?? "open";
  const stageOverride = (inv as any)?.stageOverride ?? null;
  const pausedAt = (inv as any)?.pausedAt ? new Date((inv as any).pausedAt) : null;
  const state = computeShipmentState(dbStatus, depDate, arrDate, inv.origin, inv.destination, stageOverride, pausedAt);

  const pct = state.progress;
  const stageIdx = state.stageIdx;
  const overdue = arrDate != null && new Date() > arrDate && dbStatus !== "delivered";

  const now = new Date();
  const etaDate = arrDate ?? (inv.etaDays != null ? addDays(now, inv.etaDays) : null);
  const contNum = containerNum(inv.shipmentId, inv.id);
  const actFeed = buildActivity(depDate, arrDate, stageIdx, inv.origin, inv.destination);

  const reportData = {
    vesselName: inv.vesselName, containerNum: contNum, cargoType: inv.cargoType,
    origin: inv.origin, destination: inv.destination, pct,
    etaDays: inv.etaDays, myAmount: inv.myAmount ?? 0, invId,
    shipmentId: inv.shipmentId, stageLabel: state.stageLabel,
    profitPercent: mktShipment?.profitPercent ? String(mktShipment.profitPercent) : null,
    departureDate: depDate, arrivalDate: arrDate, actFeed,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>

      {/* Sticky sub-header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "12px 16px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "760px", margin: "0 auto" }}>
          <button onClick={() => navigate("/tracker")} style={{ width: "32px", height: "32px", borderRadius: "9px", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <ArrowLeft size={15} color="#64748b" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {inv.vesselName}
            </h1>
            <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              INV-{String(invId).padStart(5, "0")} · {inv.origin.split(",")[0]} → {inv.destination.split(",")[0]}
            </p>
          </div>
          {overdue && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", background: "#fef2f2", border: "1px solid #fecaca", fontSize: "10px", fontWeight: 700, color: "#dc2626", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
              <AlertTriangle size={10} /> OVERDUE
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "760px", margin: "0 auto" }}>

        {/* ── Hero card ──────────────────────────────────── */}
        <div style={{ background: "#ffffff", border: `1px solid ${overdue ? "#fecaca" : "#e8edf2"}`, borderRadius: "18px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: "12px" }}>
          <div style={{ height: "4px", background: overdue ? "linear-gradient(90deg, #dc2626, #f87171)" : `linear-gradient(90deg, ${color}, ${color}99)` }} />
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>
                {emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                  <span style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.04em", color: overdue ? "#dc2626" : color, background: overdue ? "#fef2f2" : `${color}12`, border: `1px solid ${overdue ? "#fecaca" : `${color}30`}` }}>
                    {overdue ? "⚠ Overdue" : state.stageLabel}
                  </span>
                  {state.isPaused && (
                    <span style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a" }}>⏸ PAUSED</span>
                  )}
                  {live && (
                    <span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, color: "#059669", background: "#ecfdf5", fontFamily: "'JetBrains Mono', monospace" }}>● LIVE</span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em" }}>
                  {inv.vesselName}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "capitalize" }}>
                  {inv.cargoType} · {Math.round(pct)}% complete
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", alignItems: "center" }}>
                <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", maxWidth: "38%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.origin.split(",")[0]}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: color, fontFamily: "'JetBrains Mono', monospace", background: `${color}12`, padding: "2px 8px", borderRadius: "20px" }}>{Math.round(pct)}% complete</span>
                <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", maxWidth: "38%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{inv.destination.split(",")[0]}</span>
              </div>
              <div style={{ height: "8px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: "999px", background: overdue ? "#dc2626" : color, transition: "width 1.2s ease" }} />
              </div>
              <div style={{ position: "relative", height: "20px", marginTop: "4px" }}>
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "#f1f5f9", transform: "translateY(-50%)" }} />
                <div style={{ position: "absolute", top: "50%", left: 0, width: `${pct}%`, height: "1px", background: color, transform: "translateY(-50%)", maxWidth: "100%" }} />
                <div style={{ position: "absolute", top: "50%", left: `${Math.min(Math.max(pct, 2), 96)}%`, transform: "translate(-50%, -50%)", width: "22px", height: "22px", borderRadius: "50%", background: "#fff", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 4px ${color}18` }}>
                  <Ship size={10} color={color} />
                </div>
              </div>
            </div>

            {/* ETA + Investment row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e8edf2" }}>
                <p style={{ margin: "0 0 2px", fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>ETA</p>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: overdue ? "#dc2626" : "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {dbStatus === "delivered"
                    ? "Delivered"
                    : overdue
                      ? "Overdue"
                      : !state.inTransit && !state.showTransitDays
                        ? (etaDate ? format(etaDate, "MMM dd") : "—")
                        : inv.etaDays === 1 ? "Tomorrow" : inv.etaDays != null ? `${inv.etaDays} days` : "—"}
                </p>
                {etaDate && dbStatus !== "delivered" && !overdue && (
                  <p style={{ margin: "1px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                    {format(etaDate, "MMM dd, yyyy")}
                  </p>
                )}
              </div>
              <div style={{ padding: "10px 12px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e8edf2" }}>
                <p style={{ margin: "0 0 2px", fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Investment</p>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {(inv.myAmount ?? 0).toLocaleString()} USDT
                </p>
                {mktShipment?.profitPercent && (
                  <p style={{ margin: "1px 0 0", fontSize: "10px", color: "#059669", fontFamily: "'JetBrains Mono', monospace" }}>+{mktShipment.profitPercent}% return</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Route visualization ──────────────────────────── */}
        <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Globe size={13} color="#2563eb" />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Voyage Route</span>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Origin */}
              <div style={{ textAlign: "center", minWidth: "70px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb", margin: "0 auto 5px", boxShadow: "0 0 0 4px rgba(37,99,235,0.15)" }} />
                <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.origin.split(",")[0]}</p>
                {depDate && <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{format(depDate, "MMM dd")}</p>}
              </div>

              {/* Track */}
              <div style={{ flex: 1, position: "relative" }}>
                <div style={{ height: "3px", background: "#e2e8f0", borderRadius: "2px", position: "relative", overflow: "visible" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, #2563eb, ${color})`, borderRadius: "2px", maxWidth: "100%" }} />
                  <div style={{
                    position: "absolute", top: "50%",
                    left: `${Math.min(Math.max(pct, 2), 96)}%`,
                    transform: "translate(-50%, -50%)",
                    width: "20px", height: "20px", borderRadius: "50%",
                    background: "#fff", border: `2px solid ${color}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 0 3px ${color}18`,
                  }}>
                    <Ship size={9} color={color} />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginTop: "14px" }}>
                  <span style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                    {state.showRouteProgress
                      ? `${mktShipment?.transitDays ? `${mktShipment.transitDays}d transit · ` : ""}${Math.round(pct)}% complete`
                      : "Awaiting Departure"}
                  </span>
                </div>
              </div>

              {/* Destination */}
              <div style={{ textAlign: "center", minWidth: "70px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: `2px solid ${pct >= 90 ? "#059669" : "#e2e8f0"}`, background: pct >= 90 ? "#059669" : "#fff", margin: "0 auto 5px", boxShadow: pct >= 90 ? "0 0 0 4px rgba(5,150,105,0.15)" : "none" }} />
                <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.destination.split(",")[0]}</p>
                {arrDate && <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{format(arrDate, "MMM dd")}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Journey Timeline ────────────────────────────── */}
        <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Navigation size={13} color={color} />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Journey Timeline</span>
            <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, background: `${color}15`, color, fontFamily: "'JetBrains Mono', monospace" }}>
              Stage {stageIdx + 1}/{TIMELINE.length}
            </span>
          </div>

          <div style={{ padding: "16px" }}>
            {TIMELINE.map((stage, i) => {
              const done = i < stageIdx;
              const current = i === stageIdx;
              const future = i > stageIdx;
              return (
                <div key={stage.key} style={{ display: "flex", gap: "14px", position: "relative" }}>
                  {i < TIMELINE.length - 1 && (
                    <div style={{
                      position: "absolute", left: "13px", top: "28px",
                      width: "2px", height: "calc(100% - 12px)",
                      background: done ? color : "#e8edf2", borderRadius: "1px",
                      transition: "background 0.3s ease",
                    }} />
                  )}
                  <div style={{ flexShrink: 0, zIndex: 1 }}>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: done ? color : current ? "#ffffff" : "#f1f5f9",
                      border: current ? `2px solid ${color}` : done ? "none" : "2px solid #e2e8f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: current ? `0 0 0 4px ${color}18` : "none",
                      transition: "all 0.3s ease",
                    }}>
                      {done
                        ? <CheckCircle2 size={14} color="white" />
                        : current
                          ? <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
                          : <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#e2e8f0" }} />
                      }
                    </div>
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < TIMELINE.length - 1 ? "20px" : "0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: current || done ? 600 : 400, color: future ? "#94a3b8" : "#0f172a" }}>
                        {stage.label}
                        {current && (
                          <span style={{ marginLeft: "7px", padding: "1px 6px", borderRadius: "8px", fontSize: "9px", fontWeight: 700, background: `${color}15`, color, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
                            Now
                          </span>
                        )}
                      </p>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                      {stage.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Shipment Details Grid ───────────────────────── */}
        <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={13} color="#2563eb" />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Shipment Details</span>
          </div>

          <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { icon: Hash,       label: "Shipment ID",      value: `INV-${String(invId).padStart(5, "0")}` },
              { icon: Package,    label: "Container",        value: contNum },
              { icon: Ship,       label: "Vessel",           value: inv.vesselName },
              { icon: Package,    label: "Cargo Type",       value: inv.cargoType },
              { icon: MapPin,     label: "Origin Port",      value: inv.origin },
              { icon: MapPin,     label: "Destination",      value: inv.destination },
              { icon: Navigation, label: "Current Location", value: state.currentLocation },
              { icon: Calendar,   label: "Departure Date",   value: depDate ? format(depDate, "MMM dd, yyyy") : "—" },
              { icon: Clock,      label: "ETA",              value: arrDate ? format(arrDate, "MMM dd, yyyy") : etaDate ? format(etaDate, "MMM dd, yyyy") : "—" },
              { icon: TrendingUp, label: "Expected Return",  value: mktShipment?.profitPercent ? `+${mktShipment.profitPercent}% APY` : "—" },
            ].map((d, i) => (
              <div key={i} style={{ padding: "10px 12px", borderRadius: "11px", background: "#f8fafc", border: "1px solid #e8edf2" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
                  <d.icon size={10} color="#94a3b8" />
                  <span style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: d.label === "Cargo Type" ? "capitalize" : "none" }}>
                  {d.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Transit days summary (only shown when in transit) ─── */}
        {state.showTransitDays && state.daysInTransit != null && (
          <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "14px", padding: "14px 16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Clock size={16} color={color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Days in Transit</p>
              <p style={{ margin: "2px 0 0", fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>
                {state.daysInTransit}
                <span style={{ fontSize: "12px", fontWeight: 500, color: "#64748b", marginLeft: "4px" }}>
                  {mktShipment?.transitDays ? `/ ${mktShipment.transitDays} days total` : "days"}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* ── Activity Feed ───────────────────────────────── */}
        {actFeed.length > 0 && (
          <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Anchor size={13} color="#d97706" />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Shipment Activity</span>
              <span style={{ marginLeft: "auto", padding: "2px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, background: "#fffbeb", color: "#d97706", fontFamily: "'JetBrains Mono', monospace" }}>
                {actFeed.length} events
              </span>
            </div>
            <div>
              {actFeed.map((evt, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", padding: "12px 16px", borderBottom: i < actFeed.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: evt.color, flexShrink: 0, marginTop: "5px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>{evt.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>{evt.desc}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{evt.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Delay warning ───────────────────────────────── */}
        {overdue && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", padding: "14px 16px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: "1px" }} />
              <div>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#dc2626" }}>Shipment Delayed</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#f87171", lineHeight: 1.5 }}>
                  This shipment has passed its estimated arrival date. Your capital remains secured. Contact your freight forwarder or our support team for an update on port congestion or customs delays.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Action buttons ──────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "8px" }}>
          <button
            onClick={() => downloadPdf(reportData)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              height: "52px", borderRadius: "14px", border: "1px solid #e2e8f0", cursor: "pointer",
              fontSize: "14px", fontWeight: 700, color: "#0f172a", background: "#ffffff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <Download size={16} color="#2563eb" />
            Download Shipment Report (PDF)
          </button>

          <button
            onClick={() => navigate("/help")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              height: "52px", borderRadius: "14px", border: "none", cursor: "pointer",
              fontSize: "14px", fontWeight: 700, color: "white",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
            }}
          >
            <MessageSquare size={16} />
            Contact Support
          </button>
        </div>

      </div>
    </div>
  );
}
