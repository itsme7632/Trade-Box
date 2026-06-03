import { useState, useRef } from "react";
import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { useChangePassword } from "@workspace/api-client-react/src/extra-hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User, Bell, Shield, Key, LogOut, ChevronRight,
  Camera, Smartphone, HelpCircle, Lock,
  EyeOff, Eye, Star, TrendingUp, Ship, Zap,
  Settings, MapPin, AtSign, Globe,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

// ─── schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().regex(/^[a-zA-Z0-9_]*$/, "Only letters, numbers, underscores").optional().or(z.literal("")),
  country: z.string().optional(),
  telegramHandle: z.string().optional(),
  whatsappNumber: z.string().optional(),
});

const passwordSchema = z.object({
  current: z.string().min(1, "Required"),
  next: z.string().min(8, "Min 8 characters"),
  confirm: z.string().min(1, "Required"),
}).refine(d => d.next === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

// ─── helpers ──────────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "10px" }}>{children}</div>;
}

function CardHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={13} color={color} />
      </div>
      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>{title}</span>
    </div>
  );
}

function Row({ icon: Icon, label, value, color = "#94a3b8", onClick, danger, badge }: {
  icon: any; label: string; value?: string; color?: string; onClick?: () => void; danger?: boolean; badge?: React.ReactNode;
}) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", cursor: onClick ? "pointer" : "default", transition: "background 0.1s" }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
      <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: danger ? "#fef2f2" : `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={15} color={danger ? "#ef4444" : color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: danger ? "#ef4444" : "#0f172a" }}>{label}</p>
        {value && <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>}
      </div>
      {badge}
      {onClick && <ChevronRight size={14} color="#cbd5e1" style={{ flexShrink: 0 }} />}
    </div>
  );
}

function Div() { return <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />; }

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#2563eb", padding: 0, marginBottom: "16px" }}>
      ← Back
    </button>
  );
}

function PwField({ label, field, show, toggle }: { label: string; field: any; show: boolean; toggle: () => void }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <Input type={show ? "text" : "password"} placeholder="••••••••" className="tb-input" style={{ height: "44px", paddingRight: "40px" }} {...field} />
        <button type="button" onClick={toggle} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {show ? <EyeOff size={15} color="#94a3b8" /> : <Eye size={15} color="#94a3b8" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Section = "overview" | "edit" | "password";

export default function ProfilePage() {
  const { data: profile, isLoading, refetch } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [section, setSection] = useState<Section>("overview");

  // Password visibility
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: (profile as any)?.firstName || "",
      lastName: (profile as any)?.lastName || "",
      username: (profile as any)?.username || "",
      country: (profile as any)?.country || "",
      telegramHandle: profile?.telegramHandle || "",
      whatsappNumber: profile?.whatsappNumber || "",
    }
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  // ── handlers ──────────────────────────────────────────────────────────────────

  const onSaveProfile = (data: z.infer<typeof profileSchema>) => {
    updateProfile.mutate({ data: data as any }, {
      onSuccess: () => {
        toast({ title: "Profile saved" });
        refetch();
        setSection("overview");
      },
      onError: (err: any) => toast({ title: "Error", description: err?.data?.error || err.message, variant: "destructive" }),
    });
  };

  const onChangePassword = (data: z.infer<typeof passwordSchema>) => {
    changePassword.mutate({ currentPassword: data.current, newPassword: data.next }, {
      onSuccess: () => {
        toast({ title: "Password updated", description: "Your password has been changed." });
        passwordForm.reset();
        setSection("overview");
      },
      onError: (err: any) => toast({ title: "Error", description: err?.data?.error || err.message, variant: "destructive" }),
    });
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarUrl(URL.createObjectURL(file)); toast({ title: "Photo updated" }); }
  };

  const handleLogout = () => { logout(); setLocation("/login"); };

  const displayName = (profile as any)?.firstName
    ? `${(profile as any).firstName} ${(profile as any).lastName || ""}`.trim()
    : profile?.traderId;

  const initials = (profile as any)?.firstName
    ? (((profile as any).firstName[0] || "") + ((profile as any).lastName?.[0] || "")).toUpperCase()
    : (profile?.email?.charAt(0).toUpperCase() || "T");

  const stats = [
    { label: "Shipped",   value: `$${((profile?.traderStats?.totalShipped ?? 0)).toLocaleString()}`,         color: "#2563eb", icon: Ship      },
    { label: "Profit",    value: `+$${(profile?.traderStats?.totalProfit ?? 0).toLocaleString()}`,           color: "#059669", icon: TrendingUp },
    { label: "Active",    value: String(profile?.traderStats?.activeInvestments ?? 0),                      color: "#d97706", icon: Zap       },
    { label: "Countries", value: String(profile?.traderStats?.countriesTraded ?? 0),                        color: "#7c3aed", icon: Globe     },
  ];

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb", padding: "16px" }}>
        <div className="shimmer" style={{ height: "160px", borderRadius: "20px", marginBottom: "12px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer" style={{ height: "60px", borderRadius: "14px" }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>

      {/* Hero */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "24px 16px 20px" }}>
        <div style={{ maxWidth: "540px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>

            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: avatarUrl ? "transparent" : "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 800, color: "white", overflow: "hidden", boxShadow: "0 4px 16px rgba(37,99,235,0.22)" }}>
                {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
              </div>
              <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "24px", height: "24px", borderRadius: "50%", background: "#2563eb", border: "2px solid #ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Camera size={11} color="white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                    {displayName}
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {profile?.email}
                  </p>
                  <p style={{ margin: "1px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                    {profile?.traderId}
                    {(profile as any)?.country && ` · ${(profile as any).country}`}
                  </p>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", background: profile?.twoFactorEnabled ? "#ecfdf5" : "#fffbeb", border: `1px solid ${profile?.twoFactorEnabled ? "#a7f3d0" : "#fde68a"}`, flexShrink: 0 }}>
                  {profile?.twoFactorEnabled
                    ? <><Shield size={10} color="#059669" /><span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", fontFamily: "'JetBrains Mono', monospace" }}>2FA ON</span></>
                    : <><Star size={10} color="#d97706" /><span style={{ fontSize: "10px", fontWeight: 700, color: "#d97706", fontFamily: "'JetBrains Mono', monospace" }}>PRO</span></>
                  }
                </div>
              </div>
              <button onClick={() => setSection("edit")} style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "10px", padding: "6px 12px", borderRadius: "8px", background: "#f1f5f9", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                <Settings size={11} /> Edit Profile
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ padding: "10px 8px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e8edf2", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
                <div style={{ fontSize: "8px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "540px", margin: "0 auto" }}>

        {/* ── OVERVIEW ── */}
        {section === "overview" && (
          <>
            <Card>
              <CardHeader icon={User} title="Account" color="#2563eb" />
              <Row icon={User} label="Edit Profile" value="Name, contact info" color="#2563eb" onClick={() => setSection("edit")} />
              <Div />
              <Row icon={Key} label="Password" value="Change your password" color="#059669" onClick={() => setSection("password")} />
            </Card>

            <Card>
              <CardHeader icon={Shield} title="Security" color="#059669" />
              <Row
                icon={Smartphone}
                label="Two-Factor Authentication"
                value={profile?.twoFactorEnabled ? "Currently enabled" : "Not enabled — tap to set up"}
                color={profile?.twoFactorEnabled ? "#059669" : "#d97706"}
                badge={
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px", background: profile?.twoFactorEnabled ? "#ecfdf5" : "#fffbeb", color: profile?.twoFactorEnabled ? "#059669" : "#d97706", flexShrink: 0 }}>
                    {profile?.twoFactorEnabled ? "ON" : "OFF"}
                  </span>
                }
                onClick={() => setLocation("/security/2fa")}
              />
            </Card>

            <Card>
              <CardHeader icon={Settings} title="Preferences" color="#7c3aed" />
              <Row icon={Bell} label="Notifications" value="Alerts & activity" color="#d97706" onClick={() => toast({ title: "Coming soon" })} />
            </Card>

            <Card>
              <Row icon={HelpCircle} label="Help & Support" value="Tickets, FAQ, community" color="#0891b2" onClick={() => setLocation("/help")} />
            </Card>

            <Card>
              <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <LogOut size={15} color="#ef4444" />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#ef4444" }}>Sign Out</span>
              </button>
            </Card>

            <p style={{ textAlign: "center", fontSize: "10px", color: "#cbd5e1", fontFamily: "'JetBrains Mono', monospace", marginTop: "8px" }}>
              TradeBox v2.0 · Global Trade Finance Portal
            </p>
          </>
        )}

        {/* ── EDIT PROFILE ── */}
        {section === "edit" && (
          <div>
            <BackBtn onClick={() => setSection("overview")} />
            <Card>
              <CardHeader icon={User} title="Edit Profile" color="#2563eb" />
              <div style={{ padding: "16px" }}>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onSaveProfile)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <FormField control={profileForm.control} name="firstName" render={({ field }) => (
                        <FormItem>
                          <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>First Name</FormLabel>
                          <FormControl><Input placeholder="John" className="tb-input" style={{ height: "44px" }} {...field} /></FormControl>
                          <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                        </FormItem>
                      )} />
                      <FormField control={profileForm.control} name="lastName" render={({ field }) => (
                        <FormItem>
                          <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Last Name</FormLabel>
                          <FormControl><Input placeholder="Doe" className="tb-input" style={{ height: "44px" }} {...field} /></FormControl>
                          <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={profileForm.control} name="username" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          <AtSign size={11} color="#94a3b8" /> Username
                        </FormLabel>
                        <FormControl><Input placeholder="trader_john" className="tb-input" style={{ height: "44px", fontFamily: "'JetBrains Mono', monospace" }} {...field} /></FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <FormField control={profileForm.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          <MapPin size={11} color="#94a3b8" /> Country
                        </FormLabel>
                        <FormControl><Input placeholder="United States" className="tb-input" style={{ height: "44px" }} {...field} /></FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <div style={{ height: "1px", background: "#f1f5f9" }} />
                    <FormField control={profileForm.control} name="telegramHandle" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Telegram Handle</FormLabel>
                        <FormControl><Input placeholder="@username" className="tb-input" style={{ height: "44px", fontFamily: "'JetBrains Mono', monospace" }} {...field} /></FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <FormField control={profileForm.control} name="whatsappNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>WhatsApp Number</FormLabel>
                        <FormControl><Input placeholder="+1 234 567 8900" className="tb-input" style={{ height: "44px", fontFamily: "'JetBrains Mono', monospace" }} {...field} /></FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <div style={{ height: "1px", background: "#f1f5f9" }} />
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Trader ID</label>
                      <div style={{ height: "44px", display: "flex", alignItems: "center", padding: "0 12px", borderRadius: "10px", background: "#f8fafc", border: "1.5px solid #e2e8f0", fontSize: "13px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{profile?.traderId}</div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Email</label>
                      <div style={{ height: "44px", display: "flex", alignItems: "center", padding: "0 12px", borderRadius: "10px", background: "#f8fafc", border: "1.5px solid #e2e8f0", fontSize: "13px", color: "#94a3b8" }}>{profile?.email}</div>
                    </div>
                    <button type="submit" disabled={updateProfile.isPending} style={{ height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.3)", opacity: updateProfile.isPending ? 0.7 : 1 }}>
                      {updateProfile.isPending ? "Saving…" : "Save Changes"}
                    </button>
                  </form>
                </Form>
              </div>
            </Card>
          </div>
        )}

        {/* ── CHANGE PASSWORD ── */}
        {section === "password" && (
          <div>
            <BackBtn onClick={() => setSection("overview")} />
            <Card>
              <CardHeader icon={Lock} title="Change Password" color="#059669" />
              <div style={{ padding: "16px" }}>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onChangePassword)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <FormField control={passwordForm.control} name="current" render={({ field }) => (
                      <FormItem>
                        <PwField label="Current Password" field={field} show={showPw.current} toggle={() => setShowPw(p => ({ ...p, current: !p.current }))} />
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="next" render={({ field }) => (
                      <FormItem>
                        <PwField label="New Password" field={field} show={showPw.next} toggle={() => setShowPw(p => ({ ...p, next: !p.next }))} />
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="confirm" render={({ field }) => (
                      <FormItem>
                        <PwField label="Confirm New Password" field={field} show={showPw.confirm} toggle={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} />
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <button type="submit" disabled={changePassword.isPending} style={{ height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 4px 16px rgba(5,150,105,0.3)", opacity: changePassword.isPending ? 0.7 : 1 }}>
                      {changePassword.isPending ? "Updating…" : "Update Password"}
                    </button>
                  </form>
                </Form>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
