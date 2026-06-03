import { useState } from "react";
import { useLocation } from "wouter";
import {
  MessageSquare, Mail, Phone, Users, Megaphone, HelpCircle,
  BookOpen, Send, AlertCircle, Lightbulb, Copy, Check,
  ExternalLink, ChevronRight, ArrowLeft, Plus, Ticket,
  Clock, CheckCircle, AlertOctagon, RefreshCw, MessageCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useGetSupportSettings, useGetTickets, useCreateTicket, useReplyTicket, useUpdateTicketStatus, type SupportTicket } from "@workspace/api-client-react/src/extra-hooks";
import { useAuth } from "@/components/auth-context";

// ─── helpers ─────────────────────────────────────────────────────────────────

function Card({ children, noPad }: { children: React.ReactNode; noPad?: boolean }) {
  return <div style={{ background: "#ffffff", border: "1px solid #e8edf2", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "12px" }}>
    {noPad ? children : <div style={{ padding: "16px" }}>{children}</div>}
  </div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin: "20px 0 10px", fontSize: "12px", fontWeight: 700, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>{children}</h2>;
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "8px", background: copied ? "#ecfdf5" : "#f1f5f9", border: `1px solid ${copied ? "#a7f3d0" : "#e2e8f0"}`, cursor: "pointer", fontSize: "11px", fontWeight: 600, color: copied ? "#059669" : "#64748b", transition: "all 0.2s ease", flexShrink: 0 }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ContactCard({ icon: Icon, label, value, color, bg, href, copyValue }: { icon: any; label: string; value: string; color: string; bg: string; href: string; copyValue?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {copyValue && <CopyBtn value={copyValue} />}
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "8px", background: color, border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "white", textDecoration: "none", flexShrink: 0 }}>
          Open <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

function LinkRow({ icon: Icon, label, desc, color, bg, href }: { icon: any; label: string; desc: string; color: string; bg: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", cursor: "pointer", transition: "background 0.1s" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
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

function PageHeader({ title, sub, onBack }: { title: string; sub: string; onBack: () => void }) {
  return (
    <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "18px 16px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#2563eb", padding: 0, marginBottom: "10px" }}>
          <ArrowLeft size={14} /> Back
        </button>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h1>
        <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{sub}</p>
      </div>
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: "How do I fund a shipment?", a: "Go to Market → browse available shipments → tap 'Fund Shipment' and enter the amount in USDT. Funds are released from your wallet immediately." },
  { q: "How are returns calculated?", a: "Returns are fixed per shipment route (displayed as APY%). They accrue from funding date to delivery confirmation, typically 14–45 days." },
  { q: "What happens if a shipment is delayed?", a: "Your capital remains secured. Delayed shipments still earn returns for the extended period. You'll receive an alert notification." },
  { q: "How do I withdraw funds?", a: "Go to Wallet → Withdraw, enter your payout wallet address and amount. Processing takes 1–3 business days." },
  { q: "What is a Guild?", a: "Guilds are groups of traders who pool resources and share returns on larger shipment routes. Join or create one in the Guild tab." },
  { q: "How do I contact support?", a: "Use Telegram for fastest response (avg. 5 min), email for non-urgent queries, or submit a ticket via the contact form below." },
];

// ─── Ticket card ─────────────────────────────────────────────────────────────

const statusConfig = {
  open:        { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Open",        icon: Clock         },
  in_progress: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "In Progress", icon: RefreshCw     },
  closed:      { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Resolved",    icon: CheckCircle   },
};

function TicketCard({ ticket, onSelect }: { ticket: SupportTicket; onSelect: () => void }) {
  const cfg = statusConfig[ticket.status] ?? statusConfig.open;
  const Ico = cfg.icon;
  return (
    <div onClick={onSelect} style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.1s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.subject}</span>
          </div>
          <p style={{ margin: 0, fontSize: "11px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.message}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "20px", background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: "10px", fontWeight: 700, color: cfg.color, fontFamily: "'JetBrains Mono', monospace" }}>
              <Ico size={9} /> {cfg.label}
            </span>
            {ticket.replies.length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                <MessageCircle size={9} /> {ticket.replies.length}
              </span>
            )}
            <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(ticket.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <ChevronRight size={14} color="#cbd5e1" style={{ flexShrink: 0, marginTop: "2px" }} />
      </div>
    </div>
  );
}

// ─── ticket form schema ───────────────────────────────────────────────────────

const ticketSchema = z.object({
  subject: z.string().min(3, "Required"),
  message: z.string().min(10, "At least 10 characters"),
});

const replySchema = z.object({ message: z.string().min(1, "Required") });

// ─── Main ─────────────────────────────────────────────────────────────────────

type View = "main" | "faq" | "tickets" | "new-ticket" | "ticket-detail";

export default function HelpPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [view, setView] = useState<View>("main");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const { data: settings } = useGetSupportSettings();
  const { data: tickets, refetch: refetchTickets } = useGetTickets();
  const createTicket = useCreateTicket();
  const replyTicket = useReplyTicket();
  const updateStatus = useUpdateTicketStatus();

  const ticketForm = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: "", message: "" },
  });

  const replyForm = useForm<z.infer<typeof replySchema>>({
    resolver: zodResolver(replySchema),
    defaultValues: { message: "" },
  });

  const onCreateTicket = (data: z.infer<typeof ticketSchema>) => {
    createTicket.mutate(data, {
      onSuccess: (t) => {
        toast({ title: "Ticket submitted", description: `Ticket #${t.id} created.` });
        ticketForm.reset();
        setView("tickets");
      },
      onError: (err: any) => toast({ title: "Error", description: err?.data?.error || err.message, variant: "destructive" }),
    });
  };

  const onReply = (data: z.infer<typeof replySchema>) => {
    if (!selectedTicket) return;
    replyTicket.mutate({ ticketId: selectedTicket.id, message: data.message }, {
      onSuccess: () => {
        replyForm.reset();
        refetchTickets().then(() => {
          const fresh = tickets?.find(t => t.id === selectedTicket.id);
          if (fresh) setSelectedTicket(fresh);
        });
      },
      onError: (err: any) => toast({ title: "Error", description: err?.data?.error || err.message, variant: "destructive" }),
    });
  };

  const refreshTicket = async () => {
    const res = await refetchTickets();
    if (selectedTicket && res.data) {
      const fresh = res.data.find(t => t.id === selectedTicket.id);
      if (fresh) setSelectedTicket(fresh);
    }
  };

  // Resolve contact info from DB settings or fall back to defaults
  const telegramSupport = settings?.telegramSupport || "@TradeBoxSupport";
  const whatsappSupport = settings?.whatsappSupport || "+18005557823";
  const supportEmail = settings?.supportEmail || "support@tradebox.io";
  const telegramGroup = settings?.telegramGroup || "https://t.me/TradeBoxCommunity";
  const whatsappCommunity = settings?.whatsappCommunity || "https://wa.me/join/tradebox";
  const announcementChannel = settings?.announcementChannel || "https://t.me/TradeBoxAnnouncements";

  const telegramHref = telegramSupport.startsWith("http") ? telegramSupport : `https://t.me/${telegramSupport.replace(/^@/, "")}`;
  const whatsappPhone = whatsappSupport.replace(/[^0-9]/g, "");
  const whatsappHref = `https://wa.me/${whatsappPhone}`;

  // ─── FAQ view ───────────────────────────────────────────────────────────────

  if (view === "faq") {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
        <PageHeader title="FAQ" sub="Frequently Asked Questions" onBack={() => setView("main")} />
        <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: openFaq === i ? "14px 14px 0 0" : "14px", background: "#ffffff", border: "1px solid #e8edf2", borderBottom: openFaq === i ? "none" : "1px solid #e8edf2", cursor: "pointer", textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
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

  // ─── Tickets list ────────────────────────────────────────────────────────────

  if (view === "tickets") {
    const myTickets = tickets || [];
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
        <PageHeader title="My Tickets" sub="Track your support requests" onBack={() => setView("main")} />
        <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
          <button onClick={() => setView("new-ticket")} style={{ width: "100%", height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
            <Plus size={16} /> New Support Ticket
          </button>
          {myTickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px" }}>
              <Ticket size={40} color="#e2e8f0" style={{ margin: "0 auto 12px" }} />
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#64748b" }}>No tickets yet</p>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>Submit a ticket and we'll get back to you.</p>
            </div>
          ) : (
            <Card noPad>
              {myTickets.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onSelect={() => { setSelectedTicket(ticket); setView("ticket-detail"); }}
                />
              ))}
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ─── New ticket form ─────────────────────────────────────────────────────────

  if (view === "new-ticket") {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
        <PageHeader title="New Ticket" sub="Describe your issue and we'll help" onBack={() => setView("tickets")} />
        <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
          <Card>
            <Form {...ticketForm}>
              <form onSubmit={ticketForm.handleSubmit(onCreateTicket)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <FormField control={ticketForm.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subject</FormLabel>
                    <FormControl><Input placeholder="Describe the issue briefly" className="tb-input" style={{ height: "44px" }} {...field} /></FormControl>
                    <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                  </FormItem>
                )} />
                <FormField control={ticketForm.control} name="message" render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Message</FormLabel>
                    <FormControl>
                      <textarea {...field} placeholder="Describe your issue in detail…" style={{ width: "100%", minHeight: "140px", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "13px", color: "#0f172a", background: "#f8fafc", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                    </FormControl>
                    <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                  </FormItem>
                )} />
                <button type="submit" disabled={createTicket.isPending} style={{ height: "48px", borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 16px rgba(37,99,235,0.3)", opacity: createTicket.isPending ? 0.7 : 1 }}>
                  {createTicket.isPending ? "Submitting..." : "Submit Ticket"}
                </button>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Ticket detail ───────────────────────────────────────────────────────────

  if (view === "ticket-detail" && selectedTicket) {
    const cfg = statusConfig[selectedTicket.status] ?? statusConfig.open;
    const Ico = cfg.icon;
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
        <PageHeader title={`Ticket #${selectedTicket.id}`} sub={selectedTicket.subject} onBack={() => { setView("tickets"); refetchTickets(); }} />
        <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: "11px", fontWeight: 700, color: cfg.color }}>
              <Ico size={10} /> {cfg.label}
            </span>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(selectedTicket.createdAt).toLocaleDateString()}
            </span>
            <button onClick={refreshTicket} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <RefreshCw size={14} color="#94a3b8" />
            </button>
          </div>

          <Card>
            {/* Original message */}
            <div style={{ padding: "14px", marginBottom: "8px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your message</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#0f172a", lineHeight: 1.6 }}>{selectedTicket.message}</p>
            </div>

            {/* Replies */}
            {selectedTicket.replies.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {selectedTicket.replies.map(reply => (
                  <div key={reply.id} style={{ padding: "12px 14px", borderRadius: "12px", background: reply.isAdmin ? "#eff6ff" : "#f8fafc", border: `1px solid ${reply.isAdmin ? "#bfdbfe" : "#e2e8f0"}`, marginLeft: reply.isAdmin ? "0" : "0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: reply.isAdmin ? "#2563eb" : "#64748b" }}>
                        {reply.isAdmin ? "TradeBox Support" : "You"}
                      </span>
                      <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", color: "#0f172a", lineHeight: 1.6 }}>{reply.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply form — only if not closed */}
            {selectedTicket.status !== "closed" && (
              <Form {...replyForm}>
                <form onSubmit={replyForm.handleSubmit(onReply)} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <FormField control={replyForm.control} name="message" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <textarea {...field} placeholder="Write a reply…" style={{ width: "100%", minHeight: "80px", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "13px", color: "#0f172a", background: "#f8fafc", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                      </FormControl>
                      <FormMessage style={{ fontSize: "11px", color: "#dc2626" }} />
                    </FormItem>
                  )} />
                  <button type="submit" disabled={replyTicket.isPending} style={{ height: "42px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", opacity: replyTicket.isPending ? 0.7 : 1 }}>
                    {replyTicket.isPending ? "Sending…" : "Send Reply"}
                  </button>
                </form>
              </Form>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ─── Main view ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e8edf2", padding: "18px 16px 14px" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <button onClick={() => setLocation("/profile")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#2563eb", padding: 0, marginBottom: "8px" }}>
            <ArrowLeft size={14} /> Profile
          </button>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Help & Support</h1>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>We're here to help</p>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>

        {/* Support Tickets CTA */}
        <div style={{ padding: "16px", borderRadius: "16px", background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1px solid #bfdbfe", marginBottom: "20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ticket size={22} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1e40af" }}>Support Tickets</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#3b82f6", fontFamily: "'JetBrains Mono', monospace" }}>
              {tickets?.length ? `${tickets.length} ticket${tickets.length > 1 ? "s" : ""} · ` : ""}Submit and track requests
            </p>
          </div>
          <button onClick={() => setView("tickets")} style={{ padding: "8px 16px", borderRadius: "10px", background: "#2563eb", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "white", flexShrink: 0 }}>
            View All
          </button>
        </div>

        {/* Contact methods */}
        <SectionTitle>Contact Support</SectionTitle>
        <Card noPad>
          <ContactCard icon={MessageSquare} label="Telegram Support" value={telegramSupport} color="#229ED9" bg="#e8f5ff" href={telegramHref} copyValue={telegramSupport} />
          <ContactCard icon={Phone} label="WhatsApp Support" value={whatsappSupport} color="#25D366" bg="#e8fdf0" href={whatsappHref} copyValue={whatsappSupport} />
          <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Mail size={20} color="#2563eb" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Support</p>
              <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{supportEmail}</p>
              <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Avg. response: 24 hours</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CopyBtn value={supportEmail} />
              <a href={`mailto:${supportEmail}`} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "8px", background: "#2563eb", fontSize: "11px", fontWeight: 700, color: "white", textDecoration: "none", flexShrink: 0 }}>
                Email <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </Card>

        {/* Status banner */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "12px", marginBottom: "12px", background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#059669" }}>Support Online</p>
            <p style={{ margin: 0, fontSize: "10px", color: "#6ee7b7", fontFamily: "'JetBrains Mono', monospace" }}>Telegram: avg. 5 min · Email: 24 hrs · WhatsApp: 15 min</p>
          </div>
        </div>

        {/* Community */}
        <SectionTitle>Community</SectionTitle>
        <Card noPad>
          <LinkRow icon={MessageSquare} label="Telegram Traders Group" desc="Join 12,400+ active traders" color="#229ED9" bg="#e8f5ff" href={telegramGroup} />
          <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />
          <LinkRow icon={Users} label="WhatsApp Community" desc="Real-time shipment updates" color="#25D366" bg="#e8fdf0" href={whatsappCommunity} />
          <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />
          <LinkRow icon={Megaphone} label="Announcements Channel" desc="Platform news & new routes" color="#7c3aed" bg="#f5f3ff" href={announcementChannel} />
        </Card>

        {/* Resources */}
        <SectionTitle>Resources</SectionTitle>
        <Card noPad>
          <div onClick={() => setView("faq")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", cursor: "pointer", transition: "background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
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
          <LinkRow icon={BookOpen} label="Getting Started Guide" desc="How to fund your first shipment" color="#059669" bg="#ecfdf5" href="https://docs.tradebox.io/getting-started" />
          <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />
          <div onClick={() => setView("new-ticket")} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", cursor: "pointer", transition: "background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Send size={16} color="#2563eb" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>Submit a Ticket</p>
              <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Track your support request</p>
            </div>
            <ChevronRight size={14} color="#cbd5e1" />
          </div>
          <div style={{ height: "1px", background: "#f1f5f9", margin: "0 16px" }} />
          <div onClick={() => { setView("new-ticket"); ticketForm.setValue("subject", "Bug Report: "); }} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", cursor: "pointer", transition: "background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
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
          <div onClick={() => { setView("new-ticket"); ticketForm.setValue("subject", "Feature Request: "); }} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", cursor: "pointer", transition: "background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div style={{ width: "36px", height: "36px", borderRadius: "11px", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Lightbulb size={16} color="#d97706" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>Feature Request</p>
              <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Shape the future of TradeBox</p>
            </div>
            <ChevronRight size={14} color="#cbd5e1" />
          </div>
        </Card>

        <p style={{ textAlign: "center", fontSize: "10px", color: "#cbd5e1", fontFamily: "'JetBrains Mono', monospace", marginTop: "24px", paddingBottom: "8px" }}>
          TradeBox Support · Available 24/7
        </p>
      </div>
    </div>
  );
}
