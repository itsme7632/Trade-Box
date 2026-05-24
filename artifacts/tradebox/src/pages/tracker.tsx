import { useState, useEffect, useRef } from "react";
import { useGetTrackerShipments, useGetPortActivity } from "@workspace/api-client-react";
import { Ship, Anchor, Activity, Clock, Wifi, Radio, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { useTrackerPositions } from "@/hooks/use-socket";

function CountUp({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return <>{count}{suffix}</>;
}

export default function Tracker() {
  const { data: shipments, isLoading: isShipmentsLoading } = useGetTrackerShipments();
  const { data: activities, isLoading: isActivitiesLoading } = useGetPortActivity();
  const livePositions = useTrackerPositions();
  const scrollRef = useRef<HTMLDivElement>(null);

  const mergedShipments = shipments?.map((s) => {
    const live = livePositions.find((p) => p.id === s.id);
    if (live) {
      return { ...s, progressPercent: live.progressPercent ?? s.progressPercent };
    }
    return s;
  }) ?? [];

  const displayShipments = mergedShipments.length > 0 ? mergedShipments : (shipments ?? []);
  
  const shipsAtSea = displayShipments.filter(s => (s.progressPercent ?? 0) > 0 && (s.progressPercent ?? 0) < 100).length;
  const uniquePorts = new Set(activities?.map(a => a.portName)).size;
  const activeRoutes = displayShipments.length;
  const avgTransit = displayShipments.length ? Math.round(displayShipments.reduce((acc, s) => acc + (s.etaDays ?? 0), 0) / displayShipments.length) : 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FB] text-[#0F1923] p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto w-full space-y-6">

        {/* SECTION 1 — MARITIME STATS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Ships at Sea", value: shipsAtSea },
            { label: "Ports Connected", value: uniquePorts },
            { label: "Routes Active", value: activeRoutes },
            { label: "Avg Transit", value: avgTransit, suffix: "d" }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-[#EEF2F8] border-l-4 border-l-[#0066FF] shadow-sm">
              <p className="text-[#6A82A0] font-mono text-xs uppercase mb-2">{stat.label}</p>
              <p className="font-bold font-mono text-3xl text-[#0066FF]">
                <CountUp end={stat.value} suffix={stat.suffix} />
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SECTION 2 — LIVE FLEET RADAR */}
          <div className="bg-[#0A1017] rounded-xl border border-[#EEF2F8] overflow-hidden flex flex-col h-[500px] shadow-sm relative">
            <div className="p-4 border-b border-[#1E293B] flex justify-between items-center z-10">
              <h3 className="font-heading font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-white">
                <Radio className="h-4 w-4 text-[#0066FF]" /> Fleet Radar
              </h3>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
                </span>
                <span className="text-xs font-mono text-[#22C55E]">{activeRoutes} Tracking</span>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[400px] h-[400px] rounded-full border border-[#1E293B] absolute opacity-50"></div>
                <div className="w-[266px] h-[266px] rounded-full border border-[#1E293B] absolute opacity-50"></div>
                <div className="w-[133px] h-[133px] rounded-full border border-[#1E293B] absolute opacity-50"></div>
                <div className="w-2 h-2 rounded-full bg-[#0066FF] absolute z-10"></div>
                
                <div 
                  className="w-[200px] h-[400px] absolute origin-right left-1/2 -ml-[200px]"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0, 102, 255, 0.4) 90deg, transparent 90deg)',
                    animation: 'radarSweep 4s linear infinite',
                    clipPath: 'polygon(100% 50%, 100% 0, 0 0, 0 100%, 100% 100%)'
                  }}
                />
                
                {displayShipments.map((s, i) => {
                  const angle = (i / displayShipments.length) * 360;
                  const radius = (s.progressPercent ?? 0) / 100 * 200;
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;
                  
                  return (
                    <div 
                      key={s.id} 
                      className="absolute w-3 h-3 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E] z-20 group cursor-pointer"
                      style={{ 
                        transform: `translate(${x}px, ${y}px)`,
                        animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
                      }}
                    >
                      <div className="hidden group-hover:block absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white text-xs px-2 py-1 rounded whitespace-nowrap z-30">
                        {s.vesselName} ({Math.round(s.progressPercent ?? 0)}%)
                      </div>
                    </div>
                  );
                })}
                {displayShipments.length === 0 && (
                  <div className="absolute text-[#3A4E66] font-mono text-sm z-20">NO VESSELS TRACKED</div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3 — ACTIVE SHIPMENT ROUTES */}
          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2">
            {isShipmentsLoading ? (
               [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full bg-white border border-[#EEF2F8] rounded-xl" />)
            ) : displayShipments.map(s => {
              const typeColor = s.cargoType === 'electronics' ? 'bg-[#0066FF]/10 text-[#0066FF]' :
                                s.cargoType === 'agricultural' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                                s.cargoType === 'minerals' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                                s.cargoType === 'textiles' ? 'bg-purple-500/10 text-purple-500' :
                                s.cargoType === 'pharma' ? 'bg-pink-500/10 text-pink-500' :
                                'bg-[#DDE4EF] text-[#3A4E66]';
              
              const pct = s.progressPercent ?? 0;
              const statusText = pct < 10 ? "DEPARTED" : pct < 80 ? "OPEN SEA" : pct < 95 ? "APPROACH" : "ARRIVED";
              const statusColor = pct < 10 ? "text-[#0066FF]" : pct < 80 ? "text-[#F59E0B]" : pct < 95 ? "text-purple-500" : "text-[#22C55E]";
              const isLive = livePositions.some(p => p.id === s.id);

              return (
                <div key={s.id} className="bg-white rounded-xl border border-[#EEF2F8] p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0F1923]">{s.vesselName}</span>
                      {s.cargoType && <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold tracking-wider ${typeColor}`}>{s.cargoType}</span>}
                    </div>
                    {isLive && <span className="text-[10px] bg-[#22C55E]/10 text-[#22C55E] px-2 py-0.5 rounded font-bold tracking-widest">LIVE</span>}
                  </div>
                  
                  <div className="relative h-10 flex items-center justify-between mb-2">
                    <Anchor className="h-5 w-5 text-[#6A82A0]" />
                    <div className="flex-1 border-t-2 border-dashed border-[#DDE4EF] mx-4 relative">
                      <div className="absolute -top-3 transition-all duration-1000 ease-linear" style={{ left: `${pct}%` }}>
                        <Ship className={`h-6 w-6 p-1 rounded-full text-white ${pct === 100 ? 'bg-[#22C55E]' : 'bg-[#0066FF]'}`} />
                      </div>
                    </div>
                    <Anchor className={`h-5 w-5 ${pct === 100 ? 'text-[#22C55E]' : 'text-[#6A82A0]'}`} />
                  </div>
                  
                  <div className="flex justify-between text-xs font-mono text-[#6A82A0] mb-4">
                    <span>{s.origin}</span>
                    <span className={`font-bold ${statusColor}`}>{statusText} ({Math.round(pct)}%)</span>
                    <span>{s.destination}</span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-mono border-t border-[#EEF2F8] pt-3">
                    <span className="text-[#3A4E66]">My Investment: {(s.myAmount ?? 0).toLocaleString()} USDT</span>
                    <span className="text-[#3A4E66]">ETA: {s.etaDays} days</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* SECTION 4 — SVG WORLD MAP */}
          <div className="bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm p-6 relative">
            <h3 className="font-heading font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-[#0F1923] mb-4">
              <MapIcon className="h-4 w-4 text-[#0066FF]" /> Route Map
            </h3>
            <div className="relative w-full aspect-[2/1]">
              <svg viewBox="0 0 1000 500" className="w-full h-full bg-[#F4F7FB] rounded-lg">
                <path d="M 100 100 Q 200 50 300 100 T 400 200 Q 350 300 250 250 T 100 100 M 600 100 Q 700 50 800 100 T 900 200 Q 850 300 750 250 T 600 100" fill="#E8EEF8" stroke="#C8D3E8" strokeWidth="2" />
                {displayShipments.map(s => {
                  if (!s.originCoords || !s.destinationCoords) return null;
                  const [olat, olng] = s.originCoords.split(',').map(Number);
                  const [dlat, dlng] = s.destinationCoords.split(',').map(Number);
                  if (isNaN(olat) || isNaN(dlat)) return null;
                  const ox = (olng + 180) / 360 * 1000;
                  const oy = (90 - olat) / 180 * 500;
                  const dx = (dlng + 180) / 360 * 1000;
                  const dy = (90 - dlat) / 180 * 500;
                  const cx = (ox + dx) / 2;
                  const cy = Math.min(oy, dy) - 100;
                  const color = s.cargoType === 'electronics' ? '#0066FF' :
                                s.cargoType === 'agricultural' ? '#16A34A' :
                                s.cargoType === 'minerals' ? '#D97706' : '#6A82A0';
                  return (
                    <g key={s.id}>
                      <path d={`M ${ox} ${oy} Q ${cx} ${cy} ${dx} ${dy}`} fill="none" stroke={color} strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />
                      <circle cx={ox} cy={oy} r="4" fill="#0066FF" className="animate-pulse" />
                      <circle cx={dx} cy={dy} r="4" fill="#22C55E" className="animate-pulse" />
                      <circle cx={ox} cy={oy} r="4" fill={color}>
                        <animateMotion path={`M ${ox} ${oy} Q ${cx} ${cy} ${dx} ${dy}`} dur={`${s.etaDays ? Math.max(5, s.etaDays) : 10}s`} repeatCount="indefinite" />
                      </circle>
                    </g>
                  );
                })}
              </svg>
              {displayShipments.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                  <span className="text-[#3A4E66] font-mono font-bold">No active routes</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5 — PORT ACTIVITY FEED */}
          <div className="bg-white rounded-xl border border-[#EEF2F8] shadow-sm flex flex-col h-[500px]">
            <div className="p-4 border-b border-[#EEF2F8]">
              <h3 className="font-heading font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-[#0F1923]">
                <Activity className="h-4 w-4 text-[#F59E0B]" /> Port Activity
              </h3>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {isActivitiesLoading ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-[#DDE4EF] shrink-0" />
                    <div className="space-y-2 w-full">
                      <Skeleton className="h-4 w-full bg-[#DDE4EF]" />
                      <Skeleton className="h-3 w-2/3 bg-[#DDE4EF]" />
                    </div>
                  </div>
                ))
              ) : activities?.length ? (
                activities.map((act) => (
                  <div key={act.id} className="flex gap-3 border-b border-[#EEF2F8] pb-4 last:border-0">
                    <div
                      className={`mt-0.5 p-1.5 rounded shrink-0 ${
                        act.eventType === "arrival"
                          ? "bg-[#22C55E]/10 text-[#22C55E]"
                          : "bg-[#0066FF]/10 text-[#0066FF]"
                      }`}
                    >
                      {act.eventType === "arrival" ? "ARRIVED" : "DEPARTED"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#0F1923]">
                        <span className="font-bold">{act.vesselName}</span> at <span className="font-bold">{act.portName}, {act.country}</span>
                      </p>
                      <div className="flex items-center justify-between mt-1">
                         <span className="text-xs text-[#6A82A0] font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {format(parseISO(act.timestamp), "HH:mm")}
                        </span>
                        {act.cargoType && (
                          <span className="text-[10px] uppercase bg-[#F4F7FB] border border-[#DDE4EF] text-[#3A4E66] px-1.5 py-0.5 rounded font-mono font-bold">
                            {act.cargoType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-[#6A82A0] font-mono py-10">
                  No recent port activity.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" x2="9" y1="3" y2="18" />
      <line x1="15" x2="15" y1="6" y2="21" />
    </svg>
  );
}
