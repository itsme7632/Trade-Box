import { useState } from "react";
import { useListShipments, type ListShipmentsCategory, type ListShipmentsRiskGrade } from "@workspace/api-client-react";
import { ShipmentCard } from "@/components/shipment-card";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react";

const categories: { id: ListShipmentsCategory | "all"; label: string; emoji: string }[] = [
  { id: "all", label: "All Cargo", emoji: "📦" },
  { id: "electronics", label: "Electronics", emoji: "⚡" },
  { id: "agricultural", label: "Agricultural", emoji: "🌿" },
  { id: "minerals", label: "Minerals", emoji: "⛏️" },
  { id: "textiles", label: "Textiles", emoji: "🧵" },
  { id: "pharmaceuticals", label: "Pharma", emoji: "💊" },
];

const riskGrades: { id: ListShipmentsRiskGrade | "all"; label: string; color: string }[] = [
  { id: "all", label: "All Grades", color: "#475569" },
  { id: "A", label: "Grade A", color: "#10B981" },
  { id: "B", label: "Grade B", color: "#3B82F6" },
  { id: "C", label: "Grade C", color: "#F59E0B" },
  { id: "D", label: "Grade D", color: "#EF4444" },
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
    <div className="min-h-screen bg-[#050D1B]">
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-20 px-4 pt-5 pb-4 md:px-8"
        style={{ background: "rgba(5,13,27,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              Cargo Market
            </h1>
            <p className="text-[#475569] text-xs font-mono mt-0.5 uppercase tracking-widest">
              {isLoading ? "Loading..." : `${filtered?.length || 0} shipments available`}
            </p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all shrink-0"
            style={showFilters ? {
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              color: "white",
              boxShadow: "0 2px 10px rgba(37,99,235,0.35)"
            } : {
              background: "rgba(10,22,40,0.9)",
              color: "#475569",
              border: "1px solid rgba(255,255,255,0.06)"
            }}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#334155]" />
          <input
            placeholder="Search ports, vessels, cargo..."
            className="w-full h-11 pl-10 pr-4 rounded-xl text-sm font-mono text-[#E2E8F0] placeholder-[#334155] outline-none transition-all"
            style={{
              background: "rgba(10,22,40,0.9)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              <X className="h-3 w-3 text-[#64748B]" />
            </button>
          )}
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="mt-3 space-y-3 animate-fade-in-up">
            {/* Category pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono whitespace-nowrap transition-all shrink-0"
                  style={category === cat.id ? {
                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                    color: "white"
                  } : {
                    background: "rgba(10,22,40,0.8)",
                    color: "#475569",
                    border: "1px solid rgba(255,255,255,0.06)"
                  }}>
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            {/* Risk grade pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {riskGrades.map(grade => (
                <button key={grade.id} onClick={() => setRiskGrade(grade.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-mono whitespace-nowrap transition-all shrink-0"
                  style={riskGrade === grade.id ? {
                    background: grade.id === "all" ? "linear-gradient(135deg, #2563EB, #1D4ED8)" : `${grade.color}20`,
                    color: grade.id === "all" ? "white" : grade.color,
                    border: grade.id !== "all" ? `1px solid ${grade.color}40` : "none"
                  } : {
                    background: "rgba(10,22,40,0.8)",
                    color: "#475569",
                    border: "1px solid rgba(255,255,255,0.06)"
                  }}>
                  {grade.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active filters notice */}
        {hasFilters && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#475569]">
              {filtered?.length || 0} results
            </span>
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-[11px] font-mono text-[#3B82F6] hover:text-[#60A5FA] transition-colors">
              <X className="h-3 w-3" /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="px-4 md:px-8 py-5">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-[#1E3A5F] border-t-[#3B82F6] animate-spin" />
              </div>
              <span className="text-xs font-mono text-[#334155]">Loading shipments...</span>
            </div>
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(s => <ShipmentCard key={s.id} shipment={s} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Search className="h-7 w-7 text-[#1E3A5F]" />
            </div>
            <h3 className="text-lg font-bold text-[#475569] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              No Cargo Found
            </h3>
            <p className="text-sm text-[#334155] font-mono max-w-xs mb-5">
              No shipments match your search. Try adjusting filters.
            </p>
            <button onClick={clearFilters}
              className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
              style={{
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
                fontFamily: "'Space Grotesk', sans-serif"
              }}>
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
