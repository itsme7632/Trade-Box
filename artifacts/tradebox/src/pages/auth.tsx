import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-context";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Anchor, Globe, Shield, TrendingUp, Lock, Mail, User, Check } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  referralCode: z.string().optional(),
});

const features = [
  { icon: Globe, label: "120+ Global Routes", desc: "Trade across every continent" },
  { icon: TrendingUp, label: "Avg. 16.4% Returns", desc: "On verified shipments" },
  { icon: Shield, label: "100% Insured Cargo", desc: "All transit risks covered" },
];

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", referralCode: "" },
  });

  const onLogin = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => { login(res.token, res.user); setLocation("/market"); },
      onError: (err: any) => toast({ title: "Login failed", description: err.message || "Invalid credentials", variant: "destructive" }),
    });
  };

  const onRegister = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(
      { data: { email: data.email, password: data.password, referralCode: data.referralCode || undefined } },
      {
        onSuccess: (res) => {
          login(res.token, res.user);
          toast({ title: "Welcome aboard!", description: `Your Trader ID: ${res.user.traderId}` });
          setLocation("/market");
        },
        onError: (err: any) => toast({ title: "Registration failed", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f6f8fb" }}>

      {/* Left panel — desktop only */}
      <div style={{
        display: "none",
        width: "50%",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px",
        background: "linear-gradient(145deg, #1e3a8a, #1d4ed8)",
        position: "relative",
        overflow: "hidden",
      }} className="auth-left">

        {/* Subtle pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div style={{ position: "absolute", bottom: "-80px", right: "-80px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", top: "-40px", left: "-40px", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.2)" }}>
            <Anchor size={18} color="white" />
          </div>
          <span style={{ fontSize: "20px", fontWeight: 700, color: "white", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>TradeBox</span>
        </div>

        {/* Main copy */}
        <div style={{ position: "relative" }}>
          <h1 style={{ margin: "0 0 16px", fontSize: "38px", fontWeight: 800, color: "white", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            Global Trade<br />
            <span style={{ color: "#93c5fd" }}>Finance Platform</span>
          </h1>
          <p style={{ margin: "0 0 40px", fontSize: "15px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: "380px" }}>
            Fund international shipments, earn returns on real-world trade routes, and track your cargo in real time.
          </p>

          {/* Feature list */}
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

      {/* Right panel — auth form */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "#f6f8fb",
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {/* Mobile logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }} className="mobile-logo">
            <div style={{
              width: "52px", height: "52px", borderRadius: "16px",
              background: "linear-gradient(135deg, #2563eb, #0891b2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(37,99,235,0.3)",
              marginBottom: "12px",
            }}>
              <Anchor size={24} color="white" />
            </div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              TradeBox
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Global Trade Finance Portal
            </p>
          </div>

          {/* Auth card */}
          <div style={{
            background: "#ffffff",
            borderRadius: "24px",
            boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 0 0 1px #e8edf2",
            overflow: "hidden",
          }}>
            {/* Tab switcher */}
            <div style={{ display: "flex", padding: "6px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              <button onClick={() => setIsLogin(true)} style={{
                flex: 1, padding: "10px", borderRadius: "14px", border: "none", cursor: "pointer",
                fontSize: "13px", fontWeight: isLogin ? 700 : 500,
                fontFamily: "'Space Grotesk', sans-serif",
                background: isLogin ? "#ffffff" : "transparent",
                color: isLogin ? "#2563eb" : "#94a3b8",
                boxShadow: isLogin ? "0 1px 6px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s ease",
              }}>
                Sign In
              </button>
              <button onClick={() => setIsLogin(false)} style={{
                flex: 1, padding: "10px", borderRadius: "14px", border: "none", cursor: "pointer",
                fontSize: "13px", fontWeight: !isLogin ? 700 : 500,
                fontFamily: "'Space Grotesk', sans-serif",
                background: !isLogin ? "#ffffff" : "transparent",
                color: !isLogin ? "#2563eb" : "#94a3b8",
                boxShadow: !isLogin ? "0 1px 6px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s ease",
              }}>
                Register
              </button>
            </div>

            <div style={{ padding: "28px 24px" }}>
              {isLogin ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <FormField control={loginForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          <Mail size={11} color="#94a3b8" /> Email Address
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="trader@example.com" className="tb-input h-12 text-sm" {...field} />
                        </FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <FormField control={loginForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          <Lock size={11} color="#94a3b8" /> Password
                        </FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="tb-input h-12 text-sm" {...field} />
                        </FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <button type="submit" disabled={loginMutation.isPending} style={{
                      height: "48px", borderRadius: "14px", border: "none", cursor: "pointer",
                      fontSize: "15px", fontWeight: 700, color: "white",
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                      fontFamily: "'Space Grotesk', sans-serif",
                      opacity: loginMutation.isPending ? 0.7 : 1,
                      transition: "all 0.2s ease",
                    }}>
                      {loginMutation.isPending ? "Signing In..." : "Sign In →"}
                    </button>
                  </form>
                </Form>
              ) : (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <FormField control={registerForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          <Mail size={11} color="#94a3b8" /> Email Address
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="trader@example.com" className="tb-input h-12 text-sm" {...field} />
                        </FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <FormField control={registerForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          <Lock size={11} color="#94a3b8" /> Password
                        </FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min. 6 characters" className="tb-input h-12 text-sm" {...field} />
                        </FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <FormField control={registerForm.control} name="referralCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          <User size={11} color="#94a3b8" /> Guild Code
                          <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 400, textTransform: "none" }}>(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="TB-XXXX" className="tb-input h-12 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }} {...field} />
                        </FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <button type="submit" disabled={registerMutation.isPending} style={{
                      height: "48px", borderRadius: "14px", border: "none", cursor: "pointer",
                      fontSize: "15px", fontWeight: 700, color: "white",
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                      fontFamily: "'Space Grotesk', sans-serif",
                      opacity: registerMutation.isPending ? 0.7 : 1,
                    }}>
                      {registerMutation.isPending ? "Creating Account..." : "Create Account →"}
                    </button>
                  </form>
                </Form>
              )}

              {/* Security note */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                <Shield size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.4 }}>
                  All transactions are encrypted and protected by industry-standard security.
                </span>
              </div>
            </div>
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
