import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/operations/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Trash2, Search, FolderOpen, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ExportMenu from "@/components/operations/ExportMenu";
import { exportToCSV, exportToPDF, exportToExcel } from "@/lib/exportUtils";

export default function OpDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [uploadDate, setUploadDate] = useState("");

  // Adapted to ums-docs-vault documents schema: uses 'title' instead of 'name'
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["ops_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, file_path, file_type, uploaded_by, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const filePath = `${user!.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
      if (uploadError) throw uploadError;
      const insertData: any = {
        uploaded_by: user!.id,
        title: file.name,
        file_type: file.name.split(".").pop()?.toUpperCase() || "FILE",
        file_path: filePath,
      };
      if (uploadDate) insertData.created_at = new Date(uploadDate).toISOString();
      const { error: dbError } = await supabase.from("documents").insert(insertData);
      if (dbError) throw dbError;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ops_documents"] }); toast.success("File uploaded."); setUploadDate(""); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_path: string | null }) => {
      if (doc.file_path) await supabase.storage.from("documents").remove([doc.file_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ops_documents"] }); toast.success("Document deleted."); },
  });

  const handlePreview = async (doc: { file_path: string | null; title: string }) => {
    if (!doc.file_path) return;
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) { setPreviewUrl(data.signedUrl); setPreviewName(doc.title); }
  };

  const handleDownload = async (doc: { file_path: string | null }) => {
    if (!doc.file_path) return;
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => uploadMutation.mutate(f));
  };

  const handleDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const filtered = docs.filter((d) => {
    const matchSearch = (d.title || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || (d.file_type || "").toUpperCase() === typeFilter;
    return matchSearch && matchType;
  });

  const headers = ["Title", "Type", "Uploaded By", "Date"];
  const toRow = (d: any) => [d.title || "", d.file_type || "", d.uploaded_by || "", d.created_at.split("T")[0]];

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Meeting files, reports, and compliance documents."
        actions={
          <>
            <ExportMenu
              onCSV={() => exportToCSV(headers, filtered.map(toRow), `documents-${format(new Date(), "yyyy-MM-dd")}.csv`)}
              onPDF={() => exportToPDF("Documents", headers, filtered.map(toRow))}
              onExcel={() => exportToExcel("Documents", headers, filtered.map(toRow))}
            />
            <label>
              <input type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg" onChange={(e) => handleFiles(e.target.files)} />
              <Button size="sm" className="gap-1.5 rounded-[4px]" asChild><span><Upload className="h-3.5 w-3.5" /> Upload File</span></Button>
            </label>
          </>
        }
      />

      {/* Backdate option */}
      <div className="mb-4 flex items-center gap-3">
        <Label className="text-xs font-semibold text-muted-foreground">Upload Date (optional backdate):</Label>
        <Input type="datetime-local" className="h-9 w-56 rounded-[4px]" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} />
        {uploadDate && <button onClick={() => setUploadDate("")} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
      </div>

      <div
        onDragOver={(e) => { handleDrag(e); setDragOver(true); }}
        onDragLeave={(e) => { handleDrag(e); setDragOver(false); }}
        onDrop={(e) => { handleDrag(e); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`mb-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border bg-card"}`}
      >
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-foreground">Drag & drop files here</p>
        <p className="text-xs text-muted-foreground mt-1">Supports PDF, DOC, DOCX, images — Max 25 MB</p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 rounded-[4px] pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-36 rounded-[4px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="PDF">PDF</SelectItem>
            <SelectItem value="DOC">DOC</SelectItem>
            <SelectItem value="DOCX">DOCX</SelectItem>
            <SelectItem value="XLSX">XLSX</SelectItem>
            <SelectItem value="PNG">PNG</SelectItem>
            <SelectItem value="JPG">JPG</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="card-shadow rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left">
            <th className="px-5 py-3 label-caps">File Name</th><th className="px-5 py-3 label-caps">Type</th>
            <th className="px-5 py-3 label-caps">Uploaded</th>
            <th className="px-5 py-3 label-caps">By</th><th className="px-5 py-3 label-caps">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map((doc) => (
              <tr key={doc.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
                <td className="px-5 py-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary flex-shrink-0" /><span className="font-medium">{doc.title}</span></div></td>
                <td className="px-5 py-3 font-mono-data text-muted-foreground">{doc.file_type}</td>
                <td className="px-5 py-3 font-mono-data text-muted-foreground">{doc.created_at.split("T")[0]}</td>
                <td className="px-5 py-3 text-xs">{doc.uploaded_by}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-[4px]" onClick={() => handlePreview(doc)} title="Preview"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-[4px] text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: doc.id, file_path: doc.file_path })} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {isLoading && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><FolderOpen className="h-8 w-8 mb-2" /><p className="text-sm">No documents found.</p></div>
        )}
      </div>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader><DialogTitle>{previewName}</DialogTitle></DialogHeader>
          {previewUrl && (
            <iframe src={previewUrl} className="w-full h-[70vh] rounded border border-border" title={previewName} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
