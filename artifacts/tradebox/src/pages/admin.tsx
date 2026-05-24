import { useState } from "react";
import { 
  useAdminGetStats, useAdminListDeposits, useAdminApproveDeposit, useAdminRejectDeposit, 
  useAdminListWithdrawals, useAdminProcessWithdrawal, useAdminListKyc, useAdminApproveKyc, 
  useAdminRejectKyc, useAdminListUsers, useAdminListShipments, useAdminCreateShipment, 
  useAdminDeliverShipment, useAdminUpdateShipment 
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldAlert, Users, Anchor, Wallet, FileCheck, Check, X, Search, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminDashboard() {
  const { data: stats } = useAdminGetStats();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FB] text-[#0F1923] p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto w-full space-y-6">
        
        <div className="flex items-center gap-3 border-b border-[#EEF2F8] pb-6">
          <ShieldAlert className="h-8 w-8 text-[#EF4444]" />
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Admin Terminal</h1>
            <p className="text-[#6A82A0] font-mono text-sm uppercase">Restricted Access</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-4 rounded-xl border border-[#EEF2F8] border-l-4 border-l-[#0066FF] shadow-sm">
            <p className="text-[10px] text-[#6A82A0] font-mono uppercase mb-1">Total Users</p>
            <p className="font-bold font-mono text-2xl">{stats?.totalUsers || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#EEF2F8] border-l-4 border-l-[#22C55E] shadow-sm">
            <p className="text-[10px] text-[#6A82A0] font-mono uppercase mb-1">Deposits / Withdrawals</p>
            <p className="font-bold font-mono text-lg text-[#22C55E]">
              {stats?.totalDeposited.toLocaleString()} USDT / <span className="text-[#EF4444]">{stats?.totalWithdrawn.toLocaleString()} USDT</span>
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#EEF2F8] shadow-sm">
            <p className="text-[10px] text-[#6A82A0] font-mono uppercase mb-1">Pending Actions</p>
            <div className="flex gap-4 font-bold font-mono text-sm text-[#F59E0B]">
              <span>Dep: {stats?.pendingDeposits || 0}</span>
              <span>Wd: {stats?.pendingWithdrawals || 0}</span>
              <span>KYC: {stats?.pendingKyc || 0}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#EEF2F8] shadow-sm">
            <p className="text-[10px] text-[#6A82A0] font-mono uppercase mb-1">Active Cargo</p>
            <p className="font-bold font-mono text-2xl">{stats?.activeShipments || 0}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-8">
          <TabsList className="bg-white border border-[#EEF2F8] w-full justify-start p-1 h-auto overflow-x-auto shadow-sm">
            <TabsTrigger value="overview" className="py-2.5 px-4 font-mono uppercase text-xs data-[state=active]:bg-[#EF4444] data-[state=active]:text-white text-[#6A82A0]">Overview</TabsTrigger>
            <TabsTrigger value="deposits" className="py-2.5 px-4 font-mono uppercase text-xs data-[state=active]:bg-[#EF4444] data-[state=active]:text-white text-[#6A82A0]">
              Deposits {stats?.pendingDeposits ? `(${stats.pendingDeposits})` : ''}
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="py-2.5 px-4 font-mono uppercase text-xs data-[state=active]:bg-[#EF4444] data-[state=active]:text-white text-[#6A82A0]">
              Withdrawals {stats?.pendingWithdrawals ? `(${stats.pendingWithdrawals})` : ''}
            </TabsTrigger>
            <TabsTrigger value="kyc" className="py-2.5 px-4 font-mono uppercase text-xs data-[state=active]:bg-[#EF4444] data-[state=active]:text-white text-[#6A82A0]">
              KYC {stats?.pendingKyc ? `(${stats.pendingKyc})` : ''}
            </TabsTrigger>
            <TabsTrigger value="shipments" className="py-2.5 px-4 font-mono uppercase text-xs data-[state=active]:bg-[#EF4444] data-[state=active]:text-white text-[#6A82A0]">Shipments</TabsTrigger>
            <TabsTrigger value="users" className="py-2.5 px-4 font-mono uppercase text-xs data-[state=active]:bg-[#EF4444] data-[state=active]:text-white text-[#6A82A0]">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
             <div className="bg-white p-8 rounded-xl border border-[#EEF2F8] text-center mt-6 text-[#6A82A0] font-mono shadow-sm">
               Select a tab above to manage platform entities.
             </div>
          </TabsContent>

          <TabsContent value="deposits"><AdminDeposits /></TabsContent>
          <TabsContent value="withdrawals"><AdminWithdrawals /></TabsContent>
          <TabsContent value="kyc"><AdminKyc /></TabsContent>
          <TabsContent value="shipments"><AdminShipments /></TabsContent>
          <TabsContent value="users"><AdminUsers /></TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

function AdminDeposits() {
  const { data, refetch } = useAdminListDeposits();
  const approve = useAdminApproveDeposit();
  const reject = useAdminRejectDeposit();
  const { toast } = useToast();

  const handleApprove = (id: number) => {
    approve.mutate({ id }, {
      onSuccess: () => { toast({ title: "Approved" }); refetch(); }
    });
  };

  const handleReject = (id: number) => {
    reject.mutate({ id, data: { reason: "Invalid TXID" } }, {
      onSuccess: () => { toast({ title: "Rejected" }); refetch(); }
    });
  };

  return (
    <div className="mt-6 bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#F8FAFD] border-b border-[#EEF2F8] font-mono text-xs uppercase text-[#6A82A0]">
          <tr>
            <th className="p-4">User</th>
            <th className="p-4">Amount</th>
            <th className="p-4">Coin/TXID</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF2F8]">
          {data?.map(d => (
            <tr key={d.id} className="hover:bg-[#F8FAFD]">
              <td className="p-4"><p className="font-bold text-[#0F1923]">{d.traderId}</p><p className="text-xs text-[#6A82A0]">{d.email}</p></td>
              <td className="p-4 font-mono font-bold text-[#22C55E]">{d.amount} USDT</td>
              <td className="p-4"><span className="text-xs bg-[#EEF2F8] text-[#0F1923] px-1 rounded">{d.coin}</span> <p className="text-xs font-mono text-[#6A82A0] truncate max-w-[150px]">{d.txid}</p></td>
              <td className="p-4 text-xs font-mono uppercase text-[#0F1923]">{d.status}</td>
              <td className="p-4 text-right space-x-2">
                {d.status === 'reviewing' && (
                  <>
                    <Button size="sm" variant="outline" className="bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20 hover:bg-[#22C55E] hover:text-white" onClick={() => handleApprove(d.id)}><Check className="h-4 w-4"/></Button>
                    <Button size="sm" variant="outline" className="bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20 hover:bg-[#EF4444] hover:text-white" onClick={() => handleReject(d.id)}><X className="h-4 w-4"/></Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminWithdrawals() {
  const { data, refetch } = useAdminListWithdrawals();
  const process = useAdminProcessWithdrawal();
  const { toast } = useToast();
  const [txid, setTxid] = useState("");
  const [activeId, setActiveId] = useState<number|null>(null);

  const handleProcess = (id: number) => {
    process.mutate({ id, data: { txid: txid || "processed" } }, {
      onSuccess: () => { toast({ title: "Processed" }); refetch(); setActiveId(null); }
    });
  };

  return (
    <div className="mt-6 bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#F8FAFD] border-b border-[#EEF2F8] font-mono text-xs uppercase text-[#6A82A0]">
          <tr>
            <th className="p-4">User</th>
            <th className="p-4">Amount</th>
            <th className="p-4">Address</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF2F8]">
          {data?.map(w => (
            <tr key={w.id} className="hover:bg-[#F8FAFD]">
              <td className="p-4"><p className="font-bold text-[#0F1923]">{w.traderId}</p></td>
              <td className="p-4 font-mono font-bold text-[#EF4444]">{w.amount} USDT</td>
              <td className="p-4 font-mono text-xs text-[#6A82A0] break-all">{w.walletAddress}</td>
              <td className="p-4 text-xs font-mono uppercase text-[#0F1923]">{w.status}</td>
              <td className="p-4 text-right">
                {w.status === 'in_transit' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-[#0066FF] hover:bg-[#0052CC] text-white">Process</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white text-[#0F1923] border-[#EEF2F8]">
                      <DialogHeader><DialogTitle>Process Withdrawal</DialogTitle></DialogHeader>
                      <Input placeholder="Enter Blockchain TXID" value={txid} onChange={e => setTxid(e.target.value)} className="bg-[#F8FAFD] border-[#EEF2F8]" />
                      <DialogFooter>
                        <Button onClick={() => handleProcess(w.id)} className="bg-[#0066FF] text-white">Confirm Processed</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminKyc() {
  const { data, refetch } = useAdminListKyc();
  const approve = useAdminApproveKyc();
  const reject = useAdminRejectKyc();
  const { toast } = useToast();

  const handleApprove = (id: number) => {
    approve.mutate({ id }, { onSuccess: () => { toast({ title: "Approved" }); refetch(); } });
  };
  const handleReject = (id: number) => {
    reject.mutate({ id, data: { reason: "Blurry images" } }, { onSuccess: () => { toast({ title: "Rejected" }); refetch(); } });
  };

  return (
    <div className="mt-6 bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#F8FAFD] border-b border-[#EEF2F8] font-mono text-xs uppercase text-[#6A82A0]">
          <tr>
            <th className="p-4">User</th>
            <th className="p-4">Documents</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF2F8]">
          {data?.map(k => (
            <tr key={k.id} className="hover:bg-[#F8FAFD]">
              <td className="p-4 font-bold text-[#0F1923]">{k.traderId}</td>
              <td className="p-4 space-y-1">
                <a href={k.idDocumentUrl} target="_blank" className="text-xs text-[#0066FF] hover:underline block">ID Doc</a>
                <a href={k.selfieUrl} target="_blank" className="text-xs text-[#0066FF] hover:underline block">Selfie</a>
              </td>
              <td className="p-4 text-xs font-mono uppercase text-[#0F1923]">{k.status}</td>
              <td className="p-4 text-right space-x-2">
                {k.status === 'pending' && (
                  <>
                    <Button size="sm" variant="outline" className="bg-[#22C55E]/10 text-[#22C55E]" onClick={() => handleApprove(k.id)}><Check className="h-4 w-4"/></Button>
                    <Button size="sm" variant="outline" className="bg-[#EF4444]/10 text-[#EF4444]" onClick={() => handleReject(k.id)}><X className="h-4 w-4"/></Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminShipments() {
  const { data, refetch } = useAdminListShipments();
  const deliver = useAdminDeliverShipment();
  const create = useAdminCreateShipment();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const shipmentSchema = z.object({
    title: z.string(), cargoType: z.string(), origin: z.string(), destination: z.string(),
    profitPercent: z.coerce.number(), riskGrade: z.string(), fundingGoal: z.coerce.number(), minInvestment: z.coerce.number(),
    departureDate: z.string(), arrivalDate: z.string(), freightForwarder: z.string(), vesselName: z.string()
  });

  const form = useForm<z.infer<typeof shipmentSchema>>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      title: "", cargoType: "electronics", origin: "", destination: "", profitPercent: 5, riskGrade: "A",
      fundingGoal: 100000, minInvestment: 100, departureDate: format(new Date(), 'yyyy-MM-dd'), 
      arrivalDate: format(new Date(), 'yyyy-MM-dd'), freightForwarder: "", vesselName: ""
    }
  });

  const onSubmit = (data: any) => {
    create.mutate({ data }, {
      onSuccess: () => { toast({ title: "Created" }); refetch(); setOpen(false); form.reset(); }
    });
  };

  const handleDeliver = (id: number) => {
    deliver.mutate({ id }, { onSuccess: () => { toast({ title: "Marked Delivered" }); refetch(); } });
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066FF] text-white"><Plus className="h-4 w-4 mr-2"/> New Shipment</Button>
          </DialogTrigger>
          <DialogContent className="bg-white text-[#0F1923] border-[#EEF2F8] max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Cargo Manifest</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({field}) => <FormItem><FormLabel>Title</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field}/></FormControl></FormItem>} />
                <FormField control={form.control} name="vesselName" render={({field}) => <FormItem><FormLabel>Vessel Name</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field}/></FormControl></FormItem>} />
                <FormField control={form.control} name="origin" render={({field}) => <FormItem><FormLabel>Origin</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field}/></FormControl></FormItem>} />
                <FormField control={form.control} name="destination" render={({field}) => <FormItem><FormLabel>Destination</FormLabel><FormControl><Input className="bg-[#F8FAFD] border-[#EEF2F8]" {...field}/></FormControl></FormItem>} />
                <FormField control={form.control} name="profitPercent" render={({field}) => <FormItem><FormLabel>Profit %</FormLabel><FormControl><Input type="number" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field}/></FormControl></FormItem>} />
                <FormField control={form.control} name="fundingGoal" render={({field}) => <FormItem><FormLabel>Funding Goal</FormLabel><FormControl><Input type="number" className="bg-[#F8FAFD] border-[#EEF2F8]" {...field}/></FormControl></FormItem>} />
                <Button type="submit" className="col-span-2 bg-[#0066FF] text-white mt-4" disabled={create.isPending}>Create</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFD] border-b border-[#EEF2F8] font-mono text-xs uppercase text-[#6A82A0]">
            <tr>
              <th className="p-4">Title/Vessel</th>
              <th className="p-4">Route</th>
              <th className="p-4">Funding</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F8]">
            {data?.map(s => (
              <tr key={s.id} className="hover:bg-[#F8FAFD]">
                <td className="p-4"><p className="font-bold text-[#0F1923] truncate max-w-[200px]">{s.title}</p><p className="text-xs text-[#6A82A0] font-mono">{s.vesselName}</p></td>
                <td className="p-4 text-xs font-mono text-[#0F1923]">{s.origin} <br/>to {s.destination}</td>
                <td className="p-4 font-mono text-xs text-[#0F1923]">{s.fundingRaised} / {s.fundingGoal} USDT</td>
                <td className="p-4 text-xs font-mono uppercase text-[#0F1923]">{s.status}</td>
                <td className="p-4 text-right">
                  {s.status === 'in_transit' && (
                    <Button size="sm" className="bg-[#22C55E] hover:bg-[#16a34a] text-white" onClick={() => handleDeliver(s.id)}>Deliver</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [search, setSearch] = useState("");
  const { data } = useAdminListUsers({ search });

  return (
    <div className="mt-6 space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6A82A0]" />
        <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white border-[#EEF2F8] text-[#0F1923]" />
      </div>
      <div className="bg-white rounded-xl border border-[#EEF2F8] overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFD] border-b border-[#EEF2F8] font-mono text-xs uppercase text-[#6A82A0]">
            <tr>
              <th className="p-4">Trader ID</th>
              <th className="p-4">Email</th>
              <th className="p-4">Balance</th>
              <th className="p-4">Role/KYC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F8]">
            {data?.map(u => (
              <tr key={u.id} className="hover:bg-[#F8FAFD]">
                <td className="p-4 font-bold font-mono text-[#0F1923]">{u.traderId}</td>
                <td className="p-4 text-[#3A4E66]">{u.email}</td>
                <td className="p-4 font-bold font-mono text-[#0066FF]">{u.balance.toLocaleString()} USDT</td>
                <td className="p-4 text-xs font-mono uppercase space-x-2">
                  <span className={u.role === 'admin' ? "text-[#EF4444]" : "text-[#6A82A0]"}>{u.role}</span>
                  <span className={u.kycStatus === 'approved' ? "text-[#22C55E]" : "text-[#F59E0B]"}>{u.kycStatus}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
