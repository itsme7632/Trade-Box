import { useGetTrackerShipments, useGetPortActivity } from "@workspace/api-client-react";
import { Ship, Anchor, Activity, Clock, Wifi } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { useTrackerPositions } from "@/hooks/use-socket";

export default function Tracker() {
  const { data: shipments, isLoading: isShipmentsLoading } = useGetTrackerShipments();
  const { data: activities, isLoading: isActivitiesLoading } = useGetPortActivity();
  const livePositions = useTrackerPositions();

  const mergedShipments = shipments?.map((s) => {
    const live = livePositions.find((p) => p.id === s.id);
    if (live) {
      return { ...s, progressPercent: live.progressPercent ?? s.progressPercent };
    }
    return s;
  }) ?? [];

  const displayShipments = mergedShipments.length > 0 ? mergedShipments : (shipments ?? []);

  return (
    <div className="flex flex-col min-h-screen bg-[#0F1923] text-white p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto w-full space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Global Tracker</h1>
            <p className="text-gray-400 font-mono text-sm mt-1 uppercase">Live maritime intelligence & active routes</p>
          </div>
          {livePositions.length > 0 && (
            <div className="flex items-center gap-2 bg-[#22C55E]/10 border border-[#22C55E]/30 px-3 py-1.5 rounded-full">
              <Wifi className="h-3 w-3 text-[#22C55E]" />
              <span className="text-xs font-mono text-[#22C55E]">LIVE</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Map Section */}
          <div className="xl:col-span-2 bg-[#1E293B] rounded-xl border border-[#334155] overflow-hidden flex flex-col">
            <div className="p-4 bg-[#0F1923] border-b border-[#334155] flex justify-between items-center">
              <h3 className="font-heading font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                <MapIcon className="h-4 w-4 text-[#0066FF]" /> Fleet Radar
              </h3>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
                </span>
                <span className="text-xs font-mono text-[#22C55E]">Live System</span>
              </div>
            </div>

            <div className="relative flex-1 min-h-[400px] bg-[#0A1017] p-8 flex items-center justify-center overflow-hidden">
              {/* Abstract World Map SVG Background */}
              <svg
                viewBox="0 0 1000 500"
                className="absolute inset-0 w-full h-full opacity-20 pointer-events-none stroke-[#334155]"
                fill="none"
                strokeWidth="1"
              >
                <path d="M 200,100 Q 250,50 300,80 T 350,150 Q 300,250 250,300 T 150,400 Q 100,300 150,200 Z" />
                <path d="M 450,100 Q 550,50 650,100 T 700,200 Q 600,300 500,250 T 450,150 Z" />
                <path d="M 750,300 Q 800,250 850,300 T 900,400 Q 800,450 750,400 Z" />
              </svg>

              {/* Grid lines */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(#1E293B 1px, transparent 1px), linear-gradient(90deg, #1E293B 1px, transparent 1px)",
                  backgroundSize: "50px 50px",
                  opacity: 0.2,
                }}
              />

              {isShipmentsLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="h-64 w-[80%] bg-[#1E293B] rounded-xl opacity-50" />
                </div>
              ) : displayShipments.length > 0 ? (
                <div className="relative w-full max-w-4xl h-full py-20 flex flex-col justify-around gap-8 z-10">
                  {displayShipments.map((s) => {
                    const pct = s.progressPercent ?? 0;
                    const isLive = livePositions.some((p) => p.id === s.id);
                    return (
                      <div key={s.id} className="relative w-full">
                        <div className="flex justify-between text-xs font-mono text-gray-400 mb-2 px-2">
                          <span>{s.origin}</span>
                          <div className="flex items-center gap-2">
                            {isLive && (
                              <span className="text-[#22C55E] text-[10px] font-bold tracking-widest">LIVE</span>
                            )}
                            <span>{s.destination}</span>
                          </div>
                        </div>

                        {/* Track Line */}
                        <div className="h-1.5 w-full bg-[#1E293B] relative rounded-full overflow-hidden border border-[#334155]">
                          <div
                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-[2000ms] ease-linear"
                            style={{
                              width: `${pct}%`,
                              background: isLive
                                ? "linear-gradient(90deg, #0066FF, #22C55E)"
                                : "#0066FF",
                            }}
                          />
                        </div>

                        {/* Vessel Marker */}
                        <div
                          className="absolute top-6 -translate-y-1/2 -ml-3 z-20 group cursor-pointer transition-all duration-[2000ms] ease-linear"
                          style={{ left: `${pct}%` }}
                        >
                          <div
                            className={`p-1.5 rounded-full shadow-lg ${
                              isLive
                                ? "bg-[#22C55E] shadow-[0_0_10px_#22C55E]"
                                : "bg-[#0066FF] shadow-[0_0_10px_#0066FF]"
                            }`}
                          >
                            <Ship className="h-3 w-3 text-white" />
                          </div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E293B] border border-[#334155] p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                            <p className="font-bold text-xs">{(s as any).vesselName ?? s.title}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                              {Math.round(pct)}% complete
                              {(s as any).etaDays != null ? ` · ETA ${(s as any).etaDays}d` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="relative z-10 text-center text-gray-500 font-mono">
                  No active routes to track.
                </div>
              )}
            </div>
          </div>

          {/* Port Activity Feed */}
          <div className="bg-[#1E293B] rounded-xl border border-[#334155] overflow-hidden flex flex-col h-[500px] xl:h-auto">
            <div className="p-4 bg-[#0F1923] border-b border-[#334155]">
              <h3 className="font-heading font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                <Activity className="h-4 w-4 text-[#F59E0B]" /> Port Activity
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isActivitiesLoading ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-[#334155] shrink-0" />
                    <div className="space-y-2 w-full">
                      <Skeleton className="h-4 w-full bg-[#334155]" />
                      <Skeleton className="h-3 w-2/3 bg-[#334155]" />
                    </div>
                  </div>
                ))
              ) : activities?.length ? (
                activities.map((act) => (
                  <div key={act.id} className="flex gap-3 border-b border-[#334155]/50 pb-4 last:border-0">
                    <div
                      className={`mt-0.5 p-1.5 rounded bg-[#0F1923] border shrink-0 ${
                        act.eventType === "arrival"
                          ? "border-[#22C55E] text-[#22C55E]"
                          : "border-[#0066FF] text-[#0066FF]"
                      }`}
                    >
                      {act.eventType === "arrival" ? (
                        <Anchor className="h-4 w-4" />
                      ) : (
                        <Ship className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-bold text-white">{act.vesselName}</span>
                        <span className="text-gray-400">
                          {" "}
                          {act.eventType === "arrival" ? "arrived at" : "departed from"}{" "}
                        </span>
                        <span className="font-bold text-white">
                          {act.portName}, {act.country}
                        </span>
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(act.timestamp), "HH:mm")}
                        </span>
                        {act.cargoType && (
                          <span className="uppercase text-[#0066FF] border border-[#0066FF]/30 px-1 rounded">
                            {act.cargoType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 font-mono py-10">
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
