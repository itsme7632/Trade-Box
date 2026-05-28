import { useState } from "react";
import { useGetGuildStats, useGetGuildReferrals, useGetGuildCommissions } from "@workspace/api-client-react";
import { Copy, Users, TrendingUp, Award, Check, ArrowUpRight, Network, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const ranks = [
  { name: "Merchant", threshold: 0, color: "#94a3b8" },
  { name: "Trader", threshold: 10000, color: "#2563eb" },
  { name: "Broker", threshold: 50000, color: "#7c3aed" },
  { name: "Magnate", threshold: 100000, color: "#d97706" },
];

type Tab = "network" | "commissions";

function S({ h = 60 }: { h?: number }) {
  return <div className="shimmer" style={{ height: h, borderRadius: 12 }} />;
}

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
      toast({ title: "Guild Code Copied" });
    }
  };

  const currentRankIndex = ranks.findIndex(r => r.name === stats?.rank);
  const currentRank = ranks[Math.max(0, currentRankIndex)];
  const nextRank = ranks[currentRankIndex + 1];
  const progressToNext = nextRank && stats
    ? Math.min(100, (stats.totalVolumeFunded / nextRank.threshold) * 100) : 100;

  const tiers = [
    { tier: 1, rate: 7, color: "#d97706", bg: "#fffbeb", border: "#fde68a", count: stats?.tier1Count, earnings: stats?.tier1Earnings, desc: "Direct referrals" },
    { tier: 2, rate: 2, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", count: stats?.tier2Count, earnings: stats?.tier2Earnings, desc: "2nd-level network" },
    { tier: 3, rate: 1, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", count: stats?.tier3Count, earnings: stats?.tier3Earnings, desc: "3rd-level network" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
      {/* Header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "20px 16px 16px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Trade Guild</h1>
        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Referral network & commissions</p>
      </div>

      <div style={{ padding: "16px", maxWidth: "680px", margin: "0 auto" }}>

        {/* Guild Code Card */}
        <div style={{
          background: "linear-gradient(135deg, #1e40af, #2563eb)",
          borderRadius: "18px", padding: "20px", marginBottom: "12px",
          boxShadow: "0 4px 20px rgba(37,99,235,0.25)", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
            Your Guild Code
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            {isStatsLoading
              ? <div style={{ height: "48px", width: "160px", borderRadius: "10px", background: "rgba(255,255,255,0.15)" }} />
              : (
                <div style={{ fontSize: "28px", fontWeight: 800, color: "white", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", padding: "10px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  {stats?.guildCode}
                </div>
              )}
            <button onClick={copyCode} style={{ width: "42px", height: "42px", borderRadius: "12px", background: copied ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} color="white" />}
            </button>
            <button onClick={copyCode} style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Share2 size={16} color="white" />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Total Earnings</div>
              {isStatsLoading
                ? <div style={{ height: "32px", width: "120px", borderRadius: "8px", background: "rgba(255,255,255,0.15)" }} />
                : <div style={{ fontSize: "24px", fontWeight: 800, color: "#4ade80", fontFamily: "'Space Grotesk', sans-serif" }}>
                    +{stats?.totalEarnings.toLocaleString()} <span style={{ fontSize: "13px", opacity: 0.7 }}>USDT</span>
                  </div>
              }
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Rank</div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Award size={16} color="#fcd34d" />
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#fcd34d", fontFamily: "'Space Grotesk', sans-serif" }}>{stats?.rank || "Merchant"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rank progress */}
        {nextRank && (
          <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>Rank Progress</span>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                {stats?.totalVolumeFunded.toLocaleString()} / {nextRank.threshold.toLocaleString()} USDT
              </span>
            </div>
            {/* Rank steps */}
            <div style={{ display: "flex", alignItems: "center", gap: "2px", marginBottom: "8px" }}>
              {ranks.map((r, i) => {
                const isPast = currentRankIndex >= i;
                const isCurrent = r.name === stats?.rank;
                return (
                  <div key={r.name} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", flex: i < ranks.length - 1 ? "none" : 1 }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: isPast ? r.color : "#e2e8f0", boxShadow: isCurrent ? `0 0 6px ${r.color}` : "none", transform: isCurrent ? "scale(1.3)" : "scale(1)", transition: "all 0.2s" }} />
                      <span style={{ fontSize: "8px", color: isPast ? r.color : "#94a3b8", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{r.name}</span>
                    </div>
                    {i < ranks.length - 1 && (
                      <div style={{ flex: 1, height: "2px", background: currentRankIndex > i ? currentRank.color : "#e2e8f0", margin: "0 3px", marginBottom: "14px" }} />
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ height: "6px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden" }}>
              <div style={{ width: `${progressToNext}%`, height: "100%", borderRadius: "999px", background: currentRank.color, transition: "width 0.5s ease" }} />
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              {(nextRank.threshold - (stats?.totalVolumeFunded || 0)).toLocaleString()} USDT more to reach <b style={{ color: nextRank.color }}>{nextRank.name}</b>
            </p>
          </div>
        )}

        {/* Tier stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
          {tiers.map(t => (
            <div key={t.tier} style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "14px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 7px", borderRadius: "20px", background: t.bg, border: `1px solid ${t.border}`, marginBottom: "8px" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: t.color, fontFamily: "'JetBrains Mono', monospace" }}>T{t.tier} · {t.rate}%</span>
              </div>
              <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: "2px" }}>Members</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: t.color, fontFamily: "'Space Grotesk', sans-serif" }}>{t.count || 0}</div>
              <div style={{ fontSize: "10px", color: "#059669", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px" }}>+{(t.earnings || 0).toLocaleString()} USDT</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", padding: "3px", background: "#f1f5f9", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
          {[
            { id: "network" as Tab, label: "Network", icon: Users },
            { id: "commissions" as Tab, label: "Commissions", icon: TrendingUp },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "8px", borderRadius: "9px", border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: activeTab === tab.id ? 600 : 500,
              background: activeTab === tab.id ? "#ffffff" : "transparent",
              color: activeTab === tab.id ? "#2563eb" : "#64748b",
              boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}>
              <tab.icon size={13} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Network */}
        {activeTab === "network" && (
          <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            {isReferralsLoading ? (
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>{[...Array(4)].map((_, i) => <S key={i} />)}</div>
            ) : referrals?.length ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 80px", gap: "8px", padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}>
                  {["Trader", "Tier", "Joined", "Volume"].map(h => (
                    <span key={h} style={{ fontSize: "9px", fontWeight: 600, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: h === "Volume" ? "right" : "left" }}>{h}</span>
                  ))}
                </div>
                {referrals.map((ref, idx) => {
                  const tierColors = ["", "#d97706", "#2563eb", "#7c3aed"];
                  const tierBgs = ["", "#fffbeb", "#eff6ff", "#f5f3ff"];
                  return (
                    <div key={ref.id} style={{
                      display: "grid", gridTemplateColumns: "1fr 60px 80px 80px", gap: "8px",
                      padding: "11px 16px", alignItems: "center",
                      borderBottom: idx < referrals.length - 1 ? "1px solid #f8fafc" : "none",
                    }}>
                      <div>
                        <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>{ref.traderId}</p>
                        <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ref.email}</p>
                      </div>
                      <span style={{ padding: "2px 7px", borderRadius: "20px", fontSize: "10px", fontWeight: 600, background: tierBgs[ref.tier] || "#f1f5f9", color: tierColors[ref.tier] || "#64748b", fontFamily: "'JetBrains Mono', monospace", display: "inline-block" }}>
                        T{ref.tier}
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                        {format(parseISO(ref.joinedAt), "MMM dd")}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", fontFamily: "'JetBrains Mono', monospace", textAlign: "right" }}>
                        {ref.volumeFunded.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <Network size={32} color="#cbd5e1" style={{ marginBottom: "10px" }} />
                <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}>No referrals yet</p>
                <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Share your Guild Code to start earning.</p>
              </div>
            )}
          </div>
        )}

        {/* Commissions */}
        {activeTab === "commissions" && (
          <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            {isCommissionsLoading ? (
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>{[...Array(4)].map((_, i) => <S key={i} />)}</div>
            ) : commissions?.length ? (
              commissions.map((comm, idx) => (
                <div key={comm.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", borderBottom: idx < commissions.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ArrowUpRight size={16} color="#7c3aed" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{comm.description}</p>
                    <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px" }}>
                      {format(parseISO(comm.createdAt), "MMM dd, yyyy · HH:mm")}
                    </p>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#059669", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                    +{comm.amount.toLocaleString()} USDT
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <TrendingUp size={32} color="#cbd5e1" style={{ marginBottom: "10px" }} />
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#64748b" }}>No commissions yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
