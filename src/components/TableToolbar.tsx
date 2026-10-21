import { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TableToolbarProps {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  selectedCount?: number;
  bulkActions?: ReactNode;
  onClearSelection?: () => void;
  className?: string;
}

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  actions,
  selectedCount = 0,
  bulkActions,
  onClearSelection,
  className,
}: TableToolbarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div
      className={cn(
        "sticky top-12 sm:top-14 z-[5] -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 py-2 mb-4 bg-background/80 backdrop-blur border-b border-border",
        className,
      )}
    >
      {hasSelection ? (
        <div className="flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 gap-1"
            >
              <X className="h-4 w-4" />
              <span className="text-sm font-medium">{selectedCount} selected</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">{bulkActions}</div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {onSearchChange && (
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-8"
              />
            </div>
          )}
          {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
          {actions && <div className="sm:ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}
