import { useState } from "react";
import { useListShipments, type ListShipmentsCategory, type ListShipmentsRiskGrade } from "@workspace/api-client-react";
import { ShipmentCard } from "@/components/shipment-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, Loader2 } from "lucide-react";
import { Button } from "react-day-picker";

export default function Shipments() {
  const [category, setCategory] = useState<ListShipmentsCategory | "all">("all");
  const [riskGrade, setRiskGrade] = useState<ListShipmentsRiskGrade | "all">("all");
  const [search, setSearch] = useState("");

  const { data: shipments, isLoading } = useListShipments({
    category: category !== "all" ? category : undefined,
    riskGrade: riskGrade !== "all" ? riskGrade : undefined,
    status: "open",
  });

  const filteredShipments = shipments?.filter(s => 
    search ? s.title.toLowerCase().includes(search.toLowerCase()) || s.origin.toLowerCase().includes(search.toLowerCase()) || s.destination.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#0F1923] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#1E293B] pb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Cargo Market</h1>
            <p className="text-gray-400 font-mono text-sm mt-1 uppercase">Browse available shipments for funding</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search ports or vessels..." 
                className="pl-9 bg-[#1E293B] border-[#334155] focus:border-[#0066FF] text-white font-mono h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                <SelectTrigger className="w-full sm:w-[160px] bg-[#1E293B] border-[#334155] font-mono h-10">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E293B] border-[#334155] text-white font-mono">
                  <SelectItem value="all">All Cargo</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="agricultural">Agricultural</SelectItem>
                  <SelectItem value="minerals">Minerals</SelectItem>
                  <SelectItem value="textiles">Textiles</SelectItem>
                  <SelectItem value="pharma">Pharmaceuticals</SelectItem>
                </SelectContent>
              </Select>

              <Select value={riskGrade} onValueChange={(val: any) => setRiskGrade(val)}>
                <SelectTrigger className="w-full sm:w-[130px] bg-[#1E293B] border-[#334155] font-mono h-10">
                  <SelectValue placeholder="Risk Grade" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E293B] border-[#334155] text-white font-mono">
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="A">Grade A</SelectItem>
                  <SelectItem value="B">Grade B</SelectItem>
                  <SelectItem value="C">Grade C</SelectItem>
                  <SelectItem value="D">Grade D</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
          </div>
        ) : filteredShipments && filteredShipments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredShipments.map(shipment => (
              <ShipmentCard key={shipment.id} shipment={shipment} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-[#1E293B] rounded-xl border border-[#334155] border-dashed">
            <Filter className="h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-xl font-heading font-bold text-white mb-2">No Cargo Found</h3>
            <p className="text-gray-400 font-mono text-center max-w-md">
              No open shipments match your current filter criteria. Try adjusting your filters or search term.
            </p>
            <Button 
              variant="outline" 
              className="mt-6 border-[#334155] text-white hover:bg-[#334155]"
              onClick={() => { setCategory("all"); setRiskGrade("all"); setSearch(""); }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
