import { useState } from "react";
import { useListShipments, type ListShipmentsCategory, type ListShipmentsRiskGrade } from "@workspace/api-client-react";
import { ShipmentCard } from "@/components/shipment-card";
import { Search, SlidersHorizontal, X } from "lucide-react";

const categories: { id: ListShipmentsCategory | "all"; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "📦" },
  { id: "electronics", label: "Electronics", emoji: "⚡" },
  { id: "agricultural", label: "Agricultural", emoji: "🌿" },
  { id: "minerals", label: "Minerals", emoji: "⛏️" },
  { id: "textiles", label: "Textiles", emoji: "🧵" },
  { id: "pharmaceuticals", label: "Pharma", emoji: "💊" },
];

const riskGrades: { id: ListShipmentsRiskGrade | "all"; label: string; color: string; bg: string }[] = [
  { id: "all", label: "All Grades", color: "#64748b", bg: "#f1f5f9" },
  { id: "A", label: "Grade A", color: "#059669", bg: "#ecfdf5" },
  { id: "B", label: "Grade B", color: "#2563eb", bg: "#eff6ff" },
  { id: "C", label: "Grade C", color: "#d97706", bg: "#fffbeb" },
  { id: "D", label: "Grade D", color: "#dc2626", bg: "#fef2f2" },
];

export default function Shipments() {
  const [category, setCategory] = useState<ListShipmentsCategory | "all">("all");
  const [riskGrade, setRiskGrade] = useState<ListShipmentsRiskGrade | "all">("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: shipments, isLoading } = useListShipments({
    category: category !== "all" ? category : undefined,
    riskGrade: riskGrade !== "all" ? riskGrade : undefined,
    status: "open",
  });

  const filtered = shipments?.filter(s =>
    search
      ? s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.origin.toLowerCase().includes(search.toLowerCase()) ||
        s.destination.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const hasFilters = category !== "all" || riskGrade !== "all" || search;
  const clearFilters = () => { setCategory("all"); setRiskGrade("all"); setSearch(""); };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fb" }}>
      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#ffffff", borderBottom: "1px solid #e8edf2",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        padding: "14px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}>Cargo Market</h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
              {isLoading ? "Loading..." : `${filtered?.length || 0} available`}
            </p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "7px 12px", borderRadius: "10px", border: "none", cursor: "pointer",
            fontSize: "12px", fontWeight: 600,
            background: showFilters ? "#2563eb" : "#f1f5f9",
            color: showFilters ? "white" : "#475569",
            transition: "all 0.15s ease",
          }}>
            <SlidersHorizontal size={13} /> Filters
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={14} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            placeholder="Search ports, vessels, cargo..."
            style={{
              width: "100%", height: "42px", paddingLeft: "36px", paddingRight: search ? "36px" : "12px",
              borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#f8fafc",
              fontSize: "13px", color: "#0f172a", outline: "none", fontFamily: "'Inter', sans-serif",
              transition: "border-color 0.15s",
            }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => (e.target.style.borderColor = "#2563eb")}
            onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
              background: "#e2e8f0", border: "none", borderRadius: "50%",
              width: "18px", height: "18px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={11} color="#64748b" />
            </button>
          )}
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Categories */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "5px 12px", borderRadius: "20px", border: "1px solid",
                  cursor: "pointer", fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap",
                  background: category === cat.id ? "#2563eb" : "#ffffff",
                  color: category === cat.id ? "white" : "#475569",
                  borderColor: category === cat.id ? "#2563eb" : "#e2e8f0",
                  transition: "all 0.15s ease",
                }}>
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
            {/* Risk grades */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
              {riskGrades.map(grade => (
                <button key={grade.id} onClick={() => setRiskGrade(grade.id)} style={{
                  padding: "5px 12px", borderRadius: "20px", border: "1px solid",
                  cursor: "pointer", fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap",
                  background: riskGrade === grade.id ? grade.bg : "#ffffff",
                  color: riskGrade === grade.id ? grade.color : "#475569",
                  borderColor: riskGrade === grade.id ? grade.color : "#e2e8f0",
                  transition: "all 0.15s ease",
                }}>
                  {grade.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasFilters && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
            <button onClick={clearFilters} style={{
              display: "flex", alignItems: "center", gap: "4px",
              fontSize: "11px", color: "#2563eb", fontWeight: 600,
              background: "none", border: "none", cursor: "pointer",
            }}>
              <X size={11} /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={{ padding: "16px" }}>
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="shimmer" style={{ height: "220px", borderRadius: "16px" }} />
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {filtered.map(s => <ShipmentCard key={s.id} shipment={s} />)}
          </div>
        ) : (
          <div style={{ padding: "80px 20px", textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Search size={24} color="#cbd5e1" />
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}>No Cargo Found</h3>
            <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>No shipments match your filters.</p>
            <button onClick={clearFilters} style={{ padding: "10px 20px", borderRadius: "12px", background: "#2563eb", color: "white", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
