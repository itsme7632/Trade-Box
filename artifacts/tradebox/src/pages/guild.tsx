import { useState } from "react";
import { useGetGuildStats, useGetGuildReferrals, useGetGuildCommissions } from "@workspace/api-client-react";
import { Copy, Users, TrendingUp, Award, Check, ArrowUpRight, Network, Share2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { format, parseISO } from "date-fns";

const ranks = [
  { name: "Merchant", threshold: 0, color: "#64748B" },
  { name: "Trader", threshold: 10000, color: "#3B82F6" },
  { name: "Broker", threshold: 50000, color: "#8B5CF6" },
  { name: "Magnate", threshold: 100000, color: "#F59E0B" },
];

type Tab = "network" | "commissions";

export default function Guild() {
  const { data: stats, isLoading: isStatsLoading } = useGetGuildStats();
  const { data: referrals, isLoading: isReferralsLoading } = useGetGuildReferrals();
  const { data: commissions, isLoading: isCommissionsLoading } = useGetGuildCommissions();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("network");
  const { toast } = useToast();

  const copyCode = () => {
    if (stats?.guildCode) {
      navigator.clipboard.writeText(stats.guildCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Guild Code Copied", description: "Share to earn commissions." });
    }
  };

  const currentRankIndex = ranks.findIndex(r => r.name === stats?.rank);
  const currentRank = ranks[currentRankIndex >= 0 ? currentRankIndex : 0];
  const nextRank = ranks[currentRankIndex + 1];
  const progressToNext = nextRank && stats
    ? Math.min(100, (stats.totalVolumeFunded / nextRank.threshold) * 100)
    : 100;

  const tierConfig = [
    { tier: 1, rate: 7, color: "#F59E0B", count: stats?.tier1Count, earnings: stats?.tier1Earnings, label: "Direct referrals" },
    { tier: 2, rate: 2, color: "#3B82F6", count: stats?.tier2Count, earnings: stats?.tier2Earnings, label: "2nd-level network" },
    { tier: 3, rate: 1, color: "#8B5CF6", count: stats?.tier3Count, earnings: stats?.tier3Earnings, label: "3rd-level network" },
  ];

  return (
    <div className="min-h-screen bg-[#050D1B]">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
            Trade Guild
          </h1>
          <p className="text-[#475569] text-xs font-mono uppercase tracking-widest">Referral network & commissions</p>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-8 space-y-5">

        {/* Guild Identity Card */}
        <div className="rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(10,22,40,0.95) 50%)",
            border: "1px solid rgba(245,158,11,0.2)"
          }}>
          <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-10">
            <Award className="w-full h-full text-[#F59E0B]" />
          </div>

          <div className="p-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Code */}
              <div className="space-y-5">
                <div>
                  <div className="text-[10px] font-mono text-[#475569] uppercase tracking-widest mb-2">Your Guild Code</div>
                  {isStatsLoading ? (
                    <div className="h-14 w-52 shimmer rounded-xl" />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="px-6 py-3 rounded-xl font-mono text-2xl font-bold text-white tracking-widest"
                        style={{
                          background: "rgba(5,13,27,0.7)",
                          border: "1px solid rgba(245,158,11,0.25)",
                          letterSpacing: "0.15em"
                        }}>
                        {stats?.guildCode}
                      </div>
                      <button onClick={copyCode}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          background: copied ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.1)",
                          border: `1px solid ${copied ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.2)"}`,
                        }}>
                        {copied ? <Check className="h-4 w-4 text-[#10B981]" /> : <Copy className="h-4 w-4 text-[#F59E0B]" />}
                      </button>
                      <button onClick={copyCode}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                        style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                        <Share2 className="h-4 w-4 text-[#3B82F6]" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-mono text-[#475569] uppercase tracking-widest mb-1">Total Network Earnings</div>
                  {isStatsLoading ? <div className="h-10 w-40 shimmer rounded-lg" /> : (
                    <div className="text-3xl font-bold text-[#10B981]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      +{stats?.totalEarnings.toLocaleString()} <span className="text-lg opacity-70">USDT</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rank progress */}
              <div className="rounded-xl p-5"
                style={{ background: "rgba(5,13,27,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">Current Rank</span>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" style={{ color: currentRank?.color || "#F59E0B" }} />
                    <span className="font-bold text-sm uppercase tracking-wider" style={{ color: currentRank?.color || "#F59E0B" }}>
                      {stats?.rank || "Merchant"}
                    </span>
                  </div>
                </div>

                {/* Rank steps */}
                <div className="flex items-center gap-1 mb-4">
                  {ranks.map((r, i) => {
                    const isCurrent = r.name === stats?.rank;
                    const isPast = currentRankIndex >= i;
                    return (
                      <div key={r.name} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-0.5 flex-1">
                          <div className={`w-2.5 h-2.5 rounded-full transition-all ${isCurrent ? "scale-125" : ""}`}
                            style={{
                              background: isPast ? r.color : "rgba(255,255,255,0.1)",
                              boxShadow: isCurrent ? `0 0 8px ${r.color}` : "none"
                            }} />
                          <span className="text-[8px] font-mono" style={{ color: isPast ? r.color : "#334155" }}>
                            {r.name}
                          </span>
                        </div>
                        {i < ranks.length - 1 && (
                          <div className="h-px flex-1 mx-0.5"
                            style={{ background: currentRankIndex > i ? `${r.color}60` : "rgba(255,255,255,0.05)" }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {nextRank && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-[#475569]">
                      <span>Volume: {stats?.totalVolumeFunded.toLocaleString()} USDT</span>
                      <span>Next: {nextRank.threshold.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressToNext}%`,
                          background: `linear-gradient(90deg, ${currentRank?.color || "#F59E0B"}, ${nextRank.color})`,
                          boxShadow: `0 0 6px ${currentRank?.color || "#F59E0B"}60`
                        }} />
                    </div>
                    <p className="text-[10px] text-[#475569] font-mono">
                      Need {(nextRank.threshold - (stats?.totalVolumeFunded || 0)).toLocaleString()} more USDT to reach <span style={{ color: nextRank.color }}>{nextRank.name}</span>
                    </p>
                  </div>
                )}
                {!nextRank && (
                  <p className="text-xs text-[#10B981] font-mono mt-2">🏆 Maximum rank achieved.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tier stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tierConfig.map(t => (
            <div key={t.tier} className="rounded-2xl p-5 card-hover"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#475569]">Tier {t.tier}</span>
                  <div className="text-[10px] text-[#334155] font-mono mt-0.5">{t.label}</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold"
                  style={{ background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}25` }}>
                  {t.rate}% commission
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-[#334155] font-mono uppercase mb-1">Members</div>
                  <div className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: t.color }}>
                    {t.count || 0}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#334155] font-mono uppercase mb-1">Generated</div>
                  <div className="text-base font-bold text-[#10B981] font-mono">
                    +{(t.earnings || 0).toLocaleString()} <span className="text-xs opacity-70">USDT</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl"
          style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {[
            { id: "network" as Tab, label: "Network", icon: Users },
            { id: "commissions" as Tab, label: "Commissions", icon: TrendingUp },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all duration-200"
              style={activeTab === tab.id ? {
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                color: "white",
                boxShadow: "0 2px 12px rgba(37,99,235,0.4)"
              } : { color: "#475569" }}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Network Tab */}
        {activeTab === "network" && (
          <div className="rounded-2xl overflow-hidden animate-fade-in-up"
            style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {isReferralsLoading ? (
              <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 shimmer rounded-xl" />)}</div>
            ) : referrals?.length ? (
              <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
                <div className="grid grid-cols-4 p-4 text-[10px] font-mono text-[#334155] uppercase tracking-wider"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span>Trader</span>
                  <span>Tier</span>
                  <span>Joined</span>
                  <span className="text-right">Volume</span>
                </div>
                {referrals.map(ref => (
                  <div key={ref.id} className="grid grid-cols-4 p-4 items-center hover:bg-white/1 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-[#E2E8F0]">{ref.traderId}</p>
                      <p className="text-[10px] font-mono text-[#334155] truncate max-w-[100px]">{ref.email}</p>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full w-fit"
                      style={{
                        background: ["", "rgba(245,158,11,0.1)", "rgba(59,130,246,0.1)", "rgba(139,92,246,0.1)"][ref.tier] || "rgba(59,130,246,0.1)",
                        color: ["", "#F59E0B", "#3B82F6", "#8B5CF6"][ref.tier] || "#3B82F6"
                      }}>
                      T{ref.tier}
                    </span>
                    <span className="text-xs font-mono text-[#475569]">
                      {format(parseISO(ref.joinedAt), "MMM dd, yyyy")}
                    </span>
                    <span className="text-sm font-bold font-mono text-[#E2E8F0] text-right">
                      {ref.volumeFunded.toLocaleString()} <span className="text-[10px] text-[#475569]">USDT</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 flex flex-col items-center text-center">
                <Network className="h-10 w-10 text-[#1E3A5F] mb-3" />
                <p className="text-sm font-bold text-[#475569] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No referrals yet</p>
                <p className="text-xs text-[#334155] font-mono">Share your Guild Code to start earning commissions.</p>
              </div>
            )}
          </div>
        )}

        {/* Commissions Tab */}
        {activeTab === "commissions" && (
          <div className="rounded-2xl overflow-hidden animate-fade-in-up"
            style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {isCommissionsLoading ? (
              <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 shimmer rounded-xl" />)}</div>
            ) : commissions?.length ? (
              <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
                {commissions.map(comm => (
                  <div key={comm.id} className="flex items-center gap-4 p-4 hover:bg-white/1 transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(139,92,246,0.1)" }}>
                      <ArrowUpRight className="h-4 w-4 text-[#8B5CF6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#94A3B8] truncate">{comm.description}</p>
                      <p className="text-[10px] font-mono text-[#334155] mt-0.5">
                        {format(parseISO(comm.createdAt), "MMM dd, yyyy · HH:mm")}
                      </p>
                    </div>
                    <div className="text-sm font-bold text-[#10B981] font-mono">
                      +{comm.amount.toLocaleString()} USDT
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 flex flex-col items-center text-center">
                <TrendingUp className="h-10 w-10 text-[#1E3A5F] mb-3" />
                <p className="text-sm font-bold text-[#475569] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No commissions yet</p>
                <p className="text-xs text-[#334155] font-mono">Commission earnings appear here as your network invests.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
