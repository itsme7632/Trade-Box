import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-context";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useTwoFaComplete } from "@workspace/api-client-react/src/extra-hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Anchor, Globe, Shield, TrendingUp, Lock, Mail, User, Check,
  ChevronRight, ArrowLeft, Key, MapPin
} from "lucide-react";

// ─── schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

const regStep1Schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Min 8 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

const regStep2Schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  username: z.string().min(3, "Min 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscores only").optional().or(z.literal("")),
  country: z.string().optional(),
  referralCode: z.string().optional(),
});

const otpSchema = z.object({
  token: z.string().length(6, "Enter 6-digit code"),
});

const features = [
  { icon: Globe, label: "120+ Global Routes", desc: "Trade across every continent" },
  { icon: TrendingUp, label: "Avg. 16.4% Returns", desc: "On verified shipments" },
  { icon: Shield, label: "100% Insured Cargo", desc: "All transit risks covered" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

type Mode = "login" | "register-1" | "register-2" | "otp";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const completeTwoFa = useTwoFaComplete();

  // Step 1 data carried forward to step 2
  const [step1Data, setStep1Data] = useState<z.infer<typeof regStep1Schema> | null>(null);
  // Temp token from server when 2FA is required
  const [tempToken, setTempToken] = useState<string>("");

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const step1Form = useForm<z.infer<typeof regStep1Schema>>({
    resolver: zodResolver(regStep1Schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const step2Form = useForm<z.infer<typeof regStep2Schema>>({
    resolver: zodResolver(regStep2Schema),
    defaultValues: { firstName: "", lastName: "", username: "", country: "", referralCode: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: "" },
  });

  // ── Login ────────────────────────────────────────────────────────────────────

  const onLogin = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res: any) => {
        if (res.requiresOtp) {
          setTempToken(res.tempToken);
          setMode("otp");
        } else {
          login(res.token, res.user);
          setLocation("/market");
        }
      },
      onError: (err: any) =>
        toast({ title: "Login failed", description: err?.data?.error || err.message || "Invalid credentials", variant: "destructive" }),
    });
  };

  // ── OTP completion ───────────────────────────────────────────────────────────

  const onOtp = (data: z.infer<typeof otpSchema>) => {
    completeTwoFa.mutate({ tempToken, token: data.token }, {
      onSuccess: (res) => {
        login(res.token, res.user);
        setLocation("/market");
      },
      onError: (err: any) =>
        toast({ title: "Invalid code", description: err?.data?.error || "Try again", variant: "destructive" }),
    });
  };

  // ── Registration step 1 ──────────────────────────────────────────────────────

  const onStep1 = (data: z.infer<typeof regStep1Schema>) => {
    setStep1Data(data);
    setMode("register-2");
  };

  // ── Registration step 2 ──────────────────────────────────────────────────────

  const onStep2 = (data: z.infer<typeof regStep2Schema>) => {
    if (!step1Data) return;
    registerMutation.mutate({
      data: {
        email: step1Data.email,
        password: step1Data.password,
        referralCode: data.referralCode || undefined,
      } as any,
      // Pass extra fields via the body (api-zod will pass them through)
    }, {
      onSuccess: (res: any) => {
        login(res.token, res.user);
        toast({ title: "Welcome aboard!", description: `Your Trader ID: ${res.user.traderId}` });
        // Update profile with step 2 data
        fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("tradebox_token")}` },
          body: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            username: data.username || undefined,
            country: data.country || undefined,
          }),
        }).catch(() => {});
        setLocation("/market");
      },
      onError: (err: any) =>
        toast({ title: "Registration failed", description: err?.data?.error || err.message, variant: "destructive" }),
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f6f8fb" }}>

      {/* Left panel — desktop only */}
      <div style={{
        display: "none", width: "50%", flexDirection: "column", justifyContent: "space-between",
        padding: "48px", background: "linear-gradient(145deg, #1e3a8a, #1d4ed8)",
        position: "relative", overflow: "hidden",
      }} className="auth-left">
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div style={{ position: "absolute", bottom: "-80px", right: "-80px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.2)" }}>
            <Anchor size={18} color="white" />
          </div>
          <span style={{ fontSize: "20px", fontWeight: 700, color: "white", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>TradeBox</span>
        </div>

        <div style={{ position: "relative" }}>
          <h1 style={{ margin: "0 0 16px", fontSize: "38px", fontWeight: 800, color: "white", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            Global Trade<br /><span style={{ color: "#93c5fd" }}>Finance Platform</span>
          </h1>
          <p style={{ margin: "0 0 40px", fontSize: "15px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: "380px" }}>
            Fund international shipments, earn returns on real-world trade routes, and track your cargo in real time.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <f.icon size={16} color="rgba(255,255,255,0.9)" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "white" }}>{f.label}</p>
                  <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", position: "relative" }}>
          © 2026 TradeBox · Global Trade Finance Portal
        </p>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "#f6f8fb" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {/* Mobile logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }} className="mobile-logo">
            <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "linear-gradient(135deg, #2563eb, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(37,99,235,0.3)", marginBottom: "12px" }}>
              <Anchor size={24} color="white" />
            </div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>TradeBox</h2>
            <p style={{ margin: "3px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>Global Trade Finance Portal</p>
          </div>

          {/* Card */}
          <div style={{ background: "#ffffff", borderRadius: "24px", boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 0 0 1px #e8edf2", overflow: "hidden" }}>

            {/* ── OTP view ── */}
            {mode === "otp" && (
              <div style={{ padding: "28px 24px" }}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "18px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <Key size={24} color="#2563eb" />
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Two-Factor Auth</h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>Enter the 6-digit code from your authenticator app</p>
                </div>
                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOtp)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <FormField control={otpForm.control} name="token" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Authenticator Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="000000"
                            maxLength={6}
                            className="tb-input h-14 text-center text-2xl tracking-widest"
                            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.3em" }}
                          />
                        </FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <button type="submit" disabled={completeTwoFa.isPending} style={{
                      height: "48px", borderRadius: "14px", border: "none", cursor: "pointer",
                      fontSize: "15px", fontWeight: 700, color: "white",
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                      opacity: completeTwoFa.isPending ? 0.7 : 1,
                    }}>
                      {completeTwoFa.isPending ? "Verifying..." : "Verify & Sign In"}
                    </button>
                    <button type="button" onClick={() => setMode("login")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>
                      <ArrowLeft size={12} /> Back to login
                    </button>
                  </form>
                </Form>
              </div>
            )}

            {/* ── Login / Register tabs ── */}
            {(mode === "login" || mode === "register-1" || mode === "register-2") && (
              <>
                <div style={{ display: "flex", padding: "6px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <button onClick={() => setMode("login")} style={{
                    flex: 1, padding: "10px", borderRadius: "14px", border: "none", cursor: "pointer",
                    fontSize: "13px", fontWeight: mode === "login" ? 700 : 500,
                    background: mode === "login" ? "#ffffff" : "transparent",
                    color: mode === "login" ? "#2563eb" : "#94a3b8",
                    boxShadow: mode === "login" ? "0 1px 6px rgba(0,0,0,0.1)" : "none",
                  }}>Sign In</button>
                  <button onClick={() => setMode("register-1")} style={{
                    flex: 1, padding: "10px", borderRadius: "14px", border: "none", cursor: "pointer",
                    fontSize: "13px", fontWeight: mode !== "login" ? 700 : 500,
                    background: mode !== "login" ? "#ffffff" : "transparent",
                    color: mode !== "login" ? "#2563eb" : "#94a3b8",
                    boxShadow: mode !== "login" ? "0 1px 6px rgba(0,0,0,0.1)" : "none",
                  }}>Register</button>
                </div>

                <div style={{ padding: "24px" }}>

                  {/* ── Login form ── */}
                  {mode === "login" && (
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLogin)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <FormField control={loginForm.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              <Mail size={11} color="#94a3b8" /> Email Address
                            </FormLabel>
                            <FormControl><Input placeholder="trader@example.com" className="tb-input h-12 text-sm" {...field} /></FormControl>
                            <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                          </FormItem>
                        )} />
                        <FormField control={loginForm.control} name="password" render={({ field }) => (
                          <FormItem>
                            <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              <Lock size={11} color="#94a3b8" /> Password
                            </FormLabel>
                            <FormControl><Input type="password" placeholder="••••••••" className="tb-input h-12 text-sm" {...field} /></FormControl>
                            <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                          </FormItem>
                        )} />
                        <button type="submit" disabled={loginMutation.isPending} style={{
                          height: "48px", borderRadius: "14px", border: "none", cursor: "pointer",
                          fontSize: "15px", fontWeight: 700, color: "white",
                          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                          boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                          opacity: loginMutation.isPending ? 0.7 : 1,
                        }}>
                          {loginMutation.isPending ? "Signing In..." : "Sign In →"}
                        </button>
                      </form>
                    </Form>
                  )}

                  {/* ── Register step 1: Account ── */}
                  {mode === "register-1" && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "white" }}>1</div>
                        <div style={{ flex: 1, height: "2px", background: "#e2e8f0" }} />
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>2</div>
                        <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Account Setup</span>
                      </div>
                      <Form {...step1Form}>
                        <form onSubmit={step1Form.handleSubmit(onStep1)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                          <FormField control={step1Form.control} name="email" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <Mail size={11} color="#94a3b8" /> Email Address
                              </FormLabel>
                              <FormControl><Input placeholder="trader@example.com" className="tb-input h-11 text-sm" {...field} /></FormControl>
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <FormField control={step1Form.control} name="password" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <Lock size={11} color="#94a3b8" /> Password
                              </FormLabel>
                              <FormControl><Input type="password" placeholder="Min. 8 characters" className="tb-input h-11 text-sm" {...field} /></FormControl>
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <FormField control={step1Form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <Lock size={11} color="#94a3b8" /> Confirm Password
                              </FormLabel>
                              <FormControl><Input type="password" placeholder="Repeat password" className="tb-input h-11 text-sm" {...field} /></FormControl>
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <button type="submit" style={{
                            height: "48px", borderRadius: "14px", border: "none", cursor: "pointer",
                            fontSize: "15px", fontWeight: 700, color: "white",
                            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                            boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                          }}>
                            Next <ChevronRight size={16} />
                          </button>
                        </form>
                      </Form>
                    </>
                  )}

                  {/* ── Register step 2: Profile ── */}
                  {mode === "register-2" && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={12} color="white" />
                        </div>
                        <div style={{ flex: 1, height: "2px", background: "#10b981" }} />
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "white" }}>2</div>
                        <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Profile Info</span>
                      </div>
                      <Form {...step2Form}>
                        <form onSubmit={step2Form.handleSubmit(onStep2)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <FormField control={step2Form.control} name="firstName" render={({ field }) => (
                              <FormItem>
                                <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>First Name</FormLabel>
                                <FormControl><Input placeholder="John" className="tb-input h-11 text-sm" {...field} /></FormControl>
                                <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                              </FormItem>
                            )} />
                            <FormField control={step2Form.control} name="lastName" render={({ field }) => (
                              <FormItem>
                                <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Last Name</FormLabel>
                                <FormControl><Input placeholder="Doe" className="tb-input h-11 text-sm" {...field} /></FormControl>
                                <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={step2Form.control} name="username" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <User size={11} color="#94a3b8" /> Username <span style={{ color: "#94a3b8", fontWeight: 400, textTransform: "none", fontSize: "10px" }}>(optional)</span>
                              </FormLabel>
                              <FormControl><Input placeholder="trader_john" className="tb-input h-11 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }} {...field} /></FormControl>
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <FormField control={step2Form.control} name="country" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <MapPin size={11} color="#94a3b8" /> Country <span style={{ color: "#94a3b8", fontWeight: 400, textTransform: "none", fontSize: "10px" }}>(optional)</span>
                              </FormLabel>
                              <FormControl><Input placeholder="United States" className="tb-input h-11 text-sm" {...field} /></FormControl>
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <FormField control={step2Form.control} name="referralCode" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <User size={11} color="#94a3b8" /> Guild / Referral Code <span style={{ color: "#94a3b8", fontWeight: 400, textTransform: "none", fontSize: "10px" }}>(optional)</span>
                              </FormLabel>
                              <FormControl><Input placeholder="TB-GUILD-XXXXX" className="tb-input h-11 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }} {...field} /></FormControl>
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button type="button" onClick={() => setMode("register-1")} style={{
                              height: "48px", width: "48px", flexShrink: 0, borderRadius: "14px",
                              border: "1.5px solid #e2e8f0", cursor: "pointer", background: "white",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <ArrowLeft size={16} color="#64748b" />
                            </button>
                            <button type="submit" disabled={registerMutation.isPending} style={{
                              flex: 1, height: "48px", borderRadius: "14px", border: "none", cursor: "pointer",
                              fontSize: "15px", fontWeight: 700, color: "white",
                              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                              boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                              opacity: registerMutation.isPending ? 0.7 : 1,
                            }}>
                              {registerMutation.isPending ? "Creating Account..." : "Create Account →"}
                            </button>
                          </div>
                        </form>
                      </Form>
                    </>
                  )}

                </div>
              </>
            )}

            {/* Security note */}
            {mode !== "otp" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 24px 20px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                <Shield size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.4 }}>
                  All data is encrypted. We will never share your information.
                </span>
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "20px" }}>
            {["256-bit Encryption", "Insured Funds", "24/7 Support"].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Check size={10} color="#10b981" />
                <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .auth-left { display: flex !important; }
          .mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
