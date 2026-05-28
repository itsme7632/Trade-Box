import { useState } from "react";
import { useGetProfile, useUpdateProfile, useSubmitKyc, useUpdateWalletAddresses } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Shield, Key, FileText, Smartphone, CheckCircle2, XCircle, Clock, LogOut, TrendingUp, Ship, Globe, Settings } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-context";

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

type Tab = "account" | "kyc" | "wallets";

export default function ProfilePage() {
  const { data: profile, isLoading, refetch } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const submitKyc = useSubmitKyc();
  const updateWallets = useUpdateWalletAddresses();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("account");

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
      onSuccess: () => { toast({ title: "Profile saved" }); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const onSubmitKyc = (data: z.infer<typeof kycSchema>) => {
    submitKyc.mutate({ data }, {
      onSuccess: () => { toast({ title: "KYC Submitted", description: "Pending review (24–48h)." }); refetch(); kycForm.reset(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const onUpdateWallets = (data: z.infer<typeof walletSchema>) => {
    updateWallets.mutate({ data }, {
      onSuccess: () => { toast({ title: "Wallets updated" }); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const kycStatus = profile?.kycStatus || "none";
  const kycConfig = {
    approved: { color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", icon: CheckCircle2, label: "Verified" },
    pending: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)", icon: Clock, label: "Pending" },
    rejected: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)", icon: XCircle, label: "Rejected" },
    none: { color: "#475569", bg: "rgba(71,85,105,0.1)", border: "rgba(71,85,105,0.2)", icon: Shield, label: "Unverified" },
  };
  const kyc = kycConfig[kycStatus as keyof typeof kycConfig] || kycConfig.none;
  const KycIcon = kyc.icon;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "account", label: "Account", icon: Settings },
    { id: "kyc", label: "KYC", icon: Shield },
    { id: "wallets", label: "Wallets", icon: Key },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050D1B] p-4 md:p-8 space-y-4">
        <div className="h-28 shimmer rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 shimmer rounded-2xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050D1B]">
      {/* Profile Hero */}
      <div className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(37,99,235,0.1) 0%, rgba(5,13,27,0) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.05)"
        }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.12) 0%, transparent 60%)" }} />
        <div className="px-4 pt-6 pb-6 md:px-8 relative z-10">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                boxShadow: "0 0 30px rgba(37,99,235,0.4)"
              }}>
              {profile?.email?.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
                    {profile?.traderId}
                  </h1>
                  <p className="text-sm text-[#475569] font-mono mt-0.5 truncate">{profile?.email}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono shrink-0"
                  style={{ background: kyc.bg, color: kyc.color, border: `1px solid ${kyc.border}` }}>
                  <KycIcon className="h-3 w-3" />
                  KYC {kyc.label}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-8 space-y-5 mt-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Shipped", value: profile?.traderStats.totalShipped ?? 0, icon: Ship, color: "#3B82F6" },
            { label: "Total Profit", value: `+${(profile?.traderStats.totalProfit ?? 0).toLocaleString()}`, icon: TrendingUp, color: "#10B981", suffix: " USDT" },
            { label: "Active Cargo", value: profile?.traderStats.activeInvestments ?? 0, icon: Settings, color: "#F59E0B" },
            { label: "Countries", value: profile?.traderStats.countriesTraded ?? 0, icon: Globe, color: "#8B5CF6" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4 flex flex-col gap-2"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#334155] uppercase tracking-wider">{s.label}</span>
                <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
              </div>
              <div className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: s.color }}>
                {s.value}{s.suffix}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl"
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
              {tab.label}
            </button>
          ))}
        </div>

        {/* Account Tab */}
        {activeTab === "account" && (
          <div className="rounded-2xl p-6 space-y-6 animate-fade-in-up"
            style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="font-bold text-[#E2E8F0] flex items-center gap-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <User className="h-4 w-4 text-[#3B82F6]" /> Account Settings
            </h3>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={profileForm.control} name="telegramHandle" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#475569] text-xs font-mono uppercase tracking-wider">Telegram Handle</FormLabel>
                      <FormControl>
                        <Input placeholder="@username" className="tb-input h-11" {...field} />
                      </FormControl>
                      <FormMessage className="text-[#EF4444] text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="whatsappNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#475569] text-xs font-mono uppercase tracking-wider">WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" className="tb-input h-11" {...field} />
                      </FormControl>
                      <FormMessage className="text-[#EF4444] text-xs" />
                    </FormItem>
                  )} />
                </div>

                <FormField control={profileForm.control} name="twoFactorEnabled" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: "rgba(5,13,27,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Key className="h-3.5 w-3.5 text-[#3B82F6]" />
                          <span className="text-sm font-semibold text-[#E2E8F0]">Two-Factor Authentication</span>
                        </div>
                        <p className="text-xs text-[#475569] font-mono">Secure your account withdrawals with 2FA</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )} />

                <button type="submit" disabled={updateProfile.isPending}
                  className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                    boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </Form>

            {/* Logout */}
            <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button onClick={logout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#EF4444] transition-colors hover:bg-red-500/8">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* KYC Tab */}
        {activeTab === "kyc" && (
          <div className="rounded-2xl p-6 space-y-5 animate-fade-in-up"
            style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="font-bold text-[#E2E8F0] flex items-center gap-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Shield className="h-4 w-4 text-[#3B82F6]" /> Identity Verification
            </h3>

            {kycStatus === "approved" ? (
              <div className="rounded-xl p-8 flex flex-col items-center text-center"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <CheckCircle2 className="h-12 w-12 text-[#10B981] mb-3" />
                <h4 className="text-lg font-bold text-[#10B981] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Identity Verified</h4>
                <p className="text-sm text-[#475569] font-mono">Your account has full trading and withdrawal privileges.</p>
              </div>
            ) : kycStatus === "pending" ? (
              <div className="rounded-xl p-8 flex flex-col items-center text-center"
                style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <Clock className="h-12 w-12 text-[#F59E0B] mb-3 animate-pulse" />
                <h4 className="text-lg font-bold text-[#F59E0B] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Under Review</h4>
                <p className="text-sm text-[#475569] font-mono">Our compliance team is reviewing your documents. Usually 24–48 hours.</p>
              </div>
            ) : (
              <Form {...kycForm}>
                <form onSubmit={kycForm.handleSubmit(onSubmitKyc)} className="space-y-4">
                  {kycStatus === "rejected" && (
                    <div className="rounded-xl p-4 flex items-start gap-3"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <XCircle className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
                      <p className="text-sm text-[#EF4444] font-mono">Previous submission rejected. Please resubmit with clearer documents.</p>
                    </div>
                  )}
                  <p className="text-xs text-[#475569] font-mono">
                    Provide secure-hosted URLs for your documents. KYC is required for withdrawals over 10,000 USDT.
                  </p>
                  {[
                    { name: "idDocumentUrl" as const, label: "Government ID (Passport / License)", icon: FileText, placeholder: "https://..." },
                    { name: "selfieUrl" as const, label: "Selfie holding ID", icon: Smartphone, placeholder: "https://..." },
                    { name: "proofOfAddressUrl" as const, label: "Proof of Address (optional)", icon: Shield, placeholder: "https://..." },
                  ].map(f => (
                    <FormField key={f.name} control={kycForm.control} name={f.name} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#475569] text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                          <f.icon className="h-3 w-3" /> {f.label}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder={f.placeholder} className="tb-input h-11 font-mono text-xs" {...field} />
                        </FormControl>
                        <FormMessage className="text-[#EF4444] text-xs" />
                      </FormItem>
                    )} />
                  ))}
                  <button type="submit" disabled={submitKyc.isPending}
                    className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                      boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}>
                    {submitKyc.isPending ? "Submitting..." : "Submit Documents"}
                  </button>
                </form>
              </Form>
            )}
          </div>
        )}

        {/* Wallets Tab */}
        {activeTab === "wallets" && (
          <div className="rounded-2xl p-6 space-y-5 animate-fade-in-up"
            style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="font-bold text-[#E2E8F0] flex items-center gap-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Key className="h-4 w-4 text-[#3B82F6]" /> Linked Payout Addresses
            </h3>
            <p className="text-xs text-[#475569] font-mono">Link your external wallets for automated profit payouts and withdrawals.</p>
            <Form {...walletForm}>
              <form onSubmit={walletForm.handleSubmit(onUpdateWallets)} className="space-y-4">
                {[
                  { name: "usdt" as const, label: "USDT (TRC20)", placeholder: "T..." },
                  { name: "btc" as const, label: "Bitcoin (BTC)", placeholder: "1... or bc1..." },
                  { name: "eth" as const, label: "Ethereum (ERC20)", placeholder: "0x..." },
                  { name: "bnb" as const, label: "BNB (BEP20)", placeholder: "bnb1..." },
                ].map(f => (
                  <FormField key={f.name} control={walletForm.control} name={f.name} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#475569] text-xs font-mono uppercase tracking-wider">{f.label}</FormLabel>
                      <FormControl>
                        <Input placeholder={f.placeholder} className="tb-input h-11 font-mono text-xs" {...field} />
                      </FormControl>
                      <FormMessage className="text-[#EF4444] text-xs" />
                    </FormItem>
                  )} />
                ))}
                <button type="submit" disabled={updateWallets.isPending}
                  className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                    boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                  {updateWallets.isPending ? "Saving..." : "Save Addresses"}
                </button>
              </form>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}
