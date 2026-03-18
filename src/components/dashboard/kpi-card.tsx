import Link from "next/link";

export interface KpiCardProps {
  label: string;
  value: number | string;
  sub: string;
  color: string;
  subColor: string;
  href?: string;
}

export function KpiCard({ label, value, sub, color, subColor, href }: KpiCardProps) {
  const isEmpty = value === 0;
  const inner = (
    <div
      className={`rounded-card border p-5 min-w-0 ${color} ${isEmpty ? "opacity-50 border-dashed" : ""} ${href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}
    >
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm font-medium leading-tight">{label}</div>
      <div className={`mt-0.5 text-xs truncate ${subColor}`}>{sub}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
