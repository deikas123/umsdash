import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
}

export default function StatsCard({ label, value, change, trend, icon: Icon }: StatsCardProps) {
  return (
    <div className="card-shadow rounded-lg bg-card p-5 transition-shadow hover:card-shadow-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-caps">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          {change && (
            <p className={`mt-1 text-xs font-medium ${
              trend === "up" ? "text-accent" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className="rounded-[4px] bg-indigo-50 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
}
