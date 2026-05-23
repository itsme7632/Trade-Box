import { useState } from "react";
import { useGetBalance, useGetCryptoAddresses, useGetLedger, useSubmitDeposit, useSubmitWithdrawal } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, History, Copy, ExternalLink, Check, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

export default function Wallet() {
  const { data: balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useGetBalance();
  const { data: addresses } = useGetCryptoAddresses();
  const [ledgerType, setLedgerType] = useState<"all"|"deposits"|"withdrawals"|"deliveries"|"guild">("all");
  const { data: ledger, isLoading: isLedgerLoading } = useGetLedger({ type: ledgerType });
  const [copied, setCopied] = useState<string | null>(null);
  
  const depositMutation = useSubmitDeposit();
  const withdrawMutation = useSubmitWithdrawal();
  const { toast } = useToast();

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

  const depositForm = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: { coin: "USDT", amount: 100, txid: "" }
  });

  const withdrawForm = useForm<z.infer<typeof withdrawSchema>>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { coin: "USDT", amount: 50, walletAddress: "" }
  });

  const selectedDepositCoin = depositForm.watch("coin");
  const currentAddress = addresses?.find(a => a.coin === selectedDepositCoin);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const onDeposit = (data: z.infer<typeof depositSchema>) => {
    depositMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Deposit submitted", description: "Your deposit is pending review." });
        depositForm.reset();
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" })
    });
  };

  const onWithdraw = (data: z.infer<typeof withdrawSchema>) => {
    if (balance && data.amount > balance.balance) {
      toast({ title: "Insufficient funds", variant: "destructive" });
      return;
    }
    withdrawMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Withdrawal submitted", description: "Your withdrawal is being processed." });
        withdrawForm.reset();
        refetchBalance();
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" })
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0F1923] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        
        <div className="flex items-center gap-3">
          <WalletIcon className="h-8 w-8 text-[#0066FF]" />
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Wallet</h1>
            <p className="text-gray-400 font-mono text-sm">Manage your funds and transactions</p>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3 lg:col-span-1 bg-gradient-to-br from-[#1E293B] to-[#0F1923] p-6 rounded-2xl border border-[#0066FF]/30 shadow-[0_0_20px_rgba(0,102,255,0.1)]">
            <p className="text-gray-400 font-mono uppercase tracking-wider text-sm mb-2">Available Balance</p>
            {isBalanceLoading ? (
              <Skeleton className="h-12 w-48 bg-[#334155]" />
            ) : (
              <p className="text-4xl lg:text-5xl font-bold font-mono text-white">${balance?.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            )}
          </div>
          <div className="bg-[#1E293B] p-6 rounded-xl border border-[#334155]">
            <p className="text-gray-400 font-mono uppercase tracking-wider text-xs mb-2">Total Invested</p>
            {isBalanceLoading ? <Skeleton className="h-8 w-32 bg-[#334155]" /> : <p className="text-2xl font-bold font-mono">${balance?.totalInvested.toLocaleString()}</p>}
          </div>
          <div className="bg-[#1E293B] p-6 rounded-xl border border-[#334155]">
            <p className="text-gray-400 font-mono uppercase tracking-wider text-xs mb-2">Total Profits</p>
            {isBalanceLoading ? <Skeleton className="h-8 w-32 bg-[#334155]" /> : <p className="text-2xl font-bold font-mono text-[#22C55E]">+${balance?.totalProfits.toLocaleString()}</p>}
          </div>
        </div>

        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="bg-[#1E293B] border border-[#334155] w-full max-w-md p-1 h-auto mb-8">
            <TabsTrigger value="deposit" className="flex-1 py-3 font-mono uppercase text-xs data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">
              <ArrowDownToLine className="h-4 w-4 mr-2" /> Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="flex-1 py-3 font-mono uppercase text-xs data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">
              <ArrowUpFromLine className="h-4 w-4 mr-2" /> Withdraw
            </TabsTrigger>
            <TabsTrigger value="ledger" className="flex-1 py-3 font-mono uppercase text-xs data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">
              <History className="h-4 w-4 mr-2" /> Ledger
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#1E293B] p-6 rounded-xl border border-[#334155]">
                <h3 className="text-xl font-heading font-bold mb-6">1. Send Crypto</h3>
                <Form {...depositForm}>
                  <form className="space-y-6">
                    <FormField
                      control={depositForm.control}
                      name="coin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 font-mono text-xs uppercase">Select Coin</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-[#0F1923] border-[#334155] text-white h-12 font-bold">
                                <SelectValue placeholder="Select coin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
                              {addresses?.map(a => (
                                <SelectItem key={a.coin} value={a.coin}>{a.coin} ({a.network})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    {currentAddress && (
                      <div className="space-y-2">
                        <label className="text-gray-400 font-mono text-xs uppercase">Deposit Address ({currentAddress.network})</label>
                        <div className="flex bg-[#0F1923] border border-[#334155] rounded-md overflow-hidden">
                          <code className="flex-1 p-3 text-sm text-[#0066FF] break-all">{currentAddress.address}</code>
                          <button 
                            type="button"
                            onClick={() => copyToClipboard(currentAddress.address)}
                            className="bg-[#334155] hover:bg-[#475569] px-4 flex items-center justify-center transition-colors"
                          >
                            {copied === currentAddress.address ? <Check className="h-4 w-4 text-[#22C55E]" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-amber-500 font-mono mt-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Send ONLY {currentAddress.coin} via {currentAddress.network} to this address.
                        </p>
                      </div>
                    )}
                  </form>
                </Form>
              </div>

              <div className="bg-[#1E293B] p-6 rounded-xl border border-[#334155]">
                <h3 className="text-xl font-heading font-bold mb-6">2. Submit TXID</h3>
                <Form {...depositForm}>
                  <form onSubmit={depositForm.handleSubmit(onDeposit)} className="space-y-4">
                    <FormField
                      control={depositForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 font-mono text-xs uppercase">Amount Sent (USD Equivalent)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                              <Input type="number" className="pl-8 bg-[#0F1923] border-[#334155] h-12" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={depositForm.control}
                      name="txid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 font-mono text-xs uppercase">Transaction Hash / TXID</FormLabel>
                          <FormControl>
                            <Input className="bg-[#0F1923] border-[#334155] font-mono h-12" placeholder="0x..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full h-12 bg-[#0066FF] hover:bg-[#0052CC] font-heading text-lg mt-4" disabled={depositMutation.isPending}>
                      {depositMutation.isPending ? "Submitting..." : "Submit Deposit"}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="withdraw">
            <div className="max-w-2xl mx-auto bg-[#1E293B] p-6 rounded-xl border border-[#334155]">
              <h3 className="text-xl font-heading font-bold mb-6">Withdraw Funds</h3>
              <Form {...withdrawForm}>
                <form onSubmit={withdrawForm.handleSubmit(onWithdraw)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={withdrawForm.control}
                      name="coin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 font-mono text-xs uppercase">Receive In</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-[#0F1923] border-[#334155] h-12">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
                              <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                              <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                              <SelectItem value="ETH">Ethereum (ERC20)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={withdrawForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 font-mono text-xs uppercase">Amount (USD)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                              <Input type="number" className="pl-8 bg-[#0F1923] border-[#334155] h-12" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={withdrawForm.control}
                    name="walletAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400 font-mono text-xs uppercase">Destination Address</FormLabel>
                        <FormControl>
                          <Input className="bg-[#0F1923] border-[#334155] font-mono h-12" placeholder="Paste wallet address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-[#0F1923] p-4 rounded-lg border border-[#334155] flex justify-between items-center">
                    <span className="text-gray-400 font-mono text-sm">Processing Fee:</span>
                    <span className="text-white font-mono font-bold">$2.00</span>
                  </div>

                  <Button type="submit" className="w-full h-12 bg-[#0066FF] hover:bg-[#0052CC] font-heading text-lg" disabled={withdrawMutation.isPending}>
                    {withdrawMutation.isPending ? "Processing..." : "Request Withdrawal"}
                  </Button>
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="ledger">
            <div className="bg-[#1E293B] rounded-xl border border-[#334155] overflow-hidden">
              <div className="p-4 border-b border-[#334155] flex flex-wrap gap-2">
                {(["all", "deposits", "withdrawals", "deliveries", "guild"] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setLedgerType(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-colors ${
                      ledgerType === type ? "bg-[#0066FF] text-white" : "bg-[#0F1923] text-gray-400 hover:text-white border border-[#334155]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F1923] border-b border-[#334155] text-xs font-mono text-gray-400 uppercase">
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Type</th>
                      <th className="p-4 font-medium">Description</th>
                      <th className="p-4 font-medium text-right">Amount</th>
                      <th className="p-4 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {isLedgerLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}>
                          <td colSpan={5} className="p-4"><Skeleton className="h-6 w-full bg-[#334155]" /></td>
                        </tr>
                      ))
                    ) : ledger?.length ? (
                      ledger.map((entry) => (
                        <tr key={entry.id} className="hover:bg-[#0F1923] transition-colors">
                          <td className="p-4 text-sm font-mono whitespace-nowrap text-gray-300">{format(parseISO(entry.createdAt), 'MMM dd, yyyy HH:mm')}</td>
                          <td className="p-4">
                            <span className="text-xs font-mono uppercase bg-[#334155] px-2 py-1 rounded text-gray-200">
                              {entry.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-sm max-w-xs truncate" title={entry.description || ""}>
                            {entry.description || "-"}
                            {entry.txid && <span className="text-[#0066FF] text-xs ml-2 font-mono block truncate">{entry.txid}</span>}
                          </td>
                          <td className={`p-4 text-sm font-bold font-mono text-right whitespace-nowrap ${
                            ['deposit', 'delivery_profit', 'guild_commission'].includes(entry.type) ? "text-[#22C55E]" : "text-white"
                          }`}>
                            {['deposit', 'delivery_profit', 'guild_commission'].includes(entry.type) ? "+" : "-"}${entry.amount.toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`text-[10px] px-2 py-1 rounded font-mono uppercase tracking-wider border ${
                              entry.status === 'cleared' ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' :
                              entry.status === 'rejected' ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' :
                              'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
                            }`}>
                              {entry.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 font-mono text-sm">No transactions found</td>
                      </tr>
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
