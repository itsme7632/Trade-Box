import { useState } from "react";
import { useGetBalance, useGetCryptoAddresses, useGetLedger, useSubmitDeposit, useSubmitWithdrawal } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowDownToLine, ArrowUpFromLine, History, Copy, Check,
  AlertCircle, TrendingUp, Wallet as WalletIcon, CreditCard
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

const typeColor: Record<string, { text: string; bg: string }> = {
  deposit: { text: "#059669", bg: "#ecfdf5" },
  withdrawal: { text: "#dc2626", bg: "#fef2f2" },
  delivery_profit: { text: "#059669", bg: "#ecfdf5" },
  guild_commission: { text: "#7c3aed", bg: "#f5f3ff" },
  investment: { text: "#2563eb", bg: "#eff6ff" },
};

const statusColor: Record<string, { text: string; bg: string }> = {
  cleared: { text: "#059669", bg: "#ecfdf5" },
  rejected: { text: "#dc2626", bg: "#fef2f2" },
  pending: { text: "#d97706", bg: "#fffbeb" },
  pending_review: { text: "#d97706", bg: "#fffbeb" },
};

export default function Wallet() {
  const { data: balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useGetBalance();
  const { data: addresses } = useGetCryptoAddresses();
  const [ledgerType, setLedgerType] = useState<LedgerType>("all");
  const { data: ledger, isLoading: isLedgerLoading } = useGetLedger({ type: ledgerType });
  const [copied, setCopied] = useState<string | null>(null);
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

  const copyAddr = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Address copied" });
  };

  const onDeposit = (data: z.infer<typeof depositSchema>) => {
    depositMutation.mutate({ data }, {
      onSuccess: () => { toast({ title: "Deposit submitted", description: "Pending review." }); depositForm.reset(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const onWithdraw = (data: z.infer<typeof withdrawSchema>) => {
    if (balance && data.amount > balance.balance) { toast({ title: "Insufficient balance", variant: "destructive" }); return; }
    withdrawMutation.mutate({ data }, {
      onSuccess: () => { toast({ title: "Withdrawal submitted" }); withdrawForm.reset(); refetchBalance(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const tabs = [
    { id: "deposit" as const, label: "Deposit", icon: ArrowDownToLine },
    { id: "withdraw" as const, label: "Withdraw", icon: ArrowUpFromLine },
    { id: "history" as const, label: "History", icon: History },
  ];

  const isPositive = (t: string) => ["deposit", "delivery_profit", "guild_commission"].includes(t);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
      {/* Header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "20px 16px 16px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Wallet</h1>
        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Manage your funds</p>
      </div>

      <div style={{ padding: "16px", maxWidth: "860px", margin: "0 auto" }}>

        {/* Balance cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {/* Main balance - spans full */}
          <div style={{
            gridColumn: "1 / -1",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            borderRadius: "18px",
            padding: "22px",
            boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
            color: "white",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: "-30px", right: "-30px",
              width: "120px", height: "120px", borderRadius: "50%",
              background: "rgba(255,255,255,0.06)", pointerEvents: "none",
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <WalletIcon size={16} color="rgba(255,255,255,0.8)" />
              <span style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Available Balance
              </span>
            </div>
            {isBalanceLoading
              ? <div style={{ height: "48px", width: "200px", borderRadius: "8px", background: "rgba(255,255,255,0.15)" }} />
              : (
                <div style={{ fontSize: "36px", fontWeight: 800, color: "white", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {balance?.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span style={{ fontSize: "18px", fontWeight: 600, marginLeft: "6px", color: "rgba(255,255,255,0.75)" }}>USDT</span>
                </div>
              )
            }
          </div>
          {/* Sub-stats */}
          {[
            { label: "Total Invested", value: balance?.totalInvested, color: "#2563eb", icon: CreditCard },
            { label: "Total Profits", value: balance?.totalProfits, color: "#059669", icon: TrendingUp, prefix: "+" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "14px", padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
                <s.icon size={13} color={s.color} />
              </div>
              {isBalanceLoading ? <div className="shimmer" style={{ height: "24px", width: "80px" }} /> : (
                <div style={{ fontSize: "18px", fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {s.prefix}{(s.value || 0).toLocaleString()}
                  <span style={{ fontSize: "10px", fontWeight: 500, color: "#94a3b8", marginLeft: "4px" }}>USDT</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", padding: "4px", background: "#f1f5f9", borderRadius: "14px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "9px", borderRadius: "10px", border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: activeTab === tab.id ? 600 : 500,
              fontFamily: "'Inter', sans-serif",
              background: activeTab === tab.id ? "#ffffff" : "transparent",
              color: activeTab === tab.id ? "#2563eb" : "#64748b",
              boxShadow: activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}>
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Deposit Tab */}
        {activeTab === "deposit" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }} className="animate-fade-in-up">
            {/* Step 1 */}
            <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "white" }}>1</span>
                </div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Select Network & Copy Address
                </h3>
              </div>
              <Form {...depositForm}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <FormField control={depositForm.control} name="coin" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cryptocurrency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-11 tb-input"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {addresses?.map(a => <SelectItem key={a.coin} value={a.coin} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{a.coin} — {a.network}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  {currentAddress && (
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                        {currentAddress.coin} Address ({currentAddress.network})
                      </label>
                      <div style={{ display: "flex", overflow: "hidden", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "#f8fafc" }}>
                        <code style={{ flex: 1, padding: "12px", fontSize: "11px", color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all", lineHeight: 1.5 }}>
                          {currentAddress.address}
                        </code>
                        <button type="button" onClick={() => copyAddr(currentAddress.address)} style={{
                          padding: "0 14px", background: "#f1f5f9", border: "none",
                          borderLeft: "1px solid #e2e8f0", cursor: "pointer", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {copied === currentAddress.address
                            ? <Check size={15} color="#059669" />
                            : <Copy size={15} color="#94a3b8" />}
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px", padding: "10px 12px", borderRadius: "10px", background: "#fffbeb", border: "1px solid #fde68a" }}>
                        <AlertCircle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: "1px" }} />
                        <p style={{ margin: 0, fontSize: "11px", color: "#d97706", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                          Send ONLY {currentAddress.coin} via {currentAddress.network}. Wrong network = permanent loss.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Form>
            </div>

            {/* Step 2 */}
            <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "white" }}>2</span>
                </div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Confirm Transaction
                </h3>
              </div>
              <Form {...depositForm}>
                <form onSubmit={depositForm.handleSubmit(onDeposit)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <FormField control={depositForm.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Amount Sent (USDT equiv.)</FormLabel>
                      <FormControl>
                        <div style={{ position: "relative" }}>
                          <Input type="number" className="tb-input h-11" style={{ paddingRight: "56px" }} {...field} />
                          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", fontWeight: 700, color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>USDT</span>
                        </div>
                      </FormControl>
                      <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                    </FormItem>
                  )} />
                  <FormField control={depositForm.control} name="txid" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Transaction Hash (TXID)</FormLabel>
                      <FormControl>
                        <Input className="tb-input h-11" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }} placeholder="0x... or blockchain txid" {...field} />
                      </FormControl>
                      <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                    </FormItem>
                  )} />
                  <button type="submit" disabled={depositMutation.isPending} style={{
                    height: "44px", borderRadius: "12px", background: "#2563eb", color: "white",
                    border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxShadow: "0 4px 12px rgba(37,99,235,0.3)", opacity: depositMutation.isPending ? 0.6 : 1,
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
          <div style={{ maxWidth: "480px" }} className="animate-fade-in-up">
            <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <h3 style={{ margin: "0 0 18px", fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Withdraw Funds</h3>
              <Form {...withdrawForm}>
                <form onSubmit={withdrawForm.handleSubmit(onWithdraw)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <FormField control={withdrawForm.control} name="coin" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Receive In</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11 tb-input"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                            <SelectItem value="BTC">Bitcoin</SelectItem>
                            <SelectItem value="ETH">Ethereum</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={withdrawForm.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Amount</FormLabel>
                        <FormControl>
                          <div style={{ position: "relative" }}>
                            <Input type="number" className="tb-input h-11" style={{ paddingRight: "50px" }} {...field} />
                            <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "10px", fontWeight: 700, color: "#64748b" }}>USDT</span>
                          </div>
                        </FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={withdrawForm.control} name="walletAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Destination Address</FormLabel>
                      <FormControl>
                        <Input className="tb-input h-11" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }} placeholder="Paste wallet address..." {...field} />
                      </FormControl>
                      <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                    </FormItem>
                  )} />

                  {[
                    { label: "Processing Fee", value: "2.00 USDT" },
                    ...(withdrawAmount > 0 ? [{ label: "You Receive", value: `${Math.max(0, withdrawAmount - 2).toFixed(2)} USDT`, green: true }] : [])
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e8edf2" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{row.label}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: (row as any).green ? "#059669" : "#0f172a", fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</span>
                    </div>
                  ))}

                  <button type="submit" disabled={withdrawMutation.isPending} style={{
                    height: "44px", borderRadius: "12px", background: "#2563eb", color: "white",
                    border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxShadow: "0 4px 12px rgba(37,99,235,0.3)", opacity: withdrawMutation.isPending ? 0.6 : 1,
                  }}>
                    {withdrawMutation.isPending ? "Processing..." : "Request Withdrawal"}
                  </button>
                </form>
              </Form>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Filter pills */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {(["all", "deposits", "withdrawals", "deliveries", "guild"] as LedgerType[]).map(type => (
                <button key={type} onClick={() => setLedgerType(type)} style={{
                  padding: "5px 14px", borderRadius: "20px", cursor: "pointer",
                  fontSize: "11px", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace",
                  textTransform: "capitalize",
                  background: ledgerType === type ? "#2563eb" : "#ffffff",
                  color: ledgerType === type ? "white" : "#64748b",
                  boxShadow: ledgerType === type ? "0 2px 8px rgba(37,99,235,0.3)" : "0 1px 3px rgba(0,0,0,0.08)",
                  border: `1px solid ${ledgerType === type ? "#2563eb" : "#e2e8f0"}`,
                  transition: "all 0.15s ease",
                }}>
                  {type}
                </button>
              ))}
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              {isLedgerLoading ? (
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[...Array(5)].map((_, i) => <S key={i} h={60} />)}
                </div>
              ) : ledger?.length ? (
                <div>
                  {ledger.map((entry, idx) => {
                    const tc = typeColor[entry.type] || { text: "#2563eb", bg: "#eff6ff" };
                    const sc = statusColor[entry.status] || { text: "#d97706", bg: "#fffbeb" };
                    const positive = isPositive(entry.type);
                    return (
                      <div key={entry.id} style={{
                        display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px",
                        borderBottom: idx < ledger.length - 1 ? "1px solid #f1f5f9" : "none",
                      }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {positive
                            ? <ArrowDownToLine size={16} color={tc.text} />
                            : <ArrowUpFromLine size={16} color={tc.text} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
                            <span style={{ padding: "1px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", background: tc.bg, color: tc.text }}>
                              {entry.type.replace(/_/g, " ")}
                            </span>
                            <span style={{ padding: "1px 7px", borderRadius: "20px", fontSize: "9px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", background: sc.bg, color: sc.text }}>
                              {entry.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {entry.description || "—"}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                            {format(parseISO(entry.createdAt), "MMM dd, yyyy · HH:mm")}
                          </p>
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: positive ? "#059669" : "#0f172a", flexShrink: 0 }}>
                          {positive ? "+" : "−"}{entry.amount.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <History size={32} color="#cbd5e1" style={{ marginBottom: "10px" }} />
                  <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>No transactions yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
