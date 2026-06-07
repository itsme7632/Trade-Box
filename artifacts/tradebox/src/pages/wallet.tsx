import { useState } from "react";
import { useGetBalance, useGetCryptoAddresses, useGetLedger, useSubmitDeposit, useSubmitWithdrawal } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowDownToLine, ArrowUpFromLine, History, Copy, Check,
  AlertCircle, TrendingUp, Wallet as WalletIcon, CreditCard,
  QrCode, Info, Clock, Shield, ChevronRight, DollarSign, ArrowUpRight
} from "lucide-react";
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

function S({ h = 60, r = 10 }: { h?: number; r?: number }) {
  return <div className="shimmer" style={{ height: h, borderRadius: r }} />;
}

const typeColor: Record<string, { text: string; bg: string; sign: string }> = {
  deposit:         { text: "#059669", bg: "#ecfdf5", sign: "+" },
  withdrawal:      { text: "#dc2626", bg: "#fef2f2", sign: "-" },
  delivery_profit: { text: "#059669", bg: "#ecfdf5", sign: "+" },
  guild_commission:{ text: "#7c3aed", bg: "#f5f3ff", sign: "+" },
  investment:      { text: "#2563eb", bg: "#eff6ff", sign: "-" },
};

const statusConfig: Record<string, { text: string; bg: string; label: string }> = {
  cleared:        { text: "#059669", bg: "#ecfdf5", label: "Cleared"  },
  rejected:       { text: "#dc2626", bg: "#fef2f2", label: "Rejected" },
  pending:        { text: "#d97706", bg: "#fffbeb", label: "Pending"  },
  pending_review: { text: "#d97706", bg: "#fffbeb", label: "Review"   },
  reviewing:      { text: "#0891b2", bg: "#ecfeff", label: "Reviewing"},
  in_transit:     { text: "#0891b2", bg: "#ecfeff", label: "Transit"  },
};

const networkIcon: Record<string, { emoji: string; color: string }> = {
  USDT: { emoji: "💚", color: "#26a17b" },
  BTC:  { emoji: "🟠", color: "#f7931a" },
  ETH:  { emoji: "🔷", color: "#627eea" },
  BNB:  { emoji: "🟡", color: "#f3ba2f" },
  TRX:  { emoji: "🔴", color: "#eb0029" },
};

function QRCodeDisplay({ address, coin }: { address: string; coin: string }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(address)}&bgcolor=ffffff&color=0f172a&margin=8`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "16px", background: "var(--tb-bg-subtle)", border: "1px solid var(--tb-border)", borderRadius: "14px" }}>
      <div style={{ width: "180px", height: "180px", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", background: "white" }}>
        <img src={url} alt={`QR for ${coin}`} width={180} height={180} style={{ display: "block" }} />
      </div>
      <p style={{ margin: 0, fontSize: "11px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>
        Scan to send {coin}
      </p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, prefix = "" }: { icon: any; label: string; value: number; color: string; prefix?: string }) {
  return (
    <div style={{ background: "var(--tb-bg-card)", border: "1px solid var(--tb-border)", borderRadius: "14px", padding: "14px", boxShadow: "var(--tb-shadow-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "9px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <Icon size={13} color={color} />
      </div>
      <div style={{ fontSize: "17px", fontWeight: 700, color, fontFamily: "'Space Grotesk', sans-serif" }}>
        {prefix}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--tb-text-muted)", marginLeft: "4px" }}>USDT</span>
      </div>
    </div>
  );
}

export default function Wallet() {
  const { data: balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useGetBalance();
  const { data: addresses } = useGetCryptoAddresses();
  const [ledgerType, setLedgerType] = useState<LedgerType>("all");
  const { data: ledger, isLoading: isLedgerLoading } = useGetLedger({ type: ledgerType });
  const [copied, setCopied] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "history">("deposit");
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
  const withdrawAmount = withdrawForm.watch("amount") || 0;
  const fee = +(withdrawAmount * 0.01).toFixed(2);
  const youGet = Math.max(0, withdrawAmount - fee);

  const copyAddr = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2500);
    toast({ title: "✓ Address copied to clipboard" });
  };

  const onDeposit = (data: z.infer<typeof depositSchema>) => {
    depositMutation.mutate({ data }, {
      onSuccess: () => { toast({ title: "Deposit submitted", description: "Our team will review your deposit within 24 hours." }); depositForm.reset(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const onWithdraw = (data: z.infer<typeof withdrawSchema>) => {
    if (balance && data.amount > balance.balance) { toast({ title: "Insufficient balance", variant: "destructive" }); return; }
    withdrawMutation.mutate({ data }, {
      onSuccess: () => { toast({ title: "Withdrawal submitted", description: "Processing within 1-3 business days." }); withdrawForm.reset(); refetchBalance(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const tabs = [
    { id: "deposit"  as const, label: "Deposit",  icon: ArrowDownToLine },
    { id: "withdraw" as const, label: "Withdraw", icon: ArrowUpFromLine },
    { id: "history"  as const, label: "History",  icon: History },
  ];

  const isPositive = (t: string) => ["deposit", "delivery_profit", "guild_commission"].includes(t);

  return (
    <div style={{ minHeight: "100vh", background: "var(--tb-bg-page)" }}>
      {/* Header */}
      <div style={{ background: "var(--tb-header)", borderBottom: "1px solid var(--tb-border)", padding: "20px 16px 16px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Wallet</h1>
        <p style={{ margin: "2px 0 0", fontSize: "10px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Manage your funds</p>
      </div>

      <div style={{ padding: "16px", maxWidth: "860px", margin: "0 auto" }}>

        {/* Hero balance card */}
        <div style={{ background: "linear-gradient(135deg, #1d4ed8, #1e40af)", borderRadius: "20px", padding: "22px", boxShadow: "0 6px 24px rgba(29,78,216,0.35)", color: "white", position: "relative", overflow: "hidden", marginBottom: "12px" }}>
          <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "150px", height: "150px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "-20px", left: "40%", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <WalletIcon size={14} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>Available Balance</span>
          </div>
          {isBalanceLoading
            ? <div style={{ height: "48px", width: "200px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", marginBottom: "16px" }} />
            : <div style={{ fontSize: "38px", fontWeight: 800, color: "white", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: "16px" }}>
                {balance?.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span style={{ fontSize: "18px", fontWeight: 600, marginLeft: "6px", color: "rgba(255,255,255,0.75)" }}>USDT</span>
              </div>
          }
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setActiveTab("deposit")} style={{ flex: 1, height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
              <ArrowDownToLine size={13} /> Deposit
            </button>
            <button onClick={() => setActiveTab("withdraw")} style={{ flex: 1, height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
              <ArrowUpFromLine size={13} /> Withdraw
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="tb-grid-2" style={{ marginBottom: "16px" }}>
          {isBalanceLoading ? (
            <><S h={80} /><S h={80} /><S h={80} /><S h={80} /></>
          ) : (
            <>
              <SummaryCard icon={CreditCard}    label="Invested"       value={balance?.totalInvested ?? 0}   color="#2563eb" />
              <SummaryCard icon={TrendingUp}    label="Total Profits"  value={balance?.totalProfits ?? 0}    color="#059669" prefix="+" />
              <SummaryCard icon={ArrowDownToLine} label="Total Deposited" value={balance?.totalDeposited ?? 0} color="#0891b2" />
              <SummaryCard icon={ArrowUpFromLine} label="Total Withdrawn" value={balance?.totalWithdrawn ?? 0} color="#d97706" />
            </>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", padding: "4px", background: "var(--tb-bg-muted)", borderRadius: "14px", border: "1px solid var(--tb-border-muted)", marginBottom: "16px" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "9px", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: activeTab === tab.id ? 600 : 500, fontFamily: "'Inter', sans-serif", background: activeTab === tab.id ? "var(--tb-bg-card)" : "transparent", color: activeTab === tab.id ? "#2563eb" : "var(--tb-text-faint)", boxShadow: activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s ease" }}>
              <tab.icon size={14} />{tab.label}
            </button>
          ))}
        </div>

        {/* ── DEPOSIT TAB ── */}
        {activeTab === "deposit" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }} className="animate-fade-in-up">

            {/* Step 1 — Select network */}
            <div style={{ background: "var(--tb-bg-card)", border: "1px solid var(--tb-border)", borderRadius: "16px", padding: "20px", boxShadow: "var(--tb-shadow-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "white" }}>1</span>
                </div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Select Network & Copy Address</h3>
              </div>
              <Form {...depositForm}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <FormField control={depositForm.control} name="coin" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: "11px", color: "var(--tb-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Network</FormLabel>
                      <Select onValueChange={(v) => { field.onChange(v); setShowQr(false); }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 tb-input">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {addresses?.map(a => {
                            const net = networkIcon[a.coin] || { emoji: "🔗", color: "#64748b" };
                            return (
                              <SelectItem key={a.coin} value={a.coin} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {net.emoji} {a.coin} — {a.network}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  {currentAddress && (
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "var(--tb-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                        {currentAddress.coin} Deposit Address
                      </label>
                      {/* Address + copy */}
                      <div style={{ display: "flex", overflow: "hidden", borderRadius: "10px", border: `1.5px solid var(--tb-border-muted)`, background: "var(--tb-bg-subtle)" }}>
                        <code style={{ flex: 1, padding: "12px", fontSize: "11px", color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all", lineHeight: 1.5 }}>
                          {currentAddress.address}
                        </code>
                        <button type="button" onClick={() => copyAddr(currentAddress.address)} style={{ padding: "0 14px", background: "var(--tb-bg-muted)", border: "none", borderLeft: "1px solid var(--tb-border)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", flexDirection: "column" }}>
                          {copied === currentAddress.address
                            ? <><Check size={15} color="#059669" /><span style={{ fontSize: "8px", color: "#059669", fontFamily: "'JetBrains Mono', monospace" }}>Copied!</span></>
                            : <><Copy size={15} color="var(--tb-text-muted)" /><span style={{ fontSize: "8px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>Copy</span></>
                          }
                        </button>
                      </div>

                      {/* QR toggle */}
                      <button type="button" onClick={() => setShowQr(v => !v)} style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", padding: "7px 12px", borderRadius: "9px", background: "var(--tb-bg-muted)", border: "1px solid var(--tb-border)", fontSize: "12px", fontWeight: 600, color: "var(--tb-text-secondary)", cursor: "pointer" }}>
                        <QrCode size={13} /> {showQr ? "Hide QR Code" : "Show QR Code"}
                      </button>

                      {showQr && <div style={{ marginTop: "10px" }}><QRCodeDisplay address={currentAddress.address} coin={currentAddress.coin} /></div>}

                      {/* Network warnings */}
                      <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", gap: "8px", padding: "10px 12px", borderRadius: "10px", background: "#fffbeb", border: "1px solid #fde68a" }}>
                          <AlertCircle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: "1px" }} />
                          <p style={{ margin: 0, fontSize: "11px", color: "#92400e", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                            Send ONLY <strong>{currentAddress.coin}</strong> via <strong>{currentAddress.network}</strong>. Wrong network = permanent loss.
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "8px", padding: "10px 12px", borderRadius: "10px", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                          <Info size={14} color="#2563eb" style={{ flexShrink: 0, marginTop: "1px" }} />
                          <p style={{ margin: 0, fontSize: "11px", color: "#1e40af", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                            Minimum deposit: <strong>10 USDT</strong>. Credited after 1–3 network confirmations.
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "8px", padding: "10px 12px", borderRadius: "10px", background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                          <Shield size={14} color="#059669" style={{ flexShrink: 0, marginTop: "1px" }} />
                          <p style={{ margin: 0, fontSize: "11px", color: "#065f46", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                            After sending, submit your TXID below. Admin review within 24 hours.
                          </p>
                        </div>
                      </div>

                      {/* Deposit timeline */}
                      <div style={{ marginTop: "14px", padding: "14px", background: "var(--tb-bg-subtle)", border: "1px solid var(--tb-border)", borderRadius: "12px" }}>
                        <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Deposit Timeline</p>
                        {[
                          { step: "1", label: "Send crypto",     sub: "From your wallet",           color: "#059669" },
                          { step: "2", label: "Submit TXID",     sub: "Paste hash below",           color: "#2563eb" },
                          { step: "3", label: "Admin review",    sub: "Within 24 hours",            color: "#d97706" },
                          { step: "4", label: "Balance credited", sub: "Ready to invest",           color: "#7c3aed" },
                        ].map((s, i, arr) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", paddingBottom: i < arr.length - 1 ? "10px" : 0, marginBottom: i < arr.length - 1 ? 0 : 0 }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: `${s.color}18`, border: `1.5px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: "9px", fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.step}</span>
                              </div>
                              {i < arr.length - 1 && <div style={{ width: "1px", flex: 1, background: "var(--tb-border)", minHeight: "16px", marginTop: "3px" }} />}
                            </div>
                            <div style={{ paddingTop: "2px" }}>
                              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--tb-text-primary)" }}>{s.label}</p>
                              <p style={{ margin: "1px 0 0", fontSize: "10px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{s.sub}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Form>
            </div>

            {/* Step 2 — Confirm transaction */}
            <div style={{ background: "var(--tb-bg-card)", border: "1px solid var(--tb-border)", borderRadius: "16px", padding: "20px", boxShadow: "var(--tb-shadow-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "white" }}>2</span>
                </div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Confirm Transaction</h3>
              </div>
              <Form {...depositForm}>
                <form onSubmit={depositForm.handleSubmit(onDeposit)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <FormField control={depositForm.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: "11px", color: "var(--tb-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Amount Sent (USDT equiv.)</FormLabel>
                      <FormControl>
                        <div style={{ position: "relative" }}>
                          <Input type="number" className="tb-input h-11" style={{ paddingRight: "56px" }} {...field} />
                          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", fontWeight: 700, color: "var(--tb-text-faint)", fontFamily: "'JetBrains Mono', monospace" }}>USDT</span>
                        </div>
                      </FormControl>
                      <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                    </FormItem>
                  )} />
                  <FormField control={depositForm.control} name="txid" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: "11px", color: "var(--tb-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Transaction Hash (TXID)</FormLabel>
                      <FormControl>
                        <Input className="tb-input h-11" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }} placeholder="0x... or blockchain TXID" {...field} />
                      </FormControl>
                      <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                    </FormItem>
                  )} />
                  <button type="submit" disabled={depositMutation.isPending} style={{ height: "44px", borderRadius: "12px", background: "#2563eb", color: "white", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 4px 12px rgba(37,99,235,0.3)", opacity: depositMutation.isPending ? 0.6 : 1 }}>
                    {depositMutation.isPending ? "Submitting..." : "Submit Deposit →"}
                  </button>
                </form>
              </Form>
            </div>
          </div>
        )}

        {/* ── WITHDRAW TAB ── */}
        {activeTab === "withdraw" && (
          <div className="animate-fade-in-up">
            <div style={{ background: "var(--tb-bg-card)", border: "1px solid var(--tb-border)", borderRadius: "16px", padding: "20px", boxShadow: "var(--tb-shadow-sm)", marginBottom: "12px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "var(--tb-text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>Withdraw Funds</h3>

              {/* Available balance */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: "12px", background: "#eff6ff", border: "1px solid #bfdbfe", marginBottom: "16px" }}>
                <span style={{ fontSize: "12px", color: "#1e40af", fontFamily: "'JetBrains Mono', monospace" }}>Available</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e40af", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {(balance?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </span>
              </div>

              <Form {...withdrawForm}>
                <form onSubmit={withdrawForm.handleSubmit(onWithdraw)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <FormField control={withdrawForm.control} name="coin" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: "11px", color: "var(--tb-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Network</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11 tb-input"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {addresses?.map(a => <SelectItem key={a.coin} value={a.coin} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{a.coin}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={withdrawForm.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: "11px", color: "var(--tb-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Amount (USDT)</FormLabel>
                        <FormControl>
                          <div style={{ position: "relative" }}>
                            <Input type="number" className="tb-input h-11" style={{ paddingRight: "50px" }} {...field} />
                            <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "10px", fontWeight: 700, color: "var(--tb-text-faint)", fontFamily: "'JetBrains Mono', monospace" }}>USDT</span>
                          </div>
                        </FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={withdrawForm.control} name="walletAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: "11px", color: "var(--tb-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Wallet Address</FormLabel>
                      <FormControl>
                        <Input className="tb-input h-11" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }} placeholder="Your destination wallet address" {...field} />
                      </FormControl>
                      <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                    </FormItem>
                  )} />

                  {/* Fee breakdown */}
                  {withdrawAmount > 0 && (
                    <div style={{ padding: "12px 14px", borderRadius: "12px", background: "var(--tb-bg-subtle)", border: "1px solid var(--tb-border)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[
                          { label: "You send",   value: withdrawAmount,       color: "var(--tb-text-primary)" },
                          { label: "Fee (1%)",   value: fee,                  color: "#dc2626"  },
                          { label: "You receive",value: youGet,               color: "#059669"  },
                        ].map((r, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: i === 2 ? "6px" : 0, borderTop: i === 2 ? "1px solid var(--tb-border)" : "none" }}>
                            <span style={{ fontSize: "12px", color: "var(--tb-text-faint)", fontFamily: "'JetBrains Mono', monospace" }}>{r.label}</span>
                            <span style={{ fontSize: "12px", fontWeight: i === 2 ? 700 : 500, color: r.color, fontFamily: "'JetBrains Mono', monospace" }}>
                              {r.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px", padding: "10px 12px", borderRadius: "10px", background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <Clock size={13} color="#d97706" style={{ flexShrink: 0, marginTop: "1px" }} />
                    <p style={{ margin: 0, fontSize: "11px", color: "#92400e", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                      Withdrawals are processed within 1–3 business days. Min: 50 USDT.
                    </p>
                  </div>

                  <button type="submit" disabled={withdrawMutation.isPending} style={{ height: "44px", borderRadius: "12px", background: "#dc2626", color: "white", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 4px 12px rgba(220,38,38,0.25)", opacity: withdrawMutation.isPending ? 0.6 : 1 }}>
                    {withdrawMutation.isPending ? "Processing..." : "Request Withdrawal →"}
                  </button>
                </form>
              </Form>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <div className="animate-fade-in-up">
            {/* Filter pills */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", marginBottom: "14px", msOverflowStyle: "none", scrollbarWidth: "none" }}>
              {(["all", "deposits", "withdrawals", "deliveries", "guild"] as const).map(t => (
                <button key={t} onClick={() => setLedgerType(t)} style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, border: ledgerType === t ? "1.5px solid #2563eb" : "1.5px solid var(--tb-border)", background: ledgerType === t ? "#2563eb" : "var(--tb-bg-card)", color: ledgerType === t ? "white" : "var(--tb-text-faint)", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s" }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ background: "var(--tb-bg-card)", border: "1px solid var(--tb-border)", borderRadius: "16px", overflow: "hidden", boxShadow: "var(--tb-shadow-sm)" }}>
              {isLedgerLoading ? (
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[...Array(5)].map((_, i) => <S key={i} h={60} />)}
                </div>
              ) : ledger?.length ? (
                ledger.map((tx, idx) => {
                  const tCfg = typeColor[tx.type] || { text: "#64748b", bg: "#f1f5f9", sign: "" };
                  const sCfg = statusConfig[tx.status] || { text: "#94a3b8", bg: "#f8fafc", label: tx.status };
                  return (
                    <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderBottom: idx < ledger.length - 1 ? "1px solid var(--tb-border-subtle)" : "none" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: tCfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isPositive(tx.type) ? <ArrowDownToLine size={15} color={tCfg.text} /> : <ArrowUpFromLine size={15} color={tCfg.text} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--tb-text-primary)", textTransform: "capitalize" }}>{tx.type.replace(/_/g, " ")}</p>
                          <span style={{ padding: "1px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, color: sCfg.text, background: sCfg.bg, fontFamily: "'JetBrains Mono', monospace" }}>{sCfg.label}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "10px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {tx.coin && <span style={{ marginRight: "6px" }}>{tx.coin}</span>}
                          {format(parseISO(tx.createdAt), "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: tCfg.text, fontFamily: "'JetBrains Mono', monospace" }}>
                          {tCfg.sign}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: "9px", color: "var(--tb-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>USDT</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <History size={28} color="var(--tb-text-muted)" style={{ marginBottom: "10px" }} />
                  <p style={{ margin: 0, color: "var(--tb-text-muted)", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>No transactions found.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
