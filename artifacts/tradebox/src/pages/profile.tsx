import { useState } from "react";
import { useGetProfile, useUpdateProfile, useSubmitKyc, useUpdateWalletAddresses } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Shield, Key, FileText, Smartphone, Link as LinkIcon, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { data: profile, isLoading, refetch } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const submitKyc = useSubmitKyc();
  const updateWallets = useUpdateWalletAddresses();
  const { toast } = useToast();

  const profileSchema = z.object({
    telegramHandle: z.string().optional(),
    whatsappNumber: z.string().optional(),
    twoFactorEnabled: z.boolean().optional(),
  });

  const kycSchema = z.object({
    idDocumentUrl: z.string().url("Must be a valid URL"),
    selfieUrl: z.string().url("Must be a valid URL"),
    proofOfAddressUrl: z.string().url("Must be a valid URL").optional(),
  });

  const walletSchema = z.object({
    btc: z.string().optional(),
    eth: z.string().optional(),
    usdt: z.string().optional(),
    bnb: z.string().optional(),
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      telegramHandle: profile?.telegramHandle || "",
      whatsappNumber: profile?.whatsappNumber || "",
      twoFactorEnabled: profile?.twoFactorEnabled || false,
    }
  });

  const kycForm = useForm<z.infer<typeof kycSchema>>({
    resolver: zodResolver(kycSchema),
    defaultValues: { idDocumentUrl: "", selfieUrl: "", proofOfAddressUrl: "" }
  });

  const walletForm = useForm<z.infer<typeof walletSchema>>({
    resolver: zodResolver(walletSchema),
    values: {
      btc: (profile?.walletAddresses as any)?.btc || "",
      eth: (profile?.walletAddresses as any)?.eth || "",
      usdt: (profile?.walletAddresses as any)?.usdt || "",
      bnb: (profile?.walletAddresses as any)?.bnb || "",
    }
  });

  const onUpdateProfile = (data: z.infer<typeof profileSchema>) => {
    updateProfile.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Profile Updated" });
        refetch();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const onSubmitKyc = (data: z.infer<typeof kycSchema>) => {
    submitKyc.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "KYC Submitted", description: "Documents are under review." });
        refetch();
        kycForm.reset();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const onUpdateWallets = (data: z.infer<typeof walletSchema>) => {
    updateWallets.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Wallets Updated" });
        refetch();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  if (isLoading) {
    return <div className="p-8 max-w-4xl mx-auto space-y-8"><Skeleton className="h-64 w-full bg-white border border-[#EEF2F8]" /></div>;
  }

  const kycStatusColors = {
    none: "bg-gray-100 text-[#6A82A0] border-[#DDE4EF]",
    pending: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
    approved: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20",
    rejected: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FB] text-[#0F1923] p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-[#0066FF] flex items-center justify-center text-xl font-bold text-white shadow-[0_0_15px_rgba(0,102,255,0.5)]">
            {profile?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">{profile?.traderId}</h1>
            <p className="text-[#6A82A0] font-mono text-sm">{profile?.email}</p>
          </div>
          <div className={`ml-auto px-3 py-1 rounded text-xs font-mono uppercase font-bold border flex items-center gap-1 ${kycStatusColors[profile?.kycStatus || 'none']}`}>
            {profile?.kycStatus === 'approved' ? <CheckCircle2 className="h-3 w-3" /> : 
             profile?.kycStatus === 'pending' ? <Clock className="h-3 w-3" /> : 
             profile?.kycStatus === 'rejected' ? <XCircle className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
            KYC {profile?.kycStatus}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#EEF2F8] shadow-sm">
            <p className="text-[10px] text-[#6A82A0] font-mono uppercase mb-1">Total Shipped</p>
            <p className="font-bold font-mono text-lg">{profile?.traderStats.totalShipped}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#EEF2F8] shadow-sm">
            <p className="text-[10px] text-[#6A82A0] font-mono uppercase mb-1">Total Profit</p>
            <p className="font-bold font-mono text-lg text-[#22C55E]">+{profile?.traderStats.totalProfit.toLocaleString()} USDT</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#EEF2F8] shadow-sm">
            <p className="text-[10px] text-[#6A82A0] font-mono uppercase mb-1">Active Cargo</p>
            <p className="font-bold font-mono text-lg">{profile?.traderStats.activeInvestments}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#EEF2F8] shadow-sm">
            <p className="text-[10px] text-[#6A82A0] font-mono uppercase mb-1">Countries</p>
            <p className="font-bold font-mono text-lg">{profile?.traderStats.countriesTraded}</p>
          </div>
        </div>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="bg-white border border-[#EEF2F8] p-1 h-auto mb-6 shadow-sm">
            <TabsTrigger value="settings" className="py-2.5 px-4 font-mono uppercase text-xs data-[state=active]:bg-[#0066FF] data-[state=active]:text-white text-[#6A82A0]">General</TabsTrigger>
            <TabsTrigger value="kyc" className="py-2.5 px-4 font-mono uppercase text-xs data-[state=active]:bg-[#0066FF] data-[state=active]:text-white text-[#6A82A0]">KYC Verification</TabsTrigger>
            <TabsTrigger value="wallets" className="py-2.5 px-4 font-mono uppercase text-xs data-[state=active]:bg-[#0066FF] data-[state=active]:text-white text-[#6A82A0]">Payout Wallets</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <div className="bg-white p-6 rounded-xl border border-[#EEF2F8] shadow-sm">
              <h3 className="text-xl font-heading font-bold mb-6 flex items-center gap-2 text-[#0F1923]"><User className="h-5 w-5 text-[#0066FF]" /> Account Settings</h3>
              
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="telegramHandle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#6A82A0] font-mono text-xs uppercase">Telegram Handle</FormLabel>
                          <FormControl>
                            <Input placeholder="@username" className="bg-[#F8FAFD] border-[#EEF2F8] text-[#0F1923]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="whatsappNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#6A82A0] font-mono text-xs uppercase">WhatsApp Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1234567890" className="bg-[#F8FAFD] border-[#EEF2F8] text-[#0F1923]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="border-t border-[#EEF2F8] pt-6">
                    <FormField
                      control={profileForm.control}
                      name="twoFactorEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#EEF2F8] bg-[#F8FAFD] p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-bold flex items-center gap-2 text-[#0F1923]">
                              <Key className="h-4 w-4 text-[#0066FF]" /> Two-Factor Authentication
                            </FormLabel>
                            <p className="text-xs text-[#6A82A0] font-mono">
                              Secure your account withdrawals with 2FA
                            </p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="bg-[#0066FF] hover:bg-[#0052CC] text-white" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="kyc">
            <div className="bg-white p-6 rounded-xl border border-[#EEF2F8] shadow-sm">
              <h3 className="text-xl font-heading font-bold mb-6 flex items-center gap-2 text-[#0F1923]"><Shield className="h-5 w-5 text-[#0066FF]" /> Identity Verification</h3>
              
              {profile?.kycStatus === 'approved' ? (
                <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 p-6 rounded-lg text-center">
                  <CheckCircle2 className="h-12 w-12 text-[#22C55E] mx-auto mb-3" />
                  <h4 className="text-lg font-bold text-[#22C55E]">Identity Verified</h4>
                  <p className="text-[#6A82A0] text-sm mt-2">Your account has full trading and withdrawal privileges.</p>
                </div>
              ) : profile?.kycStatus === 'pending' ? (
                <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 p-6 rounded-lg text-center">
                  <Clock className="h-12 w-12 text-[#F59E0B] mx-auto mb-3" />
                  <h4 className="text-lg font-bold text-[#F59E0B]">Verification Pending</h4>
                  <p className="text-[#6A82A0] text-sm mt-2">Our compliance team is reviewing your documents. This usually takes 24-48 hours.</p>
                </div>
              ) : (
                <Form {...kycForm}>
                  <form onSubmit={kycForm.handleSubmit(onSubmitKyc)} className="space-y-6">
                    {profile?.kycStatus === 'rejected' && (
                      <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 p-4 rounded-lg mb-6">
                        <p className="text-[#EF4444] text-sm font-bold flex items-center gap-2"><XCircle className="h-4 w-4" /> Previous submission rejected. Please provide clearer documents.</p>
                      </div>
                    )}
                    
                    <p className="text-[#6A82A0] text-sm mb-4">Provide URLs to your identity documents (hosted securely). KYC is required for withdrawals over 10,000 USDT.</p>
                    
                    <FormField
                      control={kycForm.control}
                      name="idDocumentUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#6A82A0] font-mono text-xs uppercase flex items-center gap-2"><FileText className="h-3 w-3" /> Government ID (Passport/License)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." className="bg-[#F8FAFD] border-[#EEF2F8] font-mono text-[#0F1923]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={kycForm.control}
                      name="selfieUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#6A82A0] font-mono text-xs uppercase flex items-center gap-2"><Smartphone className="h-3 w-3" /> Selfie holding ID</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." className="bg-[#F8FAFD] border-[#EEF2F8] font-mono text-[#0F1923]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={kycForm.control}
                      name="proofOfAddressUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#6A82A0] font-mono text-xs uppercase">Proof of Address (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." className="bg-[#F8FAFD] border-[#EEF2F8] font-mono text-[#0F1923]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="bg-[#0066FF] hover:bg-[#0052CC] text-white" disabled={submitKyc.isPending}>
                      {submitKyc.isPending ? "Submitting..." : "Submit Documents"}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </TabsContent>

          <TabsContent value="wallets">
            <div className="bg-white p-6 rounded-xl border border-[#EEF2F8] shadow-sm">
              <h3 className="text-xl font-heading font-bold mb-6 flex items-center gap-2 text-[#0F1923]"><LinkIcon className="h-5 w-5 text-[#0066FF]" /> Linked Payout Addresses</h3>
              <p className="text-[#6A82A0] text-sm mb-6">Link your external crypto wallets for automated profit payouts and withdrawals.</p>
              
              <Form {...walletForm}>
                <form onSubmit={walletForm.handleSubmit(onUpdateWallets)} className="space-y-4">
                  <FormField
                    control={walletForm.control}
                    name="usdt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#6A82A0] font-mono text-xs uppercase">USDT (TRC20)</FormLabel>
                        <FormControl>
                          <Input placeholder="T..." className="bg-[#F8FAFD] border-[#EEF2F8] font-mono text-[#0F1923]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={walletForm.control}
                    name="btc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#6A82A0] font-mono text-xs uppercase">Bitcoin (BTC)</FormLabel>
                        <FormControl>
                          <Input placeholder="1... or bc1..." className="bg-[#F8FAFD] border-[#EEF2F8] font-mono text-[#0F1923]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={walletForm.control}
                    name="eth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#6A82A0] font-mono text-xs uppercase">Ethereum (ERC20)</FormLabel>
                        <FormControl>
                          <Input placeholder="0x..." className="bg-[#F8FAFD] border-[#EEF2F8] font-mono text-[#0F1923]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="mt-6 bg-[#0066FF] hover:bg-[#0052CC] text-white" disabled={updateWallets.isPending}>
                    {updateWallets.isPending ? "Saving..." : "Save Addresses"}
                  </Button>
                </form>
              </Form>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
