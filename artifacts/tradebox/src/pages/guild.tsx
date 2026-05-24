import { useState } from "react";
import { useGetGuildStats, useGetGuildReferrals, useGetGuildCommissions } from "@workspace/api-client-react";
import { Copy, Users, TrendingUp, Award, Check, Network, ArrowUpRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { format, parseISO } from "date-fns";

export default function Guild() {
  const { data: stats, isLoading: isStatsLoading } = useGetGuildStats();
  const { data: referrals, isLoading: isReferralsLoading } = useGetGuildReferrals();
  const { data: commissions, isLoading: isCommissionsLoading } = useGetGuildCommissions();
  
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyCode = () => {
    if (stats?.guildCode) {
      navigator.clipboard.writeText(stats.guildCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Guild Code Copied", description: "Share this code to earn commissions." });
    }
  };

  const ranks = [
    { name: 'Merchant', threshold: 0 },
    { name: 'Trader', threshold: 10000 },
    { name: 'Broker', threshold: 50000 },
    { name: 'Magnate', threshold: 100000 },
  ];

  const currentRankIndex = ranks.findIndex(r => r.name === stats?.rank) || 0;
  const nextRank = ranks[currentRankIndex + 1];
  const progressToNext = nextRank && stats ? Math.min(100, (stats.totalVolumeFunded / nextRank.threshold) * 100) : 100;

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FB] text-[#0F1923] p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        
        <div className="flex items-center gap-3">
          <Network className="h-8 w-8 text-[#0066FF]" />
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Trade Guild</h1>
            <p className="text-[#6A82A0] font-mono text-sm uppercase">Referral network & commissions</p>
          </div>
        </div>

        {/* Guild Identity Card */}
        <div className="bg-white rounded-2xl border border-[#0066FF]/30 p-6 md:p-8 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Award className="h-48 w-48 text-[#0066FF]" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div>
              <p className="text-[#6A82A0] font-mono uppercase tracking-wider text-xs mb-2">Your Guild Code</p>
              {isStatsLoading ? (
                <Skeleton className="h-14 w-64 bg-[#EEF2F8]" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="bg-[#F8FAFD] border border-[#EEF2F8] px-6 py-3 rounded-xl font-mono text-2xl font-bold text-[#0F1923] tracking-widest">
                    {stats?.guildCode}
                  </div>
                  <button onClick={copyCode} className="p-3 bg-[#0066FF]/10 hover:bg-[#0066FF]/20 text-[#0066FF] rounded-xl transition-colors">
                    {copied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
                  </button>
                </div>
              )}
              
              <div className="mt-8">
                <p className="text-[#6A82A0] font-mono uppercase tracking-wider text-xs mb-3">Total Network Earnings</p>
                {isStatsLoading ? (
                  <Skeleton className="h-10 w-48 bg-[#EEF2F8]" />
                ) : (
                  <p className="text-4xl font-bold font-mono text-[#22C55E]">+{stats?.totalEarnings.toLocaleString()} USDT</p>
                )}
              </div>
            </div>

            <div className="bg-[#F8FAFD] p-6 rounded-xl border border-[#EEF2F8]">
              <div className="flex justify-between items-center mb-4">
                <p className="text-[#6A82A0] font-mono uppercase tracking-wider text-xs">Current Rank</p>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#F59E0B]" />
                  <span className="font-bold text-[#F59E0B] uppercase tracking-wider">{stats?.rank}</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm font-mono text-[#0F1923]">
                  <span>Volume: {stats?.totalVolumeFunded.toLocaleString()} USDT</span>
                  {nextRank && <span className="text-[#6A82A0]">Next: {nextRank.threshold.toLocaleString()} USDT</span>}
                </div>
                <Progress value={progressToNext} className="h-2 bg-[#EEF2F8]" indicatorClassName="bg-[#F59E0B]" />
              </div>
              
              {nextRank ? (
                <p className="text-xs text-[#6A82A0] font-mono">
                  Generate {(nextRank.threshold - (stats?.totalVolumeFunded || 0)).toLocaleString()} USDT more volume to reach {nextRank.name}.
                </p>
              ) : (
                <p className="text-xs text-[#22C55E] font-mono">Maximum rank achieved.</p>
              )}
            </div>
          </div>
        </div>

        {/* Tier Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { tier: 1, rate: 7, count: stats?.tier1Count, earnings: stats?.tier1Earnings },
            { tier: 2, rate: 2, count: stats?.tier2Count, earnings: stats?.tier2Earnings },
            { tier: 3, rate: 1, count: stats?.tier3Count, earnings: stats?.tier3Earnings }
          ].map((t) => (
            <div key={t.tier} className="bg-white p-6 rounded-xl border border-[#EEF2F8] shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <p className="font-heading font-bold text-lg text-[#0F1923]">Tier {t.tier}</p>
                <span className="bg-[#0066FF]/10 text-[#0066FF] px-2 py-1 rounded text-xs font-mono font-bold">{t.rate}% Commission</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#6A82A0] font-mono">Network Size</span>
                  <span className="font-bold flex items-center gap-1 text-[#0F1923]"><Users className="h-4 w-4 text-[#6A82A0]" /> {t.count || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#6A82A0] font-mono">Generated</span>
                  <span className="font-bold text-[#22C55E] font-mono">{(t.earnings || 0).toLocaleString()} USDT</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="referrals" className="w-full">
          <TabsList className="bg-white border border-[#EEF2F8] p-1 shadow-sm">
            <TabsTrigger value="referrals" className="font-mono uppercase text-xs data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">Network List</TabsTrigger>
            <TabsTrigger value="commissions" className="font-mono uppercase text-xs data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">Commission History</TabsTrigger>
          </TabsList>

          <TabsContent value="referrals" className="mt-6">
            <div className="bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFD] border-b border-[#EEF2F8] text-xs font-mono text-[#6A82A0] uppercase tracking-wider">
                      <th className="p-4 font-medium">Trader ID</th>
                      <th className="p-4 font-medium">Tier</th>
                      <th className="p-4 font-medium">Joined Date</th>
                      <th className="p-4 font-medium text-right">Volume Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F8]">
                    {isReferralsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <tr key={i}><td colSpan={4} className="p-4"><Skeleton className="h-6 w-full bg-[#EEF2F8]" /></td></tr>
                      ))
                    ) : referrals?.length ? (
                      referrals.map((ref) => (
                        <tr key={ref.id} className="hover:bg-[#F8FAFD] transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-[#0F1923]">{ref.traderId}</p>
                            <p className="text-xs text-[#6A82A0] font-mono">{ref.email}</p>
                          </td>
                          <td className="p-4">
                            <span className="bg-[#EEF2F8] text-[#0F1923] px-2 py-1 rounded text-xs font-mono">Tier {ref.tier}</span>
                          </td>
                          <td className="p-4 text-sm text-[#3A4E66] font-mono">{format(parseISO(ref.joinedAt), 'MMM dd, yyyy')}</td>
                          <td className="p-4 text-right font-bold text-[#0F1923] font-mono">{ref.volumeFunded.toLocaleString()} USDT</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="p-8 text-center text-[#6A82A0] font-mono text-sm">No referrals found in your network.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="commissions" className="mt-6">
            <div className="bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFD] border-b border-[#EEF2F8] text-xs font-mono text-[#6A82A0] uppercase tracking-wider">
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Source</th>
                      <th className="p-4 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F8]">
                    {isCommissionsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <tr key={i}><td colSpan={3} className="p-4"><Skeleton className="h-6 w-full bg-[#EEF2F8]" /></td></tr>
                      ))
                    ) : commissions?.length ? (
                      commissions.map((comm) => (
                        <tr key={comm.id} className="hover:bg-[#F8FAFD] transition-colors">
                          <td className="p-4 text-sm text-[#3A4E66] font-mono">{format(parseISO(comm.createdAt), 'MMM dd, yyyy HH:mm')}</td>
                          <td className="p-4 text-sm text-[#0F1923]">{comm.description}</td>
                          <td className="p-4 text-right font-bold text-[#22C55E] font-mono flex justify-end items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" /> {comm.amount.toLocaleString()} USDT
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="p-8 text-center text-[#6A82A0] font-mono text-sm">No commissions earned yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
