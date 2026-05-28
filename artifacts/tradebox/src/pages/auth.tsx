import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-context";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Anchor, Globe, Shield, TrendingUp, Lock, Mail, User } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  referralCode: z.string().optional(),
});

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
    <div className="min-h-screen flex bg-[#050D1B]">
      {/* Left panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(37,99,235,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.1) 0%, transparent 50%)" }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2563EB, #0891B2)", boxShadow: "0 0 24px rgba(37,99,235,0.5)" }}>
            <Anchor className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>TradeBox</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em" }}>
              Global Trade<br />
              <span style={{ background: "linear-gradient(135deg, #60A5FA, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Finance Platform
              </span>
            </h1>
            <p className="text-[#64748B] text-base leading-relaxed max-w-sm">
              Fund international shipments, earn returns on real-world trade routes, and track your cargo in real time.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Globe, label: "Global Routes", value: "120+" },
              { icon: TrendingUp, label: "Avg Returns", value: "16.4%" },
              { icon: Shield, label: "Insured Cargo", value: "100%" },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl p-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <stat.icon className="h-4 w-4 text-[#3B82F6] mb-2" />
                <div className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</div>
                <div className="text-[11px] text-[#475569] font-mono mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[#334155] text-xs font-mono relative z-10">© 2026 TradeBox · Global Trade Finance Portal</div>
      </div>

      {/* Right panel - auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 lg:hidden"
          style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(37,99,235,0.12) 0%, transparent 60%)" }} />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, #2563EB, #0891B2)", boxShadow: "0 0 30px rgba(37,99,235,0.5)" }}>
              <Anchor className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>TradeBox</h2>
            <p className="text-[#475569] text-xs font-mono mt-1 uppercase tracking-widest">Global Trade Finance Portal</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8"
            style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}>

            {/* Tab toggle */}
            <div className="flex p-1 rounded-xl mb-8"
              style={{ background: "rgba(5,13,27,0.8)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <button
                onClick={() => setIsLogin(true)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={isLogin ? {
                  background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                  color: "white",
                  boxShadow: "0 2px 12px rgba(37,99,235,0.4)",
                  fontFamily: "'Space Grotesk', sans-serif"
                } : { color: "#475569" }}>
                Sign In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={!isLogin ? {
                  background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                  color: "white",
                  boxShadow: "0 2px 12px rgba(37,99,235,0.4)",
                  fontFamily: "'Space Grotesk', sans-serif"
                } : { color: "#475569" }}>
                Register
              </button>
            </div>

            {isLogin ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                  <FormField control={loginForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#64748B] text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> Email Address
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="trader@example.com" className="tb-input h-12 text-sm" {...field} />
                      </FormControl>
                      <FormMessage className="text-[#EF4444] text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#64748B] text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="h-3 w-3" /> Password
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" className="tb-input h-12 text-sm" {...field} />
                      </FormControl>
                      <FormMessage className="text-[#EF4444] text-xs" />
                    </FormItem>
                  )} />
                  <button type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full h-12 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-60 mt-2"
                    style={{
                      background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                      boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}>
                    {loginMutation.isPending ? "Authenticating..." : "Access Terminal"}
                  </button>
                </form>
              </Form>
            ) : (
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
                  <FormField control={registerForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#64748B] text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> Email Address
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="trader@example.com" className="tb-input h-12 text-sm" {...field} />
                      </FormControl>
                      <FormMessage className="text-[#EF4444] text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={registerForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#64748B] text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="h-3 w-3" /> Password
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Min. 6 characters" className="tb-input h-12 text-sm" {...field} />
                      </FormControl>
                      <FormMessage className="text-[#EF4444] text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={registerForm.control} name="referralCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#64748B] text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <User className="h-3 w-3" /> Guild Code <span className="text-[#334155] normal-case">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="TB-XXXX" className="tb-input h-12 text-sm font-mono" {...field} />
                      </FormControl>
                      <FormMessage className="text-[#EF4444] text-xs" />
                    </FormItem>
                  )} />
                  <button type="submit"
                    disabled={registerMutation.isPending}
                    className="w-full h-12 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-60 mt-2"
                    style={{
                      background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                      boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}>
                    {registerMutation.isPending ? "Creating Account..." : "Create Trader Account"}
                  </button>
                </form>
              </Form>
            )}

            <div className="mt-6 pt-6 flex items-center gap-3 text-xs text-[#334155]"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <Shield className="h-3.5 w-3.5 text-[#1E3A5F] shrink-0" />
              <span>All transactions are encrypted and protected by industry-standard security.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
