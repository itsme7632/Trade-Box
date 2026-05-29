import { useState } from "react";
import { useLocation } from "wouter";
import {
  MessageSquare, Mail, Phone, Users, Megaphone, HelpCircle,
  BookOpen, Send, AlertCircle, Lightbulb, Copy, Check,
  ExternalLink, ChevronRight, ArrowLeft, Globe, Anchor
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// ─── shared ───────────────────────────────────────────────────────────────────

function Card({ children, noPad }: { children: React.ReactNode; noPad?: boolean }) {
  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e8edf2",
      borderRadius: "18px", overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "12px",
    }}>
      {noPad ? children : <div style={{ padding: "16px" }}>{children}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: "20px 0 10px", fontSize: "12px", fontWeight: 700, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {children}
    </h2>
  );
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{
      display: "flex", alignItems: "center", gap: "4px",
      padding: "5px 10px", borderRadius: "8px",
      background: copied ? "#ecfdf5" : "#f1f5f9",
      border: `1px solid ${copied ? "#a7f3d0" : "#e2e8f0"}`,
      cursor: "pointer", fontSize: "11px", fontWeight: 600,
      color: copied ? "#059669" : "#64748b",
      transition: "all 0.2s ease", flexShrink: 0,
    }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ContactCard({
  icon: Icon, label, value, color, bg, href, copyValue,
}: {
  icon: any; label: string; value: string; color: string; bg: string; href: string; copyValue?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "14px",
      padding: "16px", borderBottom: "1px solid #f1f5f9",
    }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {copyValue && <CopyBtn value={copyValue} />}
        <a href={href} target="_blank" rel="noopener noreferrer" style={{
          display: "flex", alignItems: "center", gap: "4px",
          padding: "5px 12px", borderRadius: "8px",
          background: color, border: "none", cursor: "pointer",
          fontSize: "11px", fontWeight: 700, color: "white",
          textDecoration: "none", flexShrink: 0,
        }}>
          Open <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

function LinkRow({ icon: Icon, label, desc, color, bg, href }: {
  icon: any; label: string; desc: string; color: string; bg: string; href: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "13px 16px", cursor: "pointer", transition: "background 0.1s",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{label}</p>
          <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{desc}</p>
        </div>
        <ChevronRight size={14} color="#cbd5e1" style={{ flexShrink: 0 }} />
      </div>
    </a>
  );
}

// ─── contact form schema ──────────────────────────────────────────────────────

const contactSchema = z.object({
  name:    z.string().min(2, "Required"),
  email:   z.string().email("Invalid email"),
  subject: z.string().min(3, "Required"),
  message: z.string().min(10, "At least 10 characters"),
});

// ─── FAQ data ──────────────────────────────────────────────────────────────────

const FAQS = [
  { q: "How do I fund a shipment?", a: "Go to Market → browse available shipments → tap 'Fund Shipment' and enter the amount in USDT. Funds are released from your wallet immediately." },
  { q: "How are returns calculated?", a: "Returns are fixed per shipment route (displayed as APY%). They accrue from funding date to delivery confirmation, typically 14–45 days." },
  { q: "What happens if a shipment is delayed?", a: "Your capital remains secured. Delayed shipments still earn returns for the extended period. You'll receive an alert notification." },
  { q: "How do I withdraw funds?", a: "Go to Wallet → Withdraw, enter your payout wallet address and amount. Processing takes 1–3 business days." },
  { q: "What is a Guild?", a: "Guilds are groups of traders who pool resources and share returns on larger shipment routes. Join or create one in the Guild tab." },
  { q: "How do I contact support?", a: "Use Telegram for fastest response (avg. 5 min), email for non-urgent queries, or submit a ticket via the contact form below." },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

type View = "main" | "faq" | "contact" | "report" | "feature";

export default function HelpPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [view, setView] = useState<View>("main");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const contactForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const onSubmit = (data: z.infer<typeof contactSchema>) => {
    toast({ title: "Message sent", description: "We'll get back to you within 24 hours." });
    contactForm.reset();
    setView("main");
  };

  const reportForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "Bug Report", message: "" },
  });

  const featureForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "Feature Request", message: "" },
  });

  function FormView({
    title, icon: Icon, color, form, label,
  }: { title: string; icon: any; color: string; form: any; label: string }) {
    return (
      <div>
        <button onClick={() => setView("main")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#2563eb", padding: 0, marginBottom: "16px" }}>
          <ArrowLeft size={14} /> Back
        </button>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={14} color={color} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>{title}</span>
          </div>
          <div style={{ padding: "16px" }}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" className="tb-input" style={{ height: "42px" }} {...field} /></FormControl>
                      <FormMessage style={{ fontSize: "10px", color: "#dc2626" }} />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</FormLabel>
                      <FormControl><Input placeholder="you@example.com" className="tb-input" style={{ height: "42px" }} {...field} /></FormControl>
                      <FormMessage style={{ fontSize: "10px", color: "#dc2626" }} />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subject</FormLabel>
                    <FormControl><Input className="tb-input" style={{ height: "42px" }} {...field} /></FormControl>
                    <FormMessage style={{ fontSize: "10px", color: "#dc2626" }} />
                  </FormItem>
                )} />
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Message</FormLabel>
                    <FormControl>
                      <textarea {...field} placeholder="Describe your issue or request in detail…" style={{
                        width: "100%", minHeight: "120px", padding: "10px 12px",
                        borderRadius: "10px", border: "1.5px solid #e2e8f0",
                        fontSize: "13px", color: "#0f172a", background: "#f8fafc",
                        fontFamily: "inherit", resize: "vertical", outline: "none",
                        boxSizing: "border-box",
                      }} />
                    </FormControl>
                    <FormMessage style={{ fontSize: "10px", color: "#dc2626" }} />
                  </FormItem>
                )} />
                <button type="submit" style={{
                  height: "48px", borderRadius: "14px", border: "none", cursor: "pointer",
                  fontSize: "14px", fontWeight: 700, color: "white",
                  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                  boxShadow: `0 4px 16px ${color}40`,
                }}>
                  {label}
                </button>
              </form>
            </Form>
          </div>
        </Card>
      </div>
    );
  }

  // ── sub-views ──────────────────────────────────────────────────────────────

  if (view === "faq") {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
        <PageHeader title="FAQ" sub="Frequently Asked Questions" onBack={() => setView("main")} />
        <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", borderRadius: openFaq === i ? "14px 14px 0 0" : "14px",
                background: "#ffffff", border: "1px solid #e8edf2",
                cursor: "pointer", textAlign: "left",
                borderBottom: openFaq === i ? "none" : "1px solid #e8edf2",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", flex: 1, marginRight: "12px" }}>{faq.q}</span>
                <ChevronRight size={14} color="#94a3b8" style={{ flexShrink: 0, transform: openFaq === i ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              {openFaq === i && (
                <div style={{ padding: "12px 16px 14px", background: "#ffffff", border: "1px solid #e8edf2", borderTop: "none", borderRadius: "0 0 14px 14px" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "contact") {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
        <PageHeader title="Contact Us" sub="We respond within 24 hours" onBack={() => setView("main")} />
        <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
          <FormView title="Send a Message" icon={Send} color="#2563eb" form={contactForm} label="Send Message" />
        </div>
      </div>
    );
  }

  if (view === "report") {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
        <PageHeader title="Report a Problem" sub="Help us fix bugs" onBack={() => setView("main")} />
        <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
          <FormView title="Report a Problem" icon={AlertCircle} color="#dc2626" form={reportForm} label="Submit Report" />
        </div>
      </div>
    );
  }

  if (view === "feature") {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
        <PageHeader title="Feature Request" sub="Shape the future of TradeBox" onBack={() => setView("main")} />
        <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
          <FormView title="Feature Request" icon={Lightbulb} color="#d97706" form={featureForm} label="Submit Request" />
        </div>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
      <PageHeader title="Help & Support" sub="We're here to help" onBack={() => setLocation("/profile")} />

      <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>

        {/* Contact methods */}
        <SectionTitle>Contact Support</SectionTitle>
        <Card noPad>
          <ContactCard
            icon={MessageSquare}
            label="Telegram Support"
            value="@TradeBoxSupport"
            color="#229ED9"
            bg="#e8f5ff"
            href="https://t.me/TradeBoxSupport"
            copyValue="@TradeBoxSupport"
          />
          <ContactCard
            icon={Phone}
            label="WhatsApp Support"
            value="+1 (800) 555-TRADE"
            color="#25D366"
            bg="#e8fdf0"
            href="https://wa.me/18005557823"
            copyValue="+18005557823"
          />
          <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Mail size={20} color="#2563eb" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Support</p>
              <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>support@tradebox.io</p>
              <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Avg. response: 24 hours</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CopyBtn value="support@tradebox.io" />
              <a href="mailto:support@tradebox.io" style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "5px 12px", borderRadius: "8px",
                background: "#2563eb", fontSize: "11px", fontWeight: 700, color: "white",
                textDecoration: "none", flexShrink: 0,
              }}>
                Email <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </Card>

        {/* Response time banner */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "12px 16px", borderRadius: "12px", marginBottom: "12px",
          background: "#ecfdf5", border: "1px solid #a7f3d0",
        }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#059669" }}>Support Online</p>
            <p style={{ margin: 0, fontSize: "10px", color: "#6ee7b7", fontFamily: "'JetBrains Mono', monospace" }}>Telegram: avg. 5 min · Email: 24 hrs · WhatsApp: 15 min</p>
          </div>
        </div>

        {/* Community */}
        <SectionTitle>Community</SectionTitle>
        <Card noPad>
          <LinkRow
            icon={MessageSquare}
            label="Telegram Traders Group"
            desc="Join 12,400+ active traders"
            color="#229ED9"
            bg="#e8f5ff"
            href="https://t.me/TradeBoxCommunity"
          />
          <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />
          <LinkRow
            icon={Users}
            label="WhatsApp Community"
            desc="Real-time shipment updates"
            color="#25D366"
            bg="#e8fdf0"
            href="https://wa.me/join/tradebox"
          />
          <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />
          <LinkRow
            icon={Megaphone}
            label="Announcements Channel"
            desc="Platform news & new routes"
            color="#7c3aed"
            bg="#f5f3ff"
            href="https://t.me/TradeBoxAnnouncements"
          />
        </Card>

        {/* Resources */}
        <SectionTitle>Support Resources</SectionTitle>
        <Card noPad>
          <div onClick={() => setView("faq")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <HelpCircle size={16} color="#2563eb" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>FAQ</p>
              <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Common questions answered</p>
            </div>
            <ChevronRight size={14} color="#cbd5e1" />
          </div>
          <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />
          <LinkRow
            icon={BookOpen}
            label="Getting Started Guide"
            desc="How to fund your first shipment"
            color="#059669"
            bg="#ecfdf5"
            href="https://docs.tradebox.io/getting-started"
          />
          <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />
          <div onClick={() => setView("contact")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Send size={16} color="#2563eb" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>Contact Form</p>
              <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Send us a detailed message</p>
            </div>
            <ChevronRight size={14} color="#cbd5e1" />
          </div>
          <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />
          <div onClick={() => setView("report")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertCircle size={16} color="#dc2626" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>Report a Problem</p>
              <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Bugs, errors, and issues</p>
            </div>
            <ChevronRight size={14} color="#cbd5e1" />
          </div>
          <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />
          <div onClick={() => setView("feature")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Lightbulb size={16} color="#d97706" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>Feature Request</p>
              <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Shape the product roadmap</p>
            </div>
            <ChevronRight size={14} color="#cbd5e1" />
          </div>
        </Card>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "6px" }}>
            <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: "linear-gradient(135deg, #2563eb, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Anchor size={10} color="white" />
            </div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>TradeBox</span>
          </div>
          <p style={{ margin: 0, fontSize: "10px", color: "#cbd5e1", fontFamily: "'JetBrains Mono', monospace" }}>
            Global Trade Finance Portal · v2.0 · support@tradebox.io
          </p>
        </div>

      </div>
    </div>
  );
}

// ─── Reusable page header (sticky) ────────────────────────────────────────────

function PageHeader({ title, sub, onBack }: { title: string; sub: string; onBack: () => void }) {
  return (
    <div style={{
      background: "#ffffff", borderBottom: "1px solid #e8edf2",
      padding: "16px 16px 14px",
      position: "sticky", top: "56px", zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={onBack} style={{
          width: "32px", height: "32px", borderRadius: "9px",
          background: "#f1f5f9", border: "1px solid #e2e8f0",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
        }}>
          <ArrowLeft size={15} color="#64748b" />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
            {title}
          </h1>
          <p style={{ margin: "1px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {sub}
          </p>
        </div>
      </div>
    </div>
  );
}
