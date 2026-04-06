import Link from "next/link";

export interface KpiCardProps {
  label: string;
  value: number | string;
  sub: string;
  color: string;
  subColor: string;
  href?: string;
  trend?: { value: number; label?: string };
}

export function KpiCard({ label, value, sub, color, subColor, href, trend }: KpiCardProps) {
  const isEmpty = value === 0;
  const inner = (
    <div
      className={`rounded-card border p-5 min-w-0 ${color} ${isEmpty ? "opacity-50 border-dashed" : ""} ${href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}
    >
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-bold">{value}</div>
        {trend && (
          <div className={`text-xs flex items-center gap-0.5 ${trend.value > 0 ? "text-emerald-600" : trend.value < 0 ? "text-red-500" : "text-text-tertiary"}`}>
            {trend.value > 0 && "▲"}
            {trend.value < 0 && "▼"}
            {trend.value === 0 && "—"}
            {trend.value !== 0 && <span>{Math.abs(trend.value)}</span>}
          </div>
        )}
      </div>
      <div className="mt-1 text-sm font-medium leading-tight">{label}</div>
      <div className={`mt-0.5 text-xs truncate ${subColor}`}>
        {sub}
        {trend?.label && <span className="ml-1">{trend.label}</span>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
