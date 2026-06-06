import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Newspaper, Search, Pin, Star, Eye, Clock, Globe, Anchor, AlertTriangle,
  Zap, Shield, Tag, Radio, ArrowLeft, ChevronRight, X, ExternalLink
} from "lucide-react";
import {
  useGetNewsPosts, useGetFeaturedNewsPosts, useIncrementNewsView,
  type NewsPost,
} from "@workspace/api-client-react/src/extra-hooks";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { useRoute } from "wouter";

const CATEGORIES = [
  { value: "all",              label: "All News",        icon: Newspaper,     color: "#0066FF" },
  { value: "platform_update",  label: "Platform",        icon: Globe,         color: "#2563eb" },
  { value: "new_shipment",     label: "Shipments",       icon: Anchor,        color: "#0891b2" },
  { value: "maintenance",      label: "Maintenance",     icon: AlertTriangle, color: "#d97706" },
  { value: "feature_release",  label: "Features",        icon: Zap,           color: "#7c3aed" },
  { value: "security_alert",   label: "Security",        icon: Shield,        color: "#dc2626" },
  { value: "promotion",        label: "Promotions",      icon: Tag,           color: "#059669" },
  { value: "partnership",      label: "Partnerships",    icon: Radio,         color: "#0ea5e9" },
];

function getCategoryInfo(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[0];
}

function SkeletonCard() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ height: 160, background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ height: 12, borderRadius: 6, width: "40%", background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <div style={{ height: 16, borderRadius: 6, width: "85%", background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <div style={{ height: 12, borderRadius: 6, width: "65%", background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      </div>
    </div>
  );
}

function ArticleModal({ post, onClose }: { post: NewsPost; onClose: () => void }) {
  const cat = getCategoryInfo(post.category);
  const CatIcon = cat.icon;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,25,35,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0" }}
      className="md-center-modal"
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", width: "100%", maxWidth: "720px", maxHeight: "92dvh",
          borderRadius: "20px 20px 0 0", overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        }}
        className="md-rounded-modal"
      >
        {/* Cover image */}
        {post.coverImage && (
          <div style={{ height: 200, overflow: "hidden", position: "relative", flexShrink: 0 }}>
            <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5))" }} />
            <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", color: "#fff" }}>
              <X size={16} />
            </button>
          </div>
        )}
        {/* Header bar when no cover */}
        {!post.coverImage && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e8edf2", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: `${cat.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CatIcon size={16} color={cat.color} />
              </div>
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: cat.color, textTransform: "uppercase" }}>{cat.label}</span>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
              <X size={15} color="#64748b" />
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {post.coverImage && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${cat.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CatIcon size={14} color={cat.color} />
              </div>
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: cat.color, textTransform: "uppercase" }}>{cat.label}</span>
            </div>
          )}

          <h1 style={{ margin: "0 0 12px", fontSize: "clamp(18px, 5vw, 24px)", fontWeight: 800, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
            {post.title}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>by {post.author}</span>
            <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={11} />
              {post.publishedAt ? format(parseISO(post.publishedAt), "MMMM d, yyyy") : ""}
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 4 }}>
              <Eye size={11} />{post.viewCount} views
            </span>
          </div>

          {post.summary && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.7, fontWeight: 500 }}>{post.summary}</p>
            </div>
          )}

          {post.content ? (
            <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "system-ui, sans-serif" }}>
              {post.content}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "#94a3b8", fontStyle: "italic" }}>No additional content.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsCard({ post, onClick, featured = false }: { post: NewsPost; onClick: () => void; featured?: boolean }) {
  const cat = getCategoryInfo(post.category);
  const CatIcon = cat.icon;
  const timeAgo = post.publishedAt ? formatDistanceToNow(parseISO(post.publishedAt), { addSuffix: true }) : "";

  if (featured) {
    return (
      <div
        onClick={onClick}
        style={{
          background: "#fff", border: "1px solid #e8edf2", borderRadius: 20, overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)", cursor: "pointer", transition: "transform 0.18s, box-shadow 0.18s",
          position: "relative",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(0,0,0,0.12)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"; }}
      >
        {post.coverImage ? (
          <div style={{ height: 220, overflow: "hidden", position: "relative" }}>
            <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.65))" }} />
            <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", color: "#fff", background: cat.color }}>{cat.label}</span>
                <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#fbbf24", background: "rgba(0,0,0,0.4)" }}>★ FEATURED</span>
              </div>
              <h3 style={{ margin: 0, fontSize: "clamp(15px, 4vw, 19px)", fontWeight: 800, color: "#fff", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3 }}>{post.title}</h3>
            </div>
          </div>
        ) : (
          <div style={{ padding: "20px 20px 16px", background: `linear-gradient(135deg, ${cat.color}0d, ${cat.color}05)`, borderBottom: `3px solid ${cat.color}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", color: cat.color, background: `${cat.color}15`, border: `1px solid ${cat.color}30` }}>{cat.label}</span>
              <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe" }}>★ FEATURED</span>
            </div>
            <h3 style={{ margin: 0, fontSize: "clamp(16px, 4vw, 20px)", fontWeight: 800, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3 }}>{post.title}</h3>
          </div>
        )}
        <div style={{ padding: "14px 18px 16px" }}>
          {post.summary && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#475569", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.summary}</p>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo}</span>
            <span style={{ fontSize: 11, color: cat.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>Read more <ChevronRight size={12} /></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff", border: "1px solid #e8edf2", borderRadius: 16, overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
    >
      {post.coverImage && (
        <div style={{ height: 140, overflow: "hidden", flexShrink: 0 }}>
          <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }} onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
        </div>
      )}
      {!post.coverImage && (
        <div style={{ height: 4, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}60)` }} />
      )}
      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", color: cat.color, background: `${cat.color}10`, border: `1px solid ${cat.color}25` }}>
            {cat.label}
          </span>
          {post.isPinned && <span style={{ padding: "2px 7px", borderRadius: 20, fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#d97706", background: "#fef3c7", border: "1px solid #fde68a" }}>📌 PINNED</span>}
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {post.title}
        </h3>
        {post.summary && (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
            {post.summary}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo}</span>
            <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 2 }}><Eye size={10} />{post.viewCount}</span>
          </div>
          <span style={{ fontSize: 10, color: cat.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, display: "flex", alignItems: "center", gap: 2 }}>Read <ChevronRight size={10} /></span>
        </div>
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const incrementView = useIncrementNewsView();

  const { data: allPosts, isLoading } = useGetNewsPosts(category === "all" ? undefined : category);
  const { data: featuredPosts } = useGetFeaturedNewsPosts();

  const posts = (allPosts ?? []).filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.summary ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const pinnedPosts = posts.filter(p => p.isPinned);
  const regularPosts = posts.filter(p => !p.isPinned);
  const featured = featuredPosts?.slice(0, 1)[0];

  const openPost = (post: NewsPost) => {
    setSelectedPost(post);
    incrementView.mutate(post.id);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8edf2", padding: "20px 16px 0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: "linear-gradient(135deg, #0066FF, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Newspaper size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(18px, 5vw, 24px)", fontWeight: 800, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>TradeBox News</h1>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>Platform updates, shipping news & more</p>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search news..."
              style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 12, border: "1px solid #e8edf2", background: "#f8fafc", fontSize: 13, color: "#0f172a", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" }}
              onFocus={e => { e.target.style.borderColor = "#0066FF"; }}
              onBlur={e => { e.target.style.borderColor = "#e8edf2"; }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <X size={14} color="#94a3b8" />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 1, scrollbarWidth: "none" }}>
            {CATEGORIES.map(c => {
              const CatIcon = c.icon;
              const active = category === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "8px 14px",
                    borderRadius: 0, border: "none", background: "transparent", cursor: "pointer",
                    fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: active ? 700 : 500,
                    color: active ? c.color : "#94a3b8", whiteSpace: "nowrap",
                    borderBottom: active ? `2.5px solid ${c.color}` : "2.5px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <CatIcon size={12} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>

        {/* Featured banner */}
        {!search && category === "all" && featured && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Star size={13} color="#7c3aed" />
              <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em" }}>Featured Story</span>
            </div>
            <NewsCard post={featured} onClick={() => openPost(featured)} featured />
          </div>
        )}

        {/* Pinned posts */}
        {!search && pinnedPosts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Pin size={13} color="#d97706" />
              <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pinned Updates</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 12 }}>
              {pinnedPosts.map(p => <NewsCard key={p.id} post={p} onClick={() => openPost(p)} />)}
            </div>
          </div>
        )}

        {/* Main feed */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {search ? `${posts.length} result${posts.length !== 1 ? "s" : ""}` : "Latest News"}
            </span>
          </div>

          {isLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 12 }}>
              {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (search ? posts : regularPosts).length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 20, padding: "60px 20px", textAlign: "center" }}>
              <Newspaper size={48} color="#cbd5e1" style={{ margin: "0 auto 16px" }} />
              <p style={{ margin: 0, fontSize: 14, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                {search ? "No news matching your search." : "No news in this category yet."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 12 }}>
              {(search ? posts : regularPosts).map(p => <NewsCard key={p.id} post={p} onClick={() => openPost(p)} />)}
            </div>
          )}
        </div>
      </div>

      {/* Article modal */}
      {selectedPost && <ArticleModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
    </div>
  );
}
