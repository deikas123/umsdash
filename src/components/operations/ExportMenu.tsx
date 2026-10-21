import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, FileDown } from "lucide-react";

interface ExportMenuProps {
  onCSV: () => void;
  onPDF: () => void;
  onExcel: () => void;
}

export default function ExportMenu({ onCSV, onPDF, onExcel }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-[4px]">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onCSV} className="gap-2 text-xs">
          <FileDown className="h-3.5 w-3.5" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPDF} className="gap-2 text-xs">
          <FileText className="h-3.5 w-3.5" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExcel} className="gap-2 text-xs">
          <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
