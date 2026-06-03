import { useState } from "react";
import { useGetProfile } from "@workspace/api-client-react";
import {
  useTwoFaSetup, useTwoFaVerify, useTwoFaDisable
} from "@workspace/api-client-react/src/extra-hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import QRCode from "react-qr-code";
import {
  Shield, Smartphone, Key, AlertTriangle, Copy, Check, X, ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "10px" }}>
      {children}
    </div>
  );
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

const otpSchema = z.object({ token: z.string().length(6, "Enter 6 digits") });
const disableSchema = z.object({ token: z.string().min(6, "Enter OTP or recovery code") });

// ─── Main ─────────────────────────────────────────────────────────────────────

type Section = "overview" | "setup" | "codes" | "disable";

export default function SecurityPage() {
  const { data: profile, refetch } = useGetProfile();
  const setupTwoFa = useTwoFaSetup();
  const verifyTwoFa = useTwoFaVerify();
  const disableTwoFa = useTwoFaDisable();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [section, setSection] = useState<Section>("overview");
  const [qrData, setQrData] = useState<{ secret: string; qrCode: string; otpauth: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: "" },
  });
  const disableForm = useForm<z.infer<typeof disableSchema>>({
    resolver: zodResolver(disableSchema),
    defaultValues: { token: "" },
  });

  const on2FaSetup = () => {
    setupTwoFa.mutate(undefined, {
      onSuccess: (data: any) => {
        setQrData(data);
        setSection("setup");
      },
      onError: (err: any) => toast({ title: "Error", description: err?.data?.error || "Failed to start 2FA setup", variant: "destructive" }),
    });
  };

  const onVerify = (data: z.infer<typeof otpSchema>) => {
    verifyTwoFa.mutate({ token: data.token }, {
      onSuccess: (res: any) => {
        setRecoveryCodes(res.recoveryCodes || []);
        setSection("codes");
        refetch();
        otpForm.reset();
        toast({ title: "2FA enabled!", description: "Save your recovery codes." });
      },
      onError: (err: any) => toast({ title: "Invalid code", description: err?.data?.error || "Try again", variant: "destructive" }),
    });
  };

  const onDisable = (data: z.infer<typeof disableSchema>) => {
    disableTwoFa.mutate({ token: data.token }, {
      onSuccess: () => {
        setSection("overview");
        refetch();
        disableForm.reset();
        toast({ title: "2FA disabled" });
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error || "Invalid code", variant: "destructive" }),
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const enabled = profile?.twoFactorEnabled;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb", padding: "0 0 40px" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "16px 16px 0" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", paddingTop: "8px" }}>
          <button
            onClick={() => section !== "overview" ? setSection("overview") : setLocation("/profile")}
            style={{ width: "36px", height: "36px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <ArrowLeft size={16} color="#64748b" />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>Two-Factor Authentication</h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Account security settings</p>
          </div>
        </div>

        {/* ── Overview ── */}
        {section === "overview" && (
          <>
            {/* Status card */}
            <div style={{ background: enabled ? "linear-gradient(135deg, #ecfdf5, #d1fae5)" : "linear-gradient(135deg, #fffbeb, #fef3c7)", borderRadius: "18px", padding: "20px", marginBottom: "12px", border: `1px solid ${enabled ? "#a7f3d0" : "#fde68a"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: enabled ? "#059669" : "#d97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Shield size={22} color="white" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>
                    2FA is {enabled ? "Enabled" : "Disabled"}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: enabled ? "#065f46" : "#92400e" }}>
                    {enabled
                      ? "Your account has an extra layer of security"
                      : "Add extra security to protect your account"}
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader icon={Smartphone} title="Authenticator App" color="#2563eb" />
              <div style={{ padding: "14px 16px" }}>
                <p style={{ margin: "0 0 14px", fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
                  Use an authenticator app like Google Authenticator, Authy, or 1Password to generate time-based codes for signing in.
                </p>
                {!enabled ? (
                  <button
                    onClick={on2FaSetup}
                    disabled={setupTwoFa.isPending}
                    style={{ width: "100%", height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 4px 16px rgba(5,150,105,0.3)", opacity: setupTwoFa.isPending ? 0.7 : 1 }}
                  >
                    {setupTwoFa.isPending ? "Setting up..." : "Set Up 2FA"}
                  </button>
                ) : (
                  <button
                    onClick={() => { disableForm.reset(); setSection("disable"); }}
                    style={{ width: "100%", height: "48px", borderRadius: "14px", border: "1.5px solid #fecaca", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "#dc2626", background: "#fef2f2" }}
                  >
                    Disable 2FA
                  </button>
                )}
              </div>
            </Card>

            {enabled && (
              <Card>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#fef3c715", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Key size={15} color="#d97706" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>Recovery Codes</p>
                      <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8" }}>Keep these safe for account recovery</p>
                    </div>
                    <div style={{ padding: "3px 8px", borderRadius: "20px", background: "#fffbeb", border: "1px solid #fde68a" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#d97706" }}>KEEP SAFE</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── Setup ── */}
        {section === "setup" && qrData && (
          <Card>
            <CardHeader icon={Shield} title="Set Up 2FA" color="#059669" />
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "white", flexShrink: 0 }}>1</div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>Scan this QR code with your authenticator app</span>
                </div>
                <div style={{ display: "flex", justifyContent: "center", padding: "20px", background: "#f8fafc", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                  <div style={{ background: "white", padding: "12px", borderRadius: "8px" }}>
                    <QRCode value={qrData.otpauth} size={160} />
                  </div>
                </div>
              </div>

              <div style={{ padding: "12px 14px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Manual Entry Code</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <code style={{ flex: 1, fontSize: "12px", color: "#0f172a", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", wordBreak: "break-all" }}>
                    {qrData.secret}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(qrData.secret); toast({ title: "Copied!" }); }} style={{ padding: "5px 10px", borderRadius: "8px", background: "#eff6ff", border: "1px solid #bfdbfe", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#2563eb", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    <Copy size={11} /> Copy
                  </button>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "white", flexShrink: 0 }}>2</div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>Enter the 6-digit code to confirm</span>
                </div>
                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onVerify)} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <FormField control={otpForm.control} name="token" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="000000" maxLength={6} className="tb-input h-14 text-center text-2xl tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.3em" }} />
                        </FormControl>
                        <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                      </FormItem>
                    )} />
                    <button type="submit" disabled={verifyTwoFa.isPending} style={{ height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 4px 16px rgba(5,150,105,0.3)", opacity: verifyTwoFa.isPending ? 0.7 : 1 }}>
                      {verifyTwoFa.isPending ? "Verifying..." : "Enable 2FA"}
                    </button>
                  </form>
                </Form>
              </div>
            </div>
          </Card>
        )}

        {/* ── Recovery Codes ── */}
        {section === "codes" && (
          <Card>
            <CardHeader icon={Key} title="Recovery Codes" color="#d97706" />
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ padding: "12px 14px", borderRadius: "12px", background: "#fffbeb", border: "1px solid #fde68a", display: "flex", gap: "10px" }}>
                <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
                <p style={{ margin: 0, fontSize: "12px", color: "#92400e", lineHeight: 1.5 }}>
                  Save these codes in a safe place. Each can be used once to sign in if you lose access to your authenticator app.
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {recoveryCodes.map((code, i) => (
                  <button key={i} onClick={() => copyCode(code)} style={{ padding: "10px 12px", borderRadius: "10px", background: copiedCode === code ? "#ecfdf5" : "#f8fafc", border: `1px solid ${copiedCode === code ? "#a7f3d0" : "#e2e8f0"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                    <code style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "#0f172a", letterSpacing: "0.05em" }}>{code}</code>
                    {copiedCode === code ? <Check size={11} color="#059669" /> : <Copy size={11} color="#94a3b8" />}
                  </button>
                ))}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(recoveryCodes.join("\n")); toast({ title: "All codes copied!" }); }} style={{ height: "42px", borderRadius: "12px", border: "1.5px solid #e2e8f0", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#64748b", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Copy size={13} /> Copy All Codes
              </button>
              <button onClick={() => setSection("overview")} style={{ height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.3)" }}>
                Done — I've saved my codes
              </button>
            </div>
          </Card>
        )}

        {/* ── Disable ── */}
        {section === "disable" && (
          <Card>
            <CardHeader icon={X} title="Disable 2FA" color="#ef4444" />
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "12px 14px", borderRadius: "12px", background: "#fef2f2", border: "1px solid #fecaca", display: "flex", gap: "10px" }}>
                <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                <p style={{ margin: 0, fontSize: "12px", color: "#991b1b", lineHeight: 1.5 }}>
                  Disabling 2FA reduces your account security. Enter your authenticator code or a recovery code to confirm.
                </p>
              </div>
              <Form {...disableForm}>
                <form onSubmit={disableForm.handleSubmit(onDisable)} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <FormField control={disableForm.control} name="token" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        OTP Code or Recovery Code
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="000000 or XXXX-XXXX" className="tb-input h-14 text-center tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", letterSpacing: "0.2em" }} />
                      </FormControl>
                      <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                    </FormItem>
                  )} />
                  <button type="submit" disabled={disableTwoFa.isPending} style={{ height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)", opacity: disableTwoFa.isPending ? 0.7 : 1 }}>
                    {disableTwoFa.isPending ? "Disabling..." : "Disable 2FA"}
                  </button>
                </form>
              </Form>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
