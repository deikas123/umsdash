import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/operations/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MessageSquare, Lock } from "lucide-react";
import ExportMenu from "@/components/operations/ExportMenu";
import { exportToCSV, exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { format } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";
import { maskPhone, maskMessage } from "@/lib/mask";

export default function OpSmsLogs() {
  const { isAdmin } = useUserRole();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [relatedFilter, setRelatedFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["sms_logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sms_logs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = logs.filter((l: any) => {
    const matchSearch = l.recipient_phone.includes(search) || l.message.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchRelated = relatedFilter === "all" || (l.related_table || "") === relatedFilter;
    return matchSearch && matchStatus && matchRelated;
  });

  const headers = ["Phone", "Message", "Status", "Related To", "Sent At"];
  const toRow = (l: any) => [
    isAdmin ? l.recipient_phone : maskPhone(l.recipient_phone),
    isAdmin ? l.message : maskMessage(l.message),
    l.status,
    l.related_table || "—",
    l.created_at ? format(new Date(l.created_at), "yyyy-MM-dd HH:mm") : "",
  ];

  return (
    <div>
      <PageHeader
        title="SMS Logs"
        description={isAdmin
          ? "Record of all SMS notifications sent by the system."
          : "Record of SMS notifications — phone numbers and message content are masked for non-admin users."}
        actions={
          <ExportMenu
            onCSV={() => exportToCSV(headers, filtered.map(toRow), `sms-logs-${format(new Date(), "yyyy-MM-dd")}.csv`)}
            onPDF={() => exportToPDF("SMS Logs", headers, filtered.map(toRow))}
            onExcel={() => exportToExcel("SMS Logs", headers, filtered.map(toRow))}
          />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 rounded-[4px] pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36 rounded-[4px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
        <Select value={relatedFilter} onValueChange={setRelatedFilter}>
          <SelectTrigger className="h-9 w-44 rounded-[4px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="passwords">Passwords</SelectItem>
            <SelectItem value="incidents">Incidents</SelectItem>
            <SelectItem value="vendor_issues">Vendor Issues</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="card-shadow rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 label-caps">Phone</th>
              <th className="px-5 py-3 label-caps">Message</th>
              <th className="px-5 py-3 label-caps">Status</th>
              <th className="px-5 py-3 label-caps">Related To</th>
              <th className="px-5 py-3 label-caps">Sent At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l: any) => (
              <tr key={l.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
                <td className="px-5 py-3 font-mono-data">{isAdmin ? l.recipient_phone : maskPhone(l.recipient_phone)}</td>
                <td className="px-5 py-3 max-w-xs truncate">
                  {isAdmin ? l.message : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Lock className="h-3 w-3" /> {maskMessage(l.message)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-[4px] px-2 py-0.5 text-xs font-medium ${l.status === "sent" ? "bg-accent/10 text-accent" : l.status === "skipped" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{l.related_table || "—"}</td>
                <td className="px-5 py-3 font-mono-data text-muted-foreground">
                  {l.created_at ? format(new Date(l.created_at), "yyyy-MM-dd HH:mm") : ""}
                </td>
              </tr>
            ))}
            {isLoading && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">No SMS logs match the current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
