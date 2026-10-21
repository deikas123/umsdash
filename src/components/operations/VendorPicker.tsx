import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeName } from "@/lib/mask";

interface Props {
  value: string;
  onChange: (v: string) => void;
  vendors: string[];
  placeholder?: string;
}

const ADD_NEW = "__add_new__";

/**
 * Vendor selector: dropdown of existing (normalized, deduplicated) vendors plus
 * an "Add new vendor…" option that reveals a text input. Prevents casing /
 * whitespace duplicates like "VEND SOLID" vs "Vendsolid".
 */
export default function VendorPicker({ value, onChange, vendors, placeholder }: Props) {
  const normalized = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of vendors) {
      const n = normalizeName(v);
      if (n && !map.has(n.toLowerCase())) map.set(n.toLowerCase(), n);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [vendors]);

  const currentNormalized = value ? normalizeName(value) : "";
  const knownMatch = normalized.find((n) => n.toLowerCase() === currentNormalized.toLowerCase());
  const [addingNew, setAddingNew] = useState(!!value && !knownMatch);

  if (addingNew) {
    return (
      <div className="flex gap-2">
        <Input
          className="h-9 rounded-[4px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(normalizeName(e.target.value))}
          placeholder={placeholder || "New vendor name"}
          autoFocus
        />
        {normalized.length > 0 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
            onClick={() => { onChange(""); setAddingNew(false); }}
          >
            ← Pick existing
          </button>
        )}
      </div>
    );
  }

  return (
    <Select
      value={knownMatch || ""}
      onValueChange={(v) => {
        if (v === ADD_NEW) { setAddingNew(true); onChange(""); return; }
        onChange(v);
      }}
    >
      <SelectTrigger className="h-9 rounded-[4px]">
        <SelectValue placeholder={placeholder || "Select vendor"} />
      </SelectTrigger>
      <SelectContent>
        {normalized.map((v) => (
          <SelectItem key={v} value={v}>{v}</SelectItem>
        ))}
        <SelectItem value={ADD_NEW}>+ Add new vendor…</SelectItem>
      </SelectContent>
    </Select>
  );
}
