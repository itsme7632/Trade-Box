import { useState } from "react";
import { useGetBalance, useGetCryptoAddresses, useGetLedger, useSubmitDeposit, useSubmitWithdrawal } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDownToLine, ArrowUpFromLine, History, Copy, Check, AlertCircle, TrendingUp, Wallet as WalletIcon, ChevronDown } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const depositSchema = z.object({
  coin: z.string().min(1),
  amount: z.coerce.number().min(10),
  txid: z.string().min(10),
  proofUrl: z.string().optional()
});

const withdrawSchema = z.object({
  coin: z.string().min(1),
  amount: z.coerce.number().min(50),
  walletAddress: z.string().min(10),
});

type LedgerType = "all" | "deposits" | "withdrawals" | "deliveries" | "guild";

const typeColors: Record<string, { bg: string; text: string }> = {
  deposit: { bg: "rgba(16,185,129,0.1)", text: "#10B981" },
  withdrawal: { bg: "rgba(239,68,68,0.1)", text: "#EF4444" },
  delivery_profit: { bg: "rgba(16,185,129,0.1)", text: "#10B981" },
  guild_commission: { bg: "rgba(139,92,246,0.1)", text: "#8B5CF6" },
  investment: { bg: "rgba(59,130,246,0.1)", text: "#3B82F6" },
};

const statusConfig: Record<string, { bg: string; text: string }> = {
  cleared: { bg: "rgba(16,185,129,0.1)", text: "#10B981" },
  rejected: { bg: "rgba(239,68,68,0.1)", text: "#EF4444" },
  pending: { bg: "rgba(245,158,11,0.1)", text: "#F59E0B" },
  pending_review: { bg: "rgba(245,158,11,0.1)", text: "#F59E0B" },
};

export default function Wallet() {
  const { data: balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useGetBalance();
  const { data: addresses } = useGetCryptoAddresses();
  const [ledgerType, setLedgerType] = useState<LedgerType>("all");
  const { data: ledger, isLoading: isLedgerLoading } = useGetLedger({ type: ledgerType });
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "ledger">("deposit");

  const depositMutation = useSubmitDeposit();
  const withdrawMutation = useSubmitWithdrawal();
  const { toast } = useToast();

  const depositForm = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: { coin: "USDT", amount: 100, txid: "" }
  });

  const withdrawForm = useForm<z.infer<typeof withdrawSchema>>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { coin: "USDT", amount: 50, walletAddress: "" }
  });

  const selectedCoin = depositForm.watch("coin");
  const currentAddress = addresses?.find(a => a.coin === selectedCoin);
  const investAmount = withdrawForm.watch("amount");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const onDeposit = (data: z.infer<typeof depositSchema>) => {
    depositMutation.mutate({ data }, {
      onSuccess: () => { toast({ title: "Deposit submitted", description: "Pending admin review." }); depositForm.reset(); },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" })
    });
  };

  const onWithdraw = (data: z.infer<typeof withdrawSchema>) => {
    if (balance && data.amount > balance.balance) {
      toast({ title: "Insufficient funds", variant: "destructive" }); return;
    }
    withdrawMutation.mutate({ data }, {
      onSuccess: () => { toast({ title: "Withdrawal submitted" }); withdrawForm.reset(); refetchBalance(); },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" })
    });
  };

  const tabs = [
    { id: "deposit" as const, label: "Deposit", icon: ArrowDownToLine },
    { id: "withdraw" as const, label: "Withdraw", icon: ArrowUpFromLine },
    { id: "ledger" as const, label: "History", icon: History },
  ];

  const isPositive = (type: string) => ["deposit", "delivery_profit", "guild_commission"].includes(type);

  return (
    <div className="min-h-screen bg-[#050D1B]">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.1) 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
            Wallet
          </h1>
          <p className="text-[#475569] text-xs font-mono uppercase tracking-widest">Manage your funds</p>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-8 space-y-5">
        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Main balance */}
          <div className="md:col-span-1 rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(10,22,40,0.95) 100%)",
              border: "1px solid rgba(59,130,246,0.25)",
              boxShadow: "0 8px 40px rgba(37,99,235,0.1)"
            }}>
            <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none opacity-30"
              style={{ background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)" }} />
            <div className="flex items-center gap-2 mb-4">
              <WalletIcon className="h-4 w-4 text-[#3B82F6]" />
              <span className="text-xs font-mono text-[#475569] uppercase tracking-widest">Available Balance</span>
            </div>
            {isBalanceLoading ? (
              <div className="h-12 w-48 shimmer rounded-xl" />
            ) : (
              <div className="text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
                {balance?.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-lg text-[#3B82F6] ml-1.5">USDT</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5 flex flex-col gap-2"
            style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">Total Invested</span>
            {isBalanceLoading ? <div className="h-8 w-32 shimmer rounded-lg" /> : (
              <div className="text-2xl font-bold text-[#E2E8F0]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {balance?.totalInvested.toLocaleString()} <span className="text-sm text-[#475569]">USDT</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5 flex flex-col gap-2"
            style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <span className="text-[10px] font-mono text-[#475569] uppercase tracking-widest flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-[#10B981]" /> Total Profits
            </span>
            {isBalanceLoading ? <div className="h-8 w-32 shimmer rounded-lg" /> : (
              <div className="text-2xl font-bold text-[#10B981]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                +{balance?.totalProfits.toLocaleString()} <span className="text-sm opacity-70">USDT</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-2xl"
          style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all duration-200"
              style={activeTab === tab.id ? {
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                color: "white",
                boxShadow: "0 2px 12px rgba(37,99,235,0.4)"
              } : { color: "#475569" }}>
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Deposit Tab */}
        {activeTab === "deposit" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in-up">
            {/* Step 1: Select & Copy Address */}
            <div className="rounded-2xl p-6 space-y-5"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="font-bold text-[#E2E8F0] flex items-center gap-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs flex items-center justify-center">1</span>
                Select Network & Copy Address
              </h3>
              <Form {...depositForm}>
                <div className="space-y-4">
                  <FormField control={depositForm.control} name="coin" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#475569] text-xs font-mono uppercase tracking-wider">Cryptocurrency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 font-mono">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {addresses?.map(a => (
                            <SelectItem key={a.coin} value={a.coin} className="font-mono">
                              {a.coin} — {a.network}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  {currentAddress && (
                    <div className="space-y-2">
                      <label className="text-[#475569] text-xs font-mono uppercase tracking-wider block">
                        {currentAddress.coin} Deposit Address ({currentAddress.network})
                      </label>
                      <div className="flex overflow-hidden rounded-xl"
                        style={{ background: "rgba(5,13,27,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <code className="flex-1 p-3 text-xs text-[#60A5FA] font-mono break-all leading-relaxed">
                          {currentAddress.address}
                        </code>
                        <button type="button" onClick={() => copyToClipboard(currentAddress.address)}
                          className="px-4 flex items-center justify-center shrink-0 transition-colors hover:bg-white/3"
                          style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                          {copied === currentAddress.address
                            ? <Check className="h-4 w-4 text-[#10B981]" />
                            : <Copy className="h-4 w-4 text-[#475569]" />}
                        </button>
                      </div>
                      <div className="flex items-start gap-2 p-3 rounded-xl"
                        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                        <AlertCircle className="h-3.5 w-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
                        <p className="text-[11px] text-[#F59E0B] font-mono leading-relaxed">
                          Send ONLY {currentAddress.coin} via {currentAddress.network}. Wrong network = permanent loss.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Form>
            </div>

            {/* Step 2: Submit TXID */}
            <div className="rounded-2xl p-6 space-y-5"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="font-bold text-[#E2E8F0] flex items-center gap-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs flex items-center justify-center">2</span>
                Confirm Transaction
              </h3>
              <Form {...depositForm}>
                <form onSubmit={depositForm.handleSubmit(onDeposit)} className="space-y-4">
                  <FormField control={depositForm.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#475569] text-xs font-mono uppercase tracking-wider">Amount Sent (USDT Equiv)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" className="tb-input h-12 pr-16 font-mono" {...field} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#475569] font-bold">USDT</span>
                        </div>
                      </FormControl>
                      <FormMessage className="text-[#EF4444] text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={depositForm.control} name="txid" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#475569] text-xs font-mono uppercase tracking-wider">Transaction Hash (TXID)</FormLabel>
                      <FormControl>
                        <Input className="tb-input h-12 font-mono text-xs" placeholder="0x... or blockchain txid" {...field} />
                      </FormControl>
                      <FormMessage className="text-[#EF4444] text-xs" />
                    </FormItem>
                  )} />
                  <button type="submit" disabled={depositMutation.isPending}
                    className="w-full h-12 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                      boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}>
                    {depositMutation.isPending ? "Submitting..." : "Submit Deposit"}
                  </button>
                </form>
              </Form>
            </div>
          </div>
        )}

        {/* Withdraw Tab */}
        {activeTab === "withdraw" && (
          <div className="max-w-xl mx-auto animate-fade-in-up">
            <div className="rounded-2xl p-6 space-y-5"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="font-bold text-[#E2E8F0]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Withdraw Funds
              </h3>
              <Form {...withdrawForm}>
                <form onSubmit={withdrawForm.handleSubmit(onWithdraw)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={withdrawForm.control} name="coin" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#475569] text-xs font-mono uppercase tracking-wider">Receive In</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 font-mono">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USDT" className="font-mono">USDT (TRC20)</SelectItem>
                            <SelectItem value="BTC" className="font-mono">Bitcoin</SelectItem>
                            <SelectItem value="ETH" className="font-mono">Ethereum</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={withdrawForm.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#475569] text-xs font-mono uppercase tracking-wider">Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" className="tb-input h-12 pr-16 font-mono" {...field} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#475569] font-bold">USDT</span>
                          </div>
                        </FormControl>
                        <FormMessage className="text-[#EF4444] text-xs" />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={withdrawForm.control} name="walletAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#475569] text-xs font-mono uppercase tracking-wider">Destination Address</FormLabel>
                      <FormControl>
                        <Input className="tb-input h-12 font-mono text-xs" placeholder="Paste wallet address..." {...field} />
                      </FormControl>
                      <FormMessage className="text-[#EF4444] text-xs" />
                    </FormItem>
                  )} />

                  <div className="rounded-xl p-4 flex justify-between items-center text-sm font-mono"
                    style={{ background: "rgba(5,13,27,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-[#475569]">Processing Fee</span>
                    <span className="text-[#E2E8F0] font-bold">2.00 USDT</span>
                  </div>
                  {balance && investAmount > 0 && (
                    <div className="rounded-xl p-4 flex justify-between items-center text-sm font-mono"
                      style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                      <span className="text-[#475569]">You receive</span>
                      <span className="text-[#10B981] font-bold">{Math.max(0, investAmount - 2).toFixed(2)} USDT</span>
                    </div>
                  )}

                  <button type="submit" disabled={withdrawMutation.isPending}
                    className="w-full h-12 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                      boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}>
                    {withdrawMutation.isPending ? "Processing..." : "Request Withdrawal"}
                  </button>
                </form>
              </Form>
            </div>
          </div>
        )}

        {/* Ledger Tab */}
        {activeTab === "ledger" && (
          <div className="animate-fade-in-up space-y-3">
            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "deposits", "withdrawals", "deliveries", "guild"] as LedgerType[]).map(type => (
                <button key={type} onClick={() => setLedgerType(type)}
                  className="px-3.5 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider transition-all duration-200"
                  style={ledgerType === type ? {
                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                    color: "white",
                    boxShadow: "0 2px 8px rgba(37,99,235,0.3)"
                  } : {
                    background: "rgba(10,22,40,0.8)",
                    color: "#475569",
                    border: "1px solid rgba(255,255,255,0.06)"
                  }}>
                  {type}
                </button>
              ))}
            </div>

            {/* Transactions list - mobile-first cards instead of table */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {isLedgerLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 shimmer rounded-xl" />
                  ))}
                </div>
              ) : ledger?.length ? (
                <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
                  {ledger.map(entry => {
                    const color = typeColors[entry.type] || { bg: "rgba(59,130,246,0.1)", text: "#3B82F6" };
                    const status = statusConfig[entry.status] || { bg: "rgba(245,158,11,0.1)", text: "#F59E0B" };
                    const positive = isPositive(entry.type);
                    return (
                      <div key={entry.id} className="p-4 flex items-start gap-3 hover:bg-white/1 transition-colors">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: color.bg }}>
                          {positive
                            ? <ArrowDownToLine className="h-4 w-4" style={{ color: color.text }} />
                            : <ArrowUpFromLine className="h-4 w-4" style={{ color: color.text }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: color.bg, color: color.text }}>
                              {entry.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase"
                              style={{ background: status.bg, color: status.text }}>
                              {entry.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-sm text-[#94A3B8] truncate">{entry.description || "—"}</p>
                          {entry.txid && (
                            <p className="text-[10px] font-mono text-[#334155] truncate mt-0.5">{entry.txid}</p>
                          )}
                          <p className="text-[10px] font-mono text-[#334155] mt-1">
                            {format(parseISO(entry.createdAt), "MMM dd, yyyy · HH:mm")}
                          </p>
                        </div>
                        <div className={`text-sm font-bold font-mono whitespace-nowrap ${positive ? "text-[#10B981]" : "text-[#E2E8F0]"}`}>
                          {positive ? "+" : "−"}{entry.amount.toLocaleString()} USDT
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <History className="h-10 w-10 text-[#1E3A5F] mx-auto mb-3" />
                  <p className="text-[#334155] font-mono text-sm">No transactions yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
