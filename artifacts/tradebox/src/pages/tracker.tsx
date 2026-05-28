import { useState, useEffect, useRef } from "react";
import { useGetTrackerShipments, useGetPortActivity } from "@workspace/api-client-react";
import { Ship, Anchor, Activity, Clock, Radio, MapPin, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTrackerPositions } from "@/hooks/use-socket";

function CountUp({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return <>{count}{suffix}</>;
}

const cargoColor: Record<string, string> = {
  electronics: "#3B82F6",
  cocoa: "#92400E",
  coffee: "#78350F",
  lithium: "#10B981",
  textiles: "#8B5CF6",
  pharmaceuticals: "#EC4899",
  pharma: "#EC4899",
  agricultural: "#22C55E",
  minerals: "#F59E0B",
  steel: "#64748B",
};

export default function Tracker() {
  const { data: shipments, isLoading: isShipmentsLoading } = useGetTrackerShipments();
  const { data: activities, isLoading: isActivitiesLoading } = useGetPortActivity();
  const livePositions = useTrackerPositions();
  const activityRef = useRef<HTMLDivElement>(null);

  const mergedShipments = shipments?.map(s => {
    const live = livePositions.find(p => p.id === s.id);
    return live ? { ...s, progressPercent: live.progressPercent ?? s.progressPercent } : s;
  }) ?? [];

  const displayShipments = mergedShipments.length > 0 ? mergedShipments : (shipments ?? []);
  const shipsAtSea = displayShipments.filter(s => (s.progressPercent ?? 0) > 0 && (s.progressPercent ?? 0) < 100).length;
  const uniquePorts = new Set(activities?.map(a => a.portName)).size;
  const activeRoutes = displayShipments.length;
  const avgTransit = displayShipments.length
    ? Math.round(displayShipments.reduce((a, s) => a + (s.etaDays ?? 0), 0) / displayShipments.length)
    : 0;

  useEffect(() => {
    if (activityRef.current) {
      activityRef.current.scrollTop = activityRef.current.scrollHeight;
    }
  }, [activities]);

  return (
    <div className="min-h-screen bg-[#050D1B]">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
            Fleet Tracker
          </h1>
          <p className="text-[#475569] text-xs font-mono uppercase tracking-widest">Live maritime control center</p>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-8 space-y-5">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Ships at Sea", value: shipsAtSea, color: "#06B6D4", icon: Ship },
            { label: "Ports Connected", value: uniquePorts, color: "#8B5CF6", icon: MapPin },
            { label: "Active Routes", value: activeRoutes, color: "#3B82F6", icon: Radio },
            { label: "Avg Transit", value: avgTransit, suffix: "d", color: "#10B981", icon: Clock },
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl p-4 card-hover"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">{stat.label}</span>
                <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: stat.color }}>
                <CountUp end={stat.value} suffix={stat.suffix} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Left: Radar + Route Cards */}
          <div className="lg:col-span-3 space-y-5">

            {/* Radar */}
            <div className="rounded-2xl overflow-hidden relative"
              style={{
                background: "#030810",
                border: "1px solid rgba(6,182,212,0.15)",
                height: "300px"
              }}>
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Grid lines */}
                <div className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage: "radial-gradient(circle, rgba(6,182,212,1) 1px, transparent 1px)",
                    backgroundSize: "40px 40px"
                  }} />

                {/* Radar rings */}
                {[280, 200, 130, 70].map((size, i) => (
                  <div key={i} className="absolute rounded-full"
                    style={{
                      width: size, height: size,
                      border: `1px solid rgba(6,182,212,${0.08 + i * 0.04})`,
                    }} />
                ))}

                {/* Center dot */}
                <div className="w-2 h-2 rounded-full absolute z-10"
                  style={{ background: "#06B6D4", boxShadow: "0 0 12px #06B6D4" }} />

                {/* Sweep */}
                <div className="absolute w-[140px] h-[280px] origin-right"
                  style={{
                    left: "50%",
                    marginLeft: "-140px",
                    background: "conic-gradient(from 0deg, transparent 0deg, rgba(6,182,212,0.25) 80deg, transparent 80deg)",
                    animation: "radarSweep 5s linear infinite",
                    clipPath: "polygon(100% 50%, 100% 0, 0 0, 0 100%, 100% 100%)"
                  }} />

                {/* Ships */}
                {displayShipments.map((s, i) => {
                  const angle = (i / Math.max(displayShipments.length, 1)) * 360;
                  const radius = ((s.progressPercent ?? 0) / 100) * 120;
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;
                  const color = cargoColor[s.cargoType] || "#3B82F6";
                  return (
                    <div key={s.id} className="absolute z-20 group cursor-pointer"
                      style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}>
                      <div className="w-2.5 h-2.5 rounded-full"
                        style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                      <div className="absolute w-2.5 h-2.5 rounded-full animate-ping opacity-40 inset-0"
                        style={{ background: color }} />
                      <div className="hidden group-hover:flex absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg z-30"
                        style={{ background: "#0F1E35", border: "1px solid rgba(255,255,255,0.1)", color: "#E2E8F0" }}>
                        <Ship className="h-2.5 w-2.5" style={{ color }} />
                        {s.vesselName} · {Math.round(s.progressPercent ?? 0)}%
                      </div>
                    </div>
                  );
                })}
                {displayShipments.length === 0 && (
                  <span className="absolute z-20 text-[#1E3A5F] font-mono text-xs uppercase tracking-widest">No vessels tracked</span>
                )}
              </div>

              {/* Header overlay */}
              <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[#06B6D4]" />
                  <span className="text-xs font-mono text-[#06B6D4] uppercase tracking-widest">Fleet Radar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#10B981]">{activeRoutes} Tracking</span>
                </div>
              </div>
            </div>

            {/* Route cards */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#94A3B8]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Active Routes
              </h3>
              {isShipmentsLoading ? (
                [...Array(3)].map((_, i) => <div key={i} className="h-24 shimmer rounded-2xl" />)
              ) : displayShipments.length === 0 ? (
                <div className="rounded-2xl p-8 text-center"
                  style={{ background: "rgba(10,22,40,0.5)", border: "1px dashed rgba(255,255,255,0.06)" }}>
                  <Ship className="h-8 w-8 text-[#1E3A5F] mx-auto mb-2" />
                  <p className="text-[#334155] font-mono text-sm">No active routes to display.</p>
                </div>
              ) : (
                displayShipments.map(s => {
                  const pct = s.progressPercent ?? 0;
                  const isLive = livePositions.some(p => p.id === s.id);
                  const statusText = pct < 10 ? "DEPARTED" : pct < 80 ? "OPEN SEA" : pct < 95 ? "APPROACH" : "ARRIVED";
                  const statusColor = pct < 10 ? "#3B82F6" : pct < 80 ? "#F59E0B" : pct < 95 ? "#8B5CF6" : "#10B981";
                  const color = cargoColor[s.cargoType] || "#3B82F6";

                  return (
                    <div key={s.id} className="rounded-2xl p-4 card-hover"
                      style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{ background: `${color}15` }}>
                            <Ship className="h-3.5 w-3.5" style={{ color }} />
                          </div>
                          <span className="font-semibold text-[#E2E8F0] text-sm">{s.vesselName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full uppercase"
                            style={{ background: `${color}15`, color }}>
                            {s.cargoType}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLive && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full uppercase"
                              style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                              Live
                            </span>
                          )}
                          <span className="text-[10px] font-mono font-bold" style={{ color: statusColor }}>
                            {statusText}
                          </span>
                        </div>
                      </div>

                      {/* Route progress */}
                      <div className="flex items-center gap-3 mb-2">
                        <Anchor className="h-3.5 w-3.5 text-[#334155] shrink-0" />
                        <div className="flex-1 relative h-4 flex items-center">
                          <div className="w-full h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
                          <div className="absolute left-0 h-0.5 rounded-full transition-all duration-1000"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${color}, ${color}88)`,
                              boxShadow: `0 0 6px ${color}80`
                            }} />
                          <div className="absolute -translate-y-1/2 top-1/2 transition-all duration-1000"
                            style={{ left: `${Math.min(pct, 95)}%` }}>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center -translate-x-1/2"
                              style={{ background: color, boxShadow: `0 0 10px ${color}` }}>
                              <Ship className="h-2.5 w-2.5 text-white" />
                            </div>
                          </div>
                        </div>
                        <Anchor className="h-3.5 w-3.5 shrink-0" style={{ color: pct === 100 ? "#10B981" : "#334155" }} />
                      </div>

                      <div className="flex justify-between text-[10px] font-mono text-[#334155]">
                        <span>{s.origin.split(",")[0]}</span>
                        <span className="font-bold" style={{ color: statusColor }}>{Math.round(pct)}% complete</span>
                        <span>{s.destination.split(",")[0]}</span>
                      </div>

                      <div className="flex justify-between text-[10px] font-mono text-[#334155] mt-2 pt-2"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <span>Invested: <span className="text-[#94A3B8]">{(s.myAmount ?? 0).toLocaleString()} USDT</span></span>
                        <span>ETA: <span className="text-[#94A3B8]">{s.etaDays} days</span></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: World Map + Port Activity */}
          <div className="lg:col-span-2 space-y-5">
            {/* Route map */}
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-3.5 w-3.5 text-[#3B82F6]" />
                <span className="text-xs font-mono text-[#475569] uppercase tracking-widest">Route Map</span>
              </div>
              <div className="relative w-full rounded-xl overflow-hidden"
                style={{ background: "#020912", border: "1px solid rgba(255,255,255,0.04)", aspectRatio: "2/1" }}>
                <svg viewBox="0 0 1000 500" className="w-full h-full opacity-90">
                  {/* Simplified continents */}
                  <path d="M 100 80 Q 180 40 260 80 T 340 150 Q 300 220 220 190 T 100 80" fill="#0F1E35" stroke="#1E3A5F" strokeWidth="1" />
                  <path d="M 380 60 Q 480 30 560 60 T 680 140 Q 700 200 640 220 Q 580 240 500 200 T 380 60" fill="#0F1E35" stroke="#1E3A5F" strokeWidth="1" />
                  <path d="M 720 80 Q 800 50 880 90 T 960 160 Q 940 220 870 240 Q 800 250 750 210 T 720 80" fill="#0F1E35" stroke="#1E3A5F" strokeWidth="1" />
                  <path d="M 420 280 Q 500 260 560 300 T 600 380 Q 570 440 500 430 T 420 380 T 420 280" fill="#0F1E35" stroke="#1E3A5F" strokeWidth="1" />
                  <path d="M 600 260 Q 660 250 700 280 T 720 340 Q 700 390 660 380 T 620 340 T 600 260" fill="#0F1E35" stroke="#1E3A5F" strokeWidth="1" />
                  <path d="M 200 240 Q 240 230 270 260 T 260 320 Q 240 360 210 350 T 180 310 T 200 240" fill="#0F1E35" stroke="#1E3A5F" strokeWidth="1" />

                  {displayShipments.map((s, i) => {
                    if (!s.originCoords || !s.destinationCoords) return null;
                    const [olat, olng] = s.originCoords.split(",").map(Number);
                    const [dlat, dlng] = s.destinationCoords.split(",").map(Number);
                    if (isNaN(olat) || isNaN(dlat)) return null;
                    const ox = ((olng + 180) / 360) * 1000;
                    const oy = ((90 - olat) / 180) * 500;
                    const dx = ((dlng + 180) / 360) * 1000;
                    const dy = ((90 - dlat) / 180) * 500;
                    const cx = (ox + dx) / 2;
                    const cy = Math.min(oy, dy) - 80;
                    const color = cargoColor[s.cargoType] || "#3B82F6";
                    const pathId = `path-${s.id}`;

                    return (
                      <g key={s.id}>
                        <path id={pathId} d={`M ${ox} ${oy} Q ${cx} ${cy} ${dx} ${dy}`}
                          fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="6,4" opacity="0.5" />
                        <circle cx={ox} cy={oy} r="5" fill={color} opacity="0.8" />
                        <circle cx={ox} cy={oy} r="9" fill={color} opacity="0.2">
                          <animate attributeName="r" values="5;12;5" dur="3s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.2;0;0.2" dur="3s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={dx} cy={dy} r="5" fill="#10B981" opacity="0.8" />
                        <circle r="4" fill={color}>
                          <animateMotion path={`M ${ox} ${oy} Q ${cx} ${cy} ${dx} ${dy}`}
                            dur={`${Math.max(8, s.etaDays || 10)}s`} repeatCount="indefinite" />
                        </circle>
                      </g>
                    );
                  })}
                </svg>
                {displayShipments.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[#1E3A5F] font-mono text-xs uppercase tracking-widest">No active routes</span>
                  </div>
                )}
              </div>
            </div>

            {/* Port Activity */}
            <div className="rounded-2xl overflow-hidden flex flex-col"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)", maxHeight: "400px" }}>
              <div className="p-4 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span className="text-xs font-mono text-[#475569] uppercase tracking-widest">Port Activity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#F59E0B]">Live feed</span>
                </div>
              </div>
              <div ref={activityRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {isActivitiesLoading ? (
                  [...Array(5)].map((_, i) => <div key={i} className="h-14 shimmer rounded-xl" />)
                ) : activities?.length ? (
                  activities.map(act => {
                    const isArrival = act.eventType === "arrival";
                    return (
                      <div key={act.id} className="flex gap-3 p-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: isArrival ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)",
                          }}>
                          <Anchor className="h-3.5 w-3.5" style={{ color: isArrival ? "#10B981" : "#3B82F6" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#94A3B8]">
                            <span className="font-semibold text-[#CBD5E1]">{act.vesselName}</span>
                            {" "}<span className="font-mono" style={{ color: isArrival ? "#10B981" : "#3B82F6" }}>
                              {isArrival ? "arrived at" : "departed from"}
                            </span>{" "}
                            <span className="font-semibold text-[#CBD5E1]">{act.portName}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-2.5 w-2.5 text-[#334155]" />
                            <span className="text-[10px] font-mono text-[#334155]">
                              {format(parseISO(act.timestamp), "HH:mm · MMM dd")}
                            </span>
                            {act.cargoType && (
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
                                style={{
                                  background: `${cargoColor[act.cargoType] || "#334155"}18`,
                                  color: cargoColor[act.cargoType] || "#475569"
                                }}>
                                {act.cargoType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-[#334155] font-mono text-xs">No port activity recorded.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
