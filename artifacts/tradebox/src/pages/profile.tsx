import { useState, useRef } from "react";
import { useGetProfile, useUpdateProfile, useUpdateWalletAddresses } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User, Bell, Shield, Key, LogOut, Trash2, ChevronRight,
  Camera, Globe, Smartphone, Clock, CreditCard, HelpCircle,
  Lock, Eye, EyeOff, Monitor, Zap, Star, Check, TrendingUp,
  Ship, Mail, MessageSquare, ExternalLink, AlertTriangle, Settings,
  Moon, Sun
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

const profileSchema = z.object({
  telegramHandle: z.string().optional(),
  whatsappNumber: z.string().optional(),
});

const passwordSchema = z.object({
  current: z.string().min(1, "Required"),
  next: z.string().min(8, "Min 8 characters"),
  confirm: z.string().min(1, "Required"),
}).refine(d => d.next === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

const walletSchema = z.object({
  usdt: z.string().optional(),
  btc: z.string().optional(),
  eth: z.string().optional(),
  bnb: z.string().optional(),
});

type Section = "overview" | "edit" | "security" | "notifications" | "privacy" | "wallets" | "plan" | "support";

function SectionCard({ children, title, icon: Icon, color = "#2563eb" }: {
  children: React.ReactNode; title?: string; icon?: any; color?: string;
}) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "12px" }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }}>
          {Icon && <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={13} color={color} /></div>}
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

function RowItem({ icon: Icon, label, value, color = "#94a3b8", onClick, toggle, toggled, danger }: {
  icon: any; label: string; value?: string; color?: string;
  onClick?: () => void; toggle?: boolean; toggled?: boolean; danger?: boolean;
}) {
  const [on, setOn] = useState(toggled || false);
  return (
    <div onClick={toggle ? undefined : onClick} style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "13px 16px", cursor: onClick || toggle ? "pointer" : "default",
      transition: "background 0.1s ease",
    }}
      onMouseEnter={e => { if (onClick || toggle) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: danger ? "#fef2f2" : `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={15} color={danger ? "#ef4444" : color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: danger ? "#ef4444" : "#0f172a" }}>{label}</p>
        {value && <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>}
      </div>
      {toggle && (
        <Switch checked={on} onCheckedChange={setOn} onClick={e => e.stopPropagation()} />
      )}
      {onClick && !toggle && (
        <ChevronRight size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />;
}

export default function ProfilePage() {
  const { data: profile, isLoading, refetch } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const updateWallets = useUpdateWalletAddresses();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [section, setSection] = useState<Section>("overview");
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { telegramHandle: profile?.telegramHandle || "", whatsappNumber: profile?.whatsappNumber || "" }
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" }
  });

  const walletForm = useForm<z.infer<typeof walletSchema>>({
    resolver: zodResolver(walletSchema),
    values: {
      usdt: (profile?.walletAddresses as any)?.usdt || "",
      btc: (profile?.walletAddresses as any)?.btc || "",
      eth: (profile?.walletAddresses as any)?.eth || "",
      bnb: (profile?.walletAddresses as any)?.bnb || "",
    }
  });

  const onSaveProfile = (data: z.infer<typeof profileSchema>) => {
    updateProfile.mutate({ data }, {
      onSuccess: () => { toast({ title: "Profile updated" }); refetch(); setSection("overview"); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const onSaveWallets = (data: z.infer<typeof walletSchema>) => {
    updateWallets.mutate({ data }, {
      onSuccess: () => { toast({ title: "Wallet addresses saved" }); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const onChangePassword = (data: z.infer<typeof passwordSchema>) => {
    toast({ title: "Password changed", description: "Your password has been updated successfully." });
    passwordForm.reset();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
      toast({ title: "Photo updated" });
    }
  };

  const initials = profile?.email?.charAt(0).toUpperCase() || "U";

  const stats = [
    { label: "Shipments", value: profile?.traderStats?.totalShipped ?? 0, icon: Ship, color: "#2563eb" },
    { label: "Profit", value: `+${(profile?.traderStats?.totalProfit ?? 0).toLocaleString()}`, icon: TrendingUp, color: "#059669", suffix: " USDT" },
    { label: "Active", value: profile?.traderStats?.activeInvestments ?? 0, icon: Zap, color: "#d97706" },
    { label: "Countries", value: profile?.traderStats?.countriesTraded ?? 0, icon: Globe, color: "#7c3aed" },
  ];

  const sessions = [
    { device: "iPhone 15 Pro", browser: "Safari", location: "Lagos, NG", time: "Active now", current: true },
    { device: "MacBook Pro", browser: "Chrome", location: "London, UK", time: "2 hours ago", current: false },
    { device: "Samsung Galaxy", browser: "Chrome Mobile", location: "Dubai, AE", time: "Yesterday", current: false },
  ];

  const activityLog = [
    { action: "Funded shipment", detail: "Lithium Battery Cells — EV", time: "2 min ago", color: "#2563eb" },
    { action: "Deposit confirmed", detail: "1,500 USDT credited", time: "1 hour ago", color: "#059669" },
    { action: "Signed in", detail: "iPhone 15 Pro · Lagos, NG", time: "2 hours ago", color: "#7c3aed" },
    { action: "Withdrawal sent", detail: "500 USDT → wallet", time: "Yesterday", color: "#d97706" },
    { action: "Delivery received", detail: "Cocoa Export — Rotterdam", time: "2 days ago", color: "#059669" },
  ];

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb", padding: "16px" }}>
        <div className="shimmer" style={{ height: "160px", borderRadius: "20px", marginBottom: "12px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer" style={{ height: "70px", borderRadius: "14px" }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>

      {/* Profile Hero */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "24px 16px 20px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>

          {/* Avatar + info */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: "72px", height: "72px", borderRadius: "20px",
                background: avatarUrl ? "transparent" : "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "26px", fontWeight: 800, color: "white",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(37,99,235,0.25)",
              }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : initials}
              </div>
              <button onClick={() => fileRef.current?.click()} style={{
                position: "absolute", bottom: "-4px", right: "-4px",
                width: "24px", height: "24px", borderRadius: "50%",
                background: "#2563eb", border: "2px solid #ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                <Camera size={11} color="white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em" }}>
                    {profile?.traderId}
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {profile?.email}
                  </p>
                </div>
                {/* Plan badge */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  padding: "4px 10px", borderRadius: "20px",
                  background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
                  border: "1px solid #fde68a", flexShrink: 0,
                }}>
                  <Star size={10} color="#d97706" />
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#d97706", fontFamily: "'JetBrains Mono', monospace" }}>PRO</span>
                </div>
              </div>
              <button onClick={() => setSection("edit")} style={{
                display: "flex", alignItems: "center", gap: "5px",
                marginTop: "10px", padding: "6px 12px", borderRadius: "8px",
                background: "#f1f5f9", border: "1px solid #e2e8f0",
                fontSize: "11px", fontWeight: 600, color: "#475569",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s ease",
              }}>
                <Settings size={11} />
                Edit Profile
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                padding: "10px 8px", borderRadius: "12px",
                background: "#f8fafc", border: "1px solid #e8edf2",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "16px", fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "560px", margin: "0 auto" }}>

        {/* ===== OVERVIEW (main menu) ===== */}
        {section === "overview" && (
          <div className="animate-fade-in-up">

            {/* Plan card */}
            <div style={{
              background: "linear-gradient(135deg, #1e40af, #2563eb)",
              borderRadius: "18px", padding: "20px", marginBottom: "12px",
              boxShadow: "0 4px 20px rgba(37,99,235,0.25)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <Star size={14} color="#fcd34d" />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#fcd34d", fontFamily: "'JetBrains Mono', monospace" }}>PRO PLAN</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>$29 / month</p>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'JetBrains Mono', monospace" }}>Next billing: Jan 28, 2027</p>
                </div>
                <button onClick={() => setSection("plan")} style={{
                  padding: "8px 14px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
                  color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Manage
                </button>
              </div>
            </div>

            {/* Account section */}
            <SectionCard title="Account" icon={User} color="#2563eb">
              <RowItem icon={User} label="Edit Profile" value="Name, contact info" color="#2563eb" onClick={() => setSection("edit")} />
              <Divider />
              <RowItem icon={CreditCard} label="Linked Wallets" value="Payout addresses" color="#7c3aed" onClick={() => setSection("wallets")} />
              <Divider />
              <RowItem icon={Star} label="Subscription Plan" value="Pro · $29/mo" color="#d97706" onClick={() => setSection("plan")} />
            </SectionCard>

            {/* Preferences */}
            <SectionCard title="Preferences" icon={Settings} color="#7c3aed">
              <RowItem icon={Bell} label="Notifications" value="Email, push, SMS" color="#d97706" onClick={() => setSection("notifications")} />
              <Divider />
              <RowItem icon={darkMode ? Moon : Sun} label="Dark Mode" color="#475569" toggle toggled={darkMode} />
              <Divider />
              <RowItem icon={Globe} label="Language" value="English (US)" color="#0891b2" onClick={() => toast({ title: "Coming soon" })} />
            </SectionCard>

            {/* Security */}
            <SectionCard title="Security" icon={Shield} color="#059669">
              <RowItem icon={Lock} label="Password" value="Last changed 30 days ago" color="#059669" onClick={() => setSection("security")} />
              <Divider />
              <RowItem icon={Smartphone} label="Two-Factor Auth" color="#059669" toggle toggled={profile?.twoFactorEnabled} />
              <Divider />
              <RowItem icon={Monitor} label="Sessions" value="3 active devices" color="#2563eb" onClick={() => setSection("security")} />
            </SectionCard>

            {/* Privacy */}
            <SectionCard title="Privacy" icon={Eye} color="#64748b">
              <RowItem icon={Eye} label="Privacy Settings" value="Data & visibility" color="#64748b" onClick={() => setSection("privacy")} />
              <Divider />
              <RowItem icon={Clock} label="Activity Log" value="View recent actions" color="#94a3b8" onClick={() => setSection("privacy")} />
            </SectionCard>

            {/* Support */}
            <SectionCard title="Help & Support" icon={HelpCircle} color="#0891b2">
              <RowItem icon={MessageSquare} label="Live Chat" value="Avg. response: 5 min" color="#0891b2" onClick={() => setSection("support")} />
              <Divider />
              <RowItem icon={Mail} label="Email Support" value="support@tradebox.io" color="#2563eb" onClick={() => setSection("support")} />
              <Divider />
              <RowItem icon={ExternalLink} label="Documentation" value="Guides & FAQ" color="#7c3aed" onClick={() => toast({ title: "Opening docs..." })} />
            </SectionCard>

            {/* Danger zone */}
            <SectionCard>
              <button onClick={logout} style={{
                width: "100%", display: "flex", alignItems: "center", gap: "12px",
                padding: "13px 16px", background: "none", border: "none", cursor: "pointer",
              }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LogOut size={15} color="#ef4444" />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#ef4444" }}>Sign Out</span>
              </button>
              <Divider />
              <button onClick={() => setShowDeleteConfirm(true)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: "12px",
                padding: "13px 16px", background: "none", border: "none", cursor: "pointer",
              }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={15} color="#ef4444" />
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#ef4444" }}>Delete Account</p>
                  <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Permanent — cannot be undone</p>
                </div>
              </button>
            </SectionCard>

            {/* Delete confirm modal */}
            {showDeleteConfirm && (
              <div style={{
                position: "fixed", inset: 0, zIndex: 100,
                background: "rgba(0,0,0,0.4)",
                display: "flex", alignItems: "flex-end", justifyContent: "center",
                padding: "16px",
              }} onClick={() => setShowDeleteConfirm(false)}>
                <div onClick={e => e.stopPropagation()} style={{
                  background: "#ffffff", borderRadius: "20px", padding: "24px",
                  width: "100%", maxWidth: "400px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <AlertTriangle size={20} color="#ef4444" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Delete Account?</h3>
                      <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>This action is permanent and irreversible.</p>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                    All your data, investments, and trading history will be permanently deleted. You cannot recover this account.
                  </p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setShowDeleteConfirm(false)} style={{
                      flex: 1, height: "44px", borderRadius: "12px",
                      background: "#f1f5f9", border: "1px solid #e2e8f0",
                      fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer",
                    }}>Cancel</button>
                    <button onClick={() => { toast({ title: "Account deletion requested", description: "Our team will process this within 24 hours." }); setShowDeleteConfirm(false); }} style={{
                      flex: 1, height: "44px", borderRadius: "12px",
                      background: "#ef4444", border: "none",
                      fontSize: "13px", fontWeight: 600, color: "white", cursor: "pointer",
                    }}>Delete Account</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ===== EDIT PROFILE ===== */}
        {section === "edit" && (
          <div className="animate-fade-in-up">
            <button onClick={() => setSection("overview")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#2563eb", fontWeight: 600, marginBottom: "16px", padding: 0 }}>
              ← Back
            </button>
            <SectionCard title="Edit Profile" icon={User} color="#2563eb">
              <div style={{ padding: "16px" }}>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onSaveProfile)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {/* Read-only fields */}
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Trader ID</label>
                      <div style={{ height: "42px", display: "flex", alignItems: "center", padding: "0 12px", borderRadius: "10px", background: "#f8fafc", border: "1.5px solid #e2e8f0", fontSize: "13px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                        {profile?.traderId}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Email</label>
                      <div style={{ height: "42px", display: "flex", alignItems: "center", padding: "0 12px", borderRadius: "10px", background: "#f8fafc", border: "1.5px solid #e2e8f0", fontSize: "13px", color: "#94a3b8" }}>
                        {profile?.email}
                      </div>
                    </div>
                    <FormField control={profileForm.control} name="telegramHandle" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Telegram Handle</FormLabel>
                        <FormControl><Input className="tb-input h-11" placeholder="@username" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={profileForm.control} name="whatsappNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>WhatsApp Number</FormLabel>
                        <FormControl><Input className="tb-input h-11" placeholder="+1234567890" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <button type="submit" disabled={updateProfile.isPending} style={{
                      height: "44px", borderRadius: "12px", background: "#2563eb", color: "white",
                      border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                      fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                      opacity: updateProfile.isPending ? 0.6 : 1,
                    }}>
                      {updateProfile.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </form>
                </Form>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ===== SECURITY ===== */}
        {section === "security" && (
          <div className="animate-fade-in-up">
            <button onClick={() => setSection("overview")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#2563eb", fontWeight: 600, marginBottom: "16px", padding: 0 }}>
              ← Back
            </button>

            {/* Change Password */}
            <SectionCard title="Change Password" icon={Lock} color="#059669">
              <div style={{ padding: "16px" }}>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onChangePassword)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {["current", "next", "confirm"].map((name, i) => (
                      <FormField key={name} control={passwordForm.control} name={name as any} render={({ field }) => (
                        <FormItem>
                          <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {["Current Password", "New Password", "Confirm New Password"][i]}
                          </FormLabel>
                          <FormControl>
                            <div style={{ position: "relative" }}>
                              <Input type={showPassword ? "text" : "password"} className="tb-input h-11" style={{ paddingRight: "44px" }} {...field} />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                        </FormItem>
                      )} />
                    ))}
                    <button type="submit" style={{
                      height: "44px", borderRadius: "12px", background: "#059669", color: "white",
                      border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>Update Password</button>
                  </form>
                </Form>
              </div>
            </SectionCard>

            {/* 2FA */}
            <SectionCard title="Two-Factor Authentication" icon={Shield} color="#7c3aed">
              <div style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>Authenticator App</p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>TOTP-based 2FA</p>
                  </div>
                  <Switch defaultChecked={profile?.twoFactorEnabled} />
                </div>
                <div style={{ padding: "12px", borderRadius: "10px", background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                  <p style={{ margin: 0, fontSize: "11px", color: "#7c3aed", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                    2FA adds an extra layer of security. Enabled = required for withdrawals and sign-ins.
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Sessions */}
            <SectionCard title="Active Sessions" icon={Monitor} color="#2563eb">
              {sessions.map((s, i) => (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Monitor size={16} color="#2563eb" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: "#0f172a" }}>{s.device} · {s.browser}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{s.location} · {s.time}</p>
                    </div>
                    {s.current
                      ? <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 600, background: "#ecfdf5", color: "#059669", fontFamily: "'JetBrains Mono', monospace" }}>Current</span>
                      : <button onClick={() => toast({ title: "Session revoked" })} style={{ padding: "4px 10px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#ef4444", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                          Revoke
                        </button>
                    }
                  </div>
                  {i < sessions.length - 1 && <Divider />}
                </div>
              ))}
            </SectionCard>
          </div>
        )}

        {/* ===== NOTIFICATIONS ===== */}
        {section === "notifications" && (
          <div className="animate-fade-in-up">
            <button onClick={() => setSection("overview")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#2563eb", fontWeight: 600, marginBottom: "16px", padding: 0 }}>
              ← Back
            </button>
            {[
              {
                title: "Trade Alerts", icon: Zap, color: "#d97706",
                items: [
                  { label: "Funding closing soon", sub: "Alert when >85% funded", on: true },
                  { label: "Delivery confirmed", sub: "When cargo arrives", on: true },
                  { label: "New shipment listed", sub: "Premium routes only", on: false },
                ],
              },
              {
                title: "Financial", icon: CreditCard, color: "#059669",
                items: [
                  { label: "Deposit cleared", sub: "When funds arrive", on: true },
                  { label: "Withdrawal sent", sub: "When payout dispatched", on: true },
                  { label: "Profit credited", sub: "After each delivery", on: true },
                ],
              },
              {
                title: "Channels", icon: Bell, color: "#7c3aed",
                items: [
                  { label: "Push notifications", sub: "In-app & mobile", on: true },
                  { label: "Email alerts", sub: profile?.email || "your email", on: true },
                  { label: "Telegram alerts", sub: profile?.telegramHandle || "Set in profile", on: false },
                ],
              },
            ].map((group, gi) => (
              <SectionCard key={gi} title={group.title} icon={group.icon} color={group.color}>
                {group.items.map((item, ii) => (
                  <div key={ii}>
                    <RowItem icon={group.icon} label={item.label} value={item.sub} color={group.color} toggle toggled={item.on} />
                    {ii < group.items.length - 1 && <Divider />}
                  </div>
                ))}
              </SectionCard>
            ))}
          </div>
        )}

        {/* ===== PRIVACY ===== */}
        {section === "privacy" && (
          <div className="animate-fade-in-up">
            <button onClick={() => setSection("overview")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#2563eb", fontWeight: 600, marginBottom: "16px", padding: 0 }}>
              ← Back
            </button>

            <SectionCard title="Privacy Controls" icon={Eye} color="#64748b">
              <RowItem icon={Eye} label="Profile Visibility" value="Guild members only" color="#64748b" toggle toggled />
              <Divider />
              <RowItem icon={TrendingUp} label="Trading Stats Visible" value="Show in leaderboard" color="#2563eb" toggle toggled={false} />
              <Divider />
              <RowItem icon={Globe} label="Location Sharing" value="For route optimization" color="#0891b2" toggle toggled={false} />
            </SectionCard>

            <SectionCard title="Activity Log" icon={Clock} color="#94a3b8">
              {activityLog.map((a, i) => (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: "#0f172a" }}>{a.action}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{a.detail}</p>
                    </div>
                    <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{a.time}</span>
                  </div>
                  {i < activityLog.length - 1 && <Divider />}
                </div>
              ))}
            </SectionCard>

            <SectionCard>
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <button onClick={() => toast({ title: "Data export requested", description: "You'll receive an email with your data within 48 hours." })} style={{
                  height: "40px", borderRadius: "10px", background: "#f1f5f9", border: "1px solid #e2e8f0",
                  fontSize: "12px", fontWeight: 600, color: "#475569", cursor: "pointer",
                }}>
                  Export My Data
                </button>
                <button onClick={() => toast({ title: "Request submitted", description: "Data deletion processed within 30 days." })} style={{
                  height: "40px", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fecaca",
                  fontSize: "12px", fontWeight: 600, color: "#ef4444", cursor: "pointer",
                }}>
                  Request Data Deletion
                </button>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ===== WALLETS ===== */}
        {section === "wallets" && (
          <div className="animate-fade-in-up">
            <button onClick={() => setSection("overview")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#2563eb", fontWeight: 600, marginBottom: "16px", padding: 0 }}>
              ← Back
            </button>
            <SectionCard title="Linked Payout Wallets" icon={Key} color="#7c3aed">
              <div style={{ padding: "16px" }}>
                <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
                  Add your external wallet addresses for automatic profit payouts.
                </p>
                <Form {...walletForm}>
                  <form onSubmit={walletForm.handleSubmit(onSaveWallets)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {[
                      { name: "usdt" as const, label: "USDT (TRC20)", placeholder: "T..." },
                      { name: "btc" as const, label: "Bitcoin (BTC)", placeholder: "1... or bc1..." },
                      { name: "eth" as const, label: "Ethereum (ERC20)", placeholder: "0x..." },
                      { name: "bnb" as const, label: "BNB Smart Chain", placeholder: "bnb1..." },
                    ].map(f => (
                      <FormField key={f.name} control={walletForm.control} name={f.name} render={({ field }) => (
                        <FormItem>
                          <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</FormLabel>
                          <FormControl><Input className="tb-input h-11" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }} placeholder={f.placeholder} {...field} /></FormControl>
                        </FormItem>
                      )} />
                    ))}
                    <button type="submit" disabled={updateWallets.isPending} style={{
                      height: "44px", borderRadius: "12px", background: "#7c3aed", color: "white",
                      border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                      fontFamily: "'Space Grotesk', sans-serif", opacity: updateWallets.isPending ? 0.6 : 1,
                    }}>
                      {updateWallets.isPending ? "Saving..." : "Save Addresses"}
                    </button>
                  </form>
                </Form>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ===== PLAN ===== */}
        {section === "plan" && (
          <div className="animate-fade-in-up">
            <button onClick={() => setSection("overview")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#2563eb", fontWeight: 600, marginBottom: "16px", padding: 0 }}>
              ← Back
            </button>

            {/* Current plan */}
            <div style={{ background: "linear-gradient(135deg, #1e40af, #2563eb)", borderRadius: "18px", padding: "20px", marginBottom: "12px", boxShadow: "0 4px 20px rgba(37,99,235,0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Star size={16} color="#fcd34d" />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#fcd34d", fontFamily: "'JetBrains Mono', monospace" }}>CURRENT PLAN</span>
              </div>
              <h3 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800, color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>Pro</h3>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace" }}>$29 / month · Next billing Jan 28, 2027</p>
              {[
                "Unlimited investments per shipment",
                "Priority customer support",
                "Advanced analytics dashboard",
                "Guild referral commissions",
                "Early access to prime routes",
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Check size={13} color="#86efac" />
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)" }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <SectionCard>
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <button onClick={() => toast({ title: "Coming soon", description: "Plan upgrade options will be available soon." })} style={{
                  height: "44px", borderRadius: "12px", background: "#2563eb", color: "white",
                  border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  Upgrade to Enterprise
                </button>
                <button onClick={() => toast({ title: "Billing history", description: "Invoice emails sent to your registered email." })} style={{
                  height: "44px", borderRadius: "12px", background: "#f1f5f9", border: "1px solid #e2e8f0",
                  fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer",
                }}>
                  View Billing History
                </button>
                <button onClick={() => toast({ title: "Cancellation requested", description: "Your plan will remain active until Jan 28, 2027." })} style={{
                  height: "44px", borderRadius: "12px", background: "transparent", border: "1px solid #e2e8f0",
                  fontSize: "13px", fontWeight: 600, color: "#ef4444", cursor: "pointer",
                }}>
                  Cancel Plan
                </button>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ===== SUPPORT ===== */}
        {section === "support" && (
          <div className="animate-fade-in-up">
            <button onClick={() => setSection("overview")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#2563eb", fontWeight: 600, marginBottom: "16px", padding: 0 }}>
              ← Back
            </button>
            <SectionCard title="Help & Support" icon={HelpCircle} color="#0891b2">
              <RowItem icon={MessageSquare} label="Live Chat" value="Typically replies in 5 min" color="#0891b2" onClick={() => toast({ title: "Opening chat..." })} />
              <Divider />
              <RowItem icon={Mail} label="Email Support" value="support@tradebox.io" color="#2563eb" onClick={() => toast({ title: "Email: support@tradebox.io" })} />
              <Divider />
              <RowItem icon={ExternalLink} label="Help Center" value="Guides, tutorials & FAQ" color="#7c3aed" onClick={() => toast({ title: "Opening help center..." })} />
              <Divider />
              <RowItem icon={AlertTriangle} label="Report a Bug" value="Help us improve TradeBox" color="#d97706" onClick={() => toast({ title: "Bug report form opened" })} />
            </SectionCard>

            <SectionCard title="About TradeBox" icon={Globe} color="#64748b">
              <div style={{ padding: "16px" }}>
                {[
                  ["Version", "2.4.1 (latest)"],
                  ["Platform", "TradeBox Global"],
                  ["Region", "EU Data Center"],
                  ["Status", "All systems operational ✓"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{k}</span>
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#0f172a", fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

      </div>
    </div>
  );
}
