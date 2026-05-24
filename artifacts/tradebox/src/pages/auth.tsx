import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/components/auth-context";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Anchor } from "lucide-react";

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
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          login(res.token, res.user);
          setLocation("/market");
        },
        onError: (err: any) => {
          toast({
            title: "Login failed",
            description: err.message || "Invalid credentials",
            variant: "destructive",
          });
        },
      }
    );
  };

  const onRegister = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(
      { data: { email: data.email, password: data.password, referralCode: data.referralCode || undefined } },
      {
        onSuccess: (res) => {
          login(res.token, res.user);
          toast({
            title: "Registration successful",
            description: `Welcome! Your trader ID is ${res.user.traderId}`,
          });
          setLocation("/market");
        },
        onError: (err: any) => {
          toast({
            title: "Registration failed",
            description: err.message || "Could not register",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl border border-[#EEF2F8] shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="bg-[#0066FF]/10 p-4 rounded-full mb-4">
            <Anchor className="h-10 w-10 text-[#0066FF]" />
          </div>
          <h2 className="text-3xl font-heading font-bold text-[#0F1923] tracking-tight">TradeBox</h2>
          <p className="text-[#6A82A0] mt-2 font-mono text-sm uppercase">Global Trade Finance Portal</p>
        </div>

        {isLogin ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#3A4E66] font-mono text-xs uppercase">Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="trader@example.com" className="bg-[#F8FAFD] border-[#EEF2F8] text-[#0F1923] focus:border-[#0066FF] font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#3A4E66] font-mono text-xs uppercase">Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="bg-[#F8FAFD] border-[#EEF2F8] text-[#0F1923] focus:border-[#0066FF] font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-heading tracking-wide" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Authenticating..." : "Access Terminal"}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-6">
              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#3A4E66] font-mono text-xs uppercase">Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="trader@example.com" className="bg-[#F8FAFD] border-[#EEF2F8] text-[#0F1923] focus:border-[#0066FF] font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#3A4E66] font-mono text-xs uppercase">Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="bg-[#F8FAFD] border-[#EEF2F8] text-[#0F1923] focus:border-[#0066FF] font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#3A4E66] font-mono text-xs uppercase">Referral Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="TB-XXXX" className="bg-[#F8FAFD] border-[#EEF2F8] text-[#0F1923] focus:border-[#0066FF] font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-heading tracking-wide" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Initializing..." : "Register Account"}
              </Button>
            </form>
          </Form>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#0066FF] hover:text-[#0052CC] text-sm font-mono transition-colors"
          >
            {isLogin ? "Request New Trader ID" : "Existing Trader Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
