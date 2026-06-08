import { useState, useMemo, useRef, useCallback } from "react";
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
  ChevronRight, ArrowLeft, Key, MapPin, MessageCircle, Phone,
  AlertCircle, Eye, EyeOff
} from "lucide-react";

// ─── Country list ──────────────────────────────────────────────────────────────

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia",
  "Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Belarus","Belgium","Belize",
  "Bolivia","Bosnia","Botswana","Brazil","Bulgaria","Cambodia","Cameroon","Canada",
  "Chile","China","Colombia","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czechia",
  "Denmark","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia","Ethiopia",
  "Finland","France","Georgia","Germany","Ghana","Greece","Guatemala","Honduras",
  "Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica",
  "Japan","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyzstan","Latvia","Lebanon",
  "Libya","Lithuania","Luxembourg","Malaysia","Maldives","Malta","Mexico","Moldova",
  "Mongolia","Morocco","Mozambique","Myanmar","Nepal","Netherlands","New Zealand",
  "Nicaragua","Nigeria","Norway","Oman","Pakistan","Panama","Paraguay","Peru",
  "Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia",
  "Senegal","Serbia","Singapore","Slovakia","Slovenia","Somalia","South Africa",
  "South Korea","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan",
  "Tajikistan","Tanzania","Thailand","Tunisia","Turkey","Turkmenistan","Uganda",
  "Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay",
  "Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

// ─── Schemas ───────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Valid email required"),
});

const step2Schema = z.object({
  username: z.string().min(3, "Min 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscores only"),
  country: z.string().min(1, "Select your country"),
  telegramHandle: z.string().optional().or(z.literal("")),
  whatsappNumber: z.string().min(7, "Enter your WhatsApp number"),
});

const step3Schema = z.object({
  password: z.string().min(8, "Min 8 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

const step4Schema = z.object({
  referralCode: z.string().optional().or(z.literal("")),
  agreedToTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the Terms of Service" }) }),
  ageConfirmed: z.literal(true, { errorMap: () => ({ message: "You must be 18 or older" }) }),
});

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

const otpSchema = z.object({
  token: z.string().length(6, "Enter 6-digit code"),
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const labels = ["", "Very weak", "Weak", "Fair", "Strong", "Very strong"];
  const colors = ["#e2e8f0", "#ef4444", "#f97316", "#eab308", "#22c55e", "#059669"];
  const color = colors[strength] || "#e2e8f0";

  if (!password) return null;
  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", gap: "3px", marginBottom: "4px" }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: i <= strength ? color : "#e2e8f0", transition: "background 0.2s" }} />
        ))}
      </div>
      <p style={{ margin: 0, fontSize: "10px", color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{labels[strength]}</p>
    </div>
  );
}

const features = [
  { icon: Globe, label: "120+ Global Routes", desc: "Trade across every continent" },
  { icon: TrendingUp, label: "Avg. 16.4% Returns", desc: "On verified shipments" },
  { icon: Shield, label: "100% Insured Cargo", desc: "All transit risks covered" },
];

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", flex: i < total - 1 ? "auto" : "none" }}>
          <div style={{
            width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, fontSize: "10px", fontWeight: 700,
            background: i + 1 < current ? "#10b981" : i + 1 === current ? "#2563eb" : "#e2e8f0",
            color: i + 1 <= current ? "white" : "#94a3b8",
          }}>
            {i + 1 < current ? <Check size={11} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{ flex: 1, height: "2px", background: i + 1 < current ? "#10b981" : "#e2e8f0", minWidth: "24px" }} />
          )}
        </div>
      ))}
      <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", marginLeft: "6px", flexShrink: 0 }}>
        Step {current}/{total}
      </span>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

type Mode = "login" | "register-1" | "register-2" | "register-3" | "register-4" | "otp";

type RegData = {
  step1?: z.infer<typeof step1Schema>;
  step2?: z.infer<typeof step2Schema>;
  step3?: z.infer<typeof step3Schema>;
};

type AvailStatus = "idle" | "checking" | "available" | "taken";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [regData, setRegData] = useState<RegData>({});
  const [tempToken, setTempToken] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailAvail, setEmailAvail] = useState<AvailStatus>("idle");
  const [usernameAvail, setUsernameAvail] = useState<AvailStatus>("idle");
  const emailDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkEmail = useCallback((value: string) => {
    if (emailDebounce.current) clearTimeout(emailDebounce.current);
    const trimmed = value.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailAvail("idle"); return; }
    setEmailAvail("checking");
    emailDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field: "email", value: trimmed }),
        });
        if (res.ok) {
          const data = await res.json();
          setEmailAvail(data.available ? "available" : "taken");
        }
      } catch { setEmailAvail("idle"); }
    }, 400);
  }, []);

  const checkUsername = useCallback((value: string) => {
    if (usernameDebounce.current) clearTimeout(usernameDebounce.current);
    const trimmed = value.trim();
    if (!trimmed || !/^[a-zA-Z0-9_]{3,}$/.test(trimmed)) { setUsernameAvail("idle"); return; }
    setUsernameAvail("checking");
    usernameDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field: "username", value: trimmed }),
        });
        if (res.ok) {
          const data = await res.json();
          setUsernameAvail(data.available ? "available" : "taken");
        }
      } catch { setUsernameAvail("idle"); }
    }, 400);
  }, []);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const completeTwoFa = useTwoFaComplete();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const step1Form = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: { firstName: "", lastName: "", email: "" },
  });
  const step2Form = useForm<z.infer<typeof step2Schema>>({
    resolver: zodResolver(step2Schema),
    defaultValues: { username: "", country: "", telegramHandle: "", whatsappNumber: "" },
  });
  const step3Form = useForm<z.infer<typeof step3Schema>>({
    resolver: zodResolver(step3Schema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const step4Form = useForm<z.infer<typeof step4Schema>>({
    resolver: zodResolver(step4Schema),
    defaultValues: { referralCode: "", agreedToTerms: undefined as any, ageConfirmed: undefined as any },
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
        toast({ title: "Login failed", description: err?.data?.error || "Invalid credentials", variant: "destructive" }),
    });
  };

  // ── OTP ──────────────────────────────────────────────────────────────────────

  const onOtp = (data: z.infer<typeof otpSchema>) => {
    completeTwoFa.mutate({ tempToken, token: data.token }, {
      onSuccess: (res) => { login(res.token, res.user); setLocation("/market"); },
      onError: (err: any) =>
        toast({ title: "Invalid code", description: err?.data?.error || "Try again", variant: "destructive" }),
    });
  };

  // ── Registration steps ───────────────────────────────────────────────────────

  const onStep1 = (data: z.infer<typeof step1Schema>) => {
    setRegData(prev => ({ ...prev, step1: data }));
    setMode("register-2");
  };
  const onStep2 = (data: z.infer<typeof step2Schema>) => {
    setRegData(prev => ({ ...prev, step2: data }));
    setMode("register-3");
  };
  const onStep3 = (data: z.infer<typeof step3Schema>) => {
    setRegData(prev => ({ ...prev, step3: data }));
    setMode("register-4");
  };

  // ── Final atomic submission ──────────────────────────────────────────────────

  const onStep4 = (data: z.infer<typeof step4Schema>) => {
    const { step1, step2, step3 } = regData;
    if (!step1 || !step2 || !step3) return;

    registerMutation.mutate({
      data: {
        email: step1.email,
        password: step3.password,
        firstName: step1.firstName,
        lastName: step1.lastName,
        username: step2.username || undefined,
        country: step2.country,
        telegramHandle: step2.telegramHandle || undefined,
        whatsappNumber: step2.whatsappNumber || undefined,
        referralCode: data.referralCode || undefined,
        agreedToTerms: data.agreedToTerms,
        ageConfirmed: data.ageConfirmed,
      } as any,
    }, {
      onSuccess: (res: any) => {
        login(res.token, res.user);
        toast({ title: "Welcome to TradeBox!", description: `Your Trader ID: ${res.user.traderId}` });
        setLocation("/market");
      },
      onError: (err: any) =>
        toast({ title: "Registration failed", description: err?.data?.error || err.message, variant: "destructive" }),
    });
  };

  const isRegMode = mode.startsWith("register");
  const regStep = isRegMode ? parseInt(mode.split("-")[1]) : 0;

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

            {/* ── OTP ── */}
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
                          <Input {...field} placeholder="000000" maxLength={6} className="tb-input h-14 text-center text-2xl tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.3em" }} />
                        </FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <button type="submit" disabled={completeTwoFa.isPending} style={{ height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.35)", opacity: completeTwoFa.isPending ? 0.7 : 1 }}>
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
            {mode !== "otp" && (
              <>
                <div style={{ display: "flex", padding: "6px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <button onClick={() => setMode("login")} style={{ flex: 1, padding: "10px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: mode === "login" ? 700 : 500, background: mode === "login" ? "#ffffff" : "transparent", color: mode === "login" ? "#2563eb" : "#94a3b8", boxShadow: mode === "login" ? "0 1px 6px rgba(0,0,0,0.1)" : "none" }}>Sign In</button>
                  <button onClick={() => setMode("register-1")} style={{ flex: 1, padding: "10px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: isRegMode ? 700 : 500, background: isRegMode ? "#ffffff" : "transparent", color: isRegMode ? "#2563eb" : "#94a3b8", boxShadow: isRegMode ? "0 1px 6px rgba(0,0,0,0.1)" : "none" }}>Register</button>
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
                        <button type="submit" disabled={loginMutation.isPending} style={{ height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.35)", opacity: loginMutation.isPending ? 0.7 : 1 }}>
                          {loginMutation.isPending ? "Signing In..." : "Sign In →"}
                        </button>
                      </form>
                    </Form>
                  )}

                  {/* ── Step 1: Personal Info ── */}
                  {mode === "register-1" && (
                    <>
                      <StepBar current={1} total={4} />
                      <p style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Personal Information</p>
                      <Form {...step1Form}>
                        <form onSubmit={step1Form.handleSubmit(onStep1)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <FormField control={step1Form.control} name="firstName" render={({ field }) => (
                              <FormItem>
                                <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>First Name</FormLabel>
                                <FormControl><Input placeholder="John" className="tb-input h-11 text-sm" {...field} /></FormControl>
                                <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                              </FormItem>
                            )} />
                            <FormField control={step1Form.control} name="lastName" render={({ field }) => (
                              <FormItem>
                                <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Last Name</FormLabel>
                                <FormControl><Input placeholder="Doe" className="tb-input h-11 text-sm" {...field} /></FormControl>
                                <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={step1Form.control} name="email" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <Mail size={11} color="#94a3b8" /> Email Address
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="trader@example.com"
                                  className="tb-input h-11 text-sm"
                                  {...field}
                                  onChange={e => { field.onChange(e); setEmailAvail("idle"); }}
                                  onBlur={e => { field.onBlur(); checkEmail(e.target.value); }}
                                />
                              </FormControl>
                              {emailAvail === "checking" && <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#64748b" }}>Checking availability…</p>}
                              {emailAvail === "taken" && <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#dc2626" }}>Email already registered</p>}
                              {emailAvail === "available" && <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#22c55e" }}>✓ Email is available</p>}
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <button type="submit" style={{ height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                            Next <ChevronRight size={16} />
                          </button>
                        </form>
                      </Form>
                    </>
                  )}

                  {/* ── Step 2: Contact & Location ── */}
                  {mode === "register-2" && (
                    <>
                      <StepBar current={2} total={4} />
                      <p style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Contact & Location</p>
                      <Form {...step2Form}>
                        <form onSubmit={step2Form.handleSubmit(onStep2)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                          <FormField control={step2Form.control} name="username" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <User size={11} color="#94a3b8" /> Username
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="trader_john"
                                  className="tb-input h-11 text-sm"
                                  {...field}
                                  onChange={e => { field.onChange(e); setUsernameAvail("idle"); }}
                                  onBlur={e => { field.onBlur(); checkUsername(e.target.value); }}
                                />
                              </FormControl>
                              {usernameAvail === "checking" && <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#64748b" }}>Checking availability…</p>}
                              {usernameAvail === "taken" && <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#dc2626" }}>Username already taken</p>}
                              {usernameAvail === "available" && <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#22c55e" }}>✓ Username is available</p>}
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <FormField control={step2Form.control} name="country" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <MapPin size={11} color="#94a3b8" /> Country
                              </FormLabel>
                              <FormControl>
                                <select
                                  {...field}
                                  style={{ width: "100%", height: "44px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: "13px", color: field.value ? "#0f172a" : "#94a3b8", padding: "0 12px", outline: "none", appearance: "none", cursor: "pointer" }}
                                >
                                  <option value="">Select your country</option>
                                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </FormControl>
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <FormField control={step2Form.control} name="telegramHandle" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <MessageCircle size={11} color="#94a3b8" /> Telegram <span style={{ color: "#cbd5e1", fontWeight: 400 }}>(optional)</span>
                              </FormLabel>
                              <FormControl><Input placeholder="@username" className="tb-input h-11 text-sm" {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={step2Form.control} name="whatsappNumber" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <Phone size={11} color="#94a3b8" /> WhatsApp
                              </FormLabel>
                              <FormControl><Input placeholder="+1 555 000 0000" className="tb-input h-11 text-sm" {...field} /></FormControl>
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button type="button" onClick={() => setMode("register-1")} style={{ height: "48px", flex: "0 0 48px", borderRadius: "14px", border: "1.5px solid #e2e8f0", cursor: "pointer", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <ArrowLeft size={16} color="#64748b" />
                            </button>
                            <button type="submit" style={{ flex: 1, height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                              Next <ChevronRight size={16} />
                            </button>
                          </div>
                        </form>
                      </Form>
                    </>
                  )}

                  {/* ── Step 3: Security ── */}
                  {mode === "register-3" && (
                    <>
                      <StepBar current={3} total={4} />
                      <p style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Create Password</p>
                      <Form {...step3Form}>
                        <form onSubmit={step3Form.handleSubmit(onStep3)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                          <FormField control={step3Form.control} name="password" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <Lock size={11} color="#94a3b8" /> Password
                              </FormLabel>
                              <FormControl>
                                <div style={{ position: "relative" }}>
                                  <Input type={showPw ? "text" : "password"} placeholder="Min. 8 characters" className="tb-input h-11 text-sm" style={{ paddingRight: "40px" }} {...field} />
                                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                    {showPw ? <EyeOff size={14} color="#94a3b8" /> : <Eye size={14} color="#94a3b8" />}
                                  </button>
                                </div>
                              </FormControl>
                              <PasswordStrength password={field.value} />
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <FormField control={step3Form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <Lock size={11} color="#94a3b8" /> Confirm Password
                              </FormLabel>
                              <FormControl>
                                <div style={{ position: "relative" }}>
                                  <Input type={showConfirm ? "text" : "password"} placeholder="Repeat password" className="tb-input h-11 text-sm" style={{ paddingRight: "40px" }} {...field} />
                                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                    {showConfirm ? <EyeOff size={14} color="#94a3b8" /> : <Eye size={14} color="#94a3b8" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button type="button" onClick={() => setMode("register-2")} style={{ height: "48px", flex: "0 0 48px", borderRadius: "14px", border: "1.5px solid #e2e8f0", cursor: "pointer", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <ArrowLeft size={16} color="#64748b" />
                            </button>
                            <button type="submit" style={{ flex: 1, height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                              Next <ChevronRight size={16} />
                            </button>
                          </div>
                        </form>
                      </Form>
                    </>
                  )}

                  {/* ── Step 4: Compliance ── */}
                  {mode === "register-4" && (
                    <>
                      <StepBar current={4} total={4} />
                      <p style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Almost There!</p>
                      <Form {...step4Form}>
                        <form onSubmit={step4Form.handleSubmit(onStep4)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                          <FormField control={step4Form.control} name="referralCode" render={({ field }) => (
                            <FormItem>
                              <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                <Key size={11} color="#94a3b8" /> Referral Code <span style={{ color: "#cbd5e1", fontWeight: 400 }}>(optional)</span>
                              </FormLabel>
                              <FormControl><Input placeholder="TB-GUILD-XXXXX" className="tb-input h-11 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }} {...field} /></FormControl>
                            </FormItem>
                          )} />

                          {/* T&C */}
                          <FormField control={step4Form.control} name="agreedToTerms" render={({ field }) => (
                            <FormItem>
                              <div
                                onClick={() => field.onChange(field.value ? undefined : true)}
                                style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 14px", borderRadius: "12px", border: `1.5px solid ${step4Form.formState.errors.agreedToTerms ? "#fca5a5" : field.value ? "#bfdbfe" : "#e2e8f0"}`, background: field.value ? "#eff6ff" : "#f8fafc", cursor: "pointer" }}
                              >
                                <div style={{ width: "18px", height: "18px", borderRadius: "5px", background: field.value ? "#2563eb" : "white", border: `1.5px solid ${field.value ? "#2563eb" : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                                  {field.value && <Check size={11} color="white" />}
                                </div>
                                <p style={{ margin: 0, fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
                                  I agree to the <span style={{ color: "#2563eb", fontWeight: 600 }}>Terms of Service</span> and <span style={{ color: "#2563eb", fontWeight: 600 }}>Privacy Policy</span>
                                </p>
                              </div>
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />

                          {/* Age */}
                          <FormField control={step4Form.control} name="ageConfirmed" render={({ field }) => (
                            <FormItem>
                              <div
                                onClick={() => field.onChange(field.value ? undefined : true)}
                                style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 14px", borderRadius: "12px", border: `1.5px solid ${step4Form.formState.errors.ageConfirmed ? "#fca5a5" : field.value ? "#bfdbfe" : "#e2e8f0"}`, background: field.value ? "#eff6ff" : "#f8fafc", cursor: "pointer" }}
                              >
                                <div style={{ width: "18px", height: "18px", borderRadius: "5px", background: field.value ? "#2563eb" : "white", border: `1.5px solid ${field.value ? "#2563eb" : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                                  {field.value && <Check size={11} color="white" />}
                                </div>
                                <p style={{ margin: 0, fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
                                  I confirm I am <strong>18 years of age or older</strong>
                                </p>
                              </div>
                              <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                            </FormItem>
                          )} />

                          {/* Info banner */}
                          <div style={{ padding: "10px 12px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", gap: "8px" }}>
                            <AlertCircle size={14} color="#16a34a" style={{ flexShrink: 0, marginTop: "1px" }} />
                            <p style={{ margin: 0, fontSize: "11px", color: "#166534", lineHeight: 1.5 }}>
                              By registering, your Trader ID and Guild Code will be generated automatically.
                            </p>
                          </div>

                          <div style={{ display: "flex", gap: "10px" }}>
                            <button type="button" onClick={() => setMode("register-3")} style={{ height: "52px", flex: "0 0 52px", borderRadius: "14px", border: "1.5px solid #e2e8f0", cursor: "pointer", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <ArrowLeft size={16} color="#64748b" />
                            </button>
                            <button type="submit" disabled={registerMutation.isPending} style={{ flex: 1, height: "52px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.35)", opacity: registerMutation.isPending ? 0.7 : 1 }}>
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

          </div>

          {/* Footer */}
          <p style={{ textAlign: "center", marginTop: "16px", fontSize: "10px", color: "#cbd5e1", fontFamily: "'JetBrains Mono', monospace" }}>
            © 2026 TradeBox · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
