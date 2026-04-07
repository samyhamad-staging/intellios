"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { chartColors, chartFontSize, chartGridColor, chartTextColor, chartMargins } from "@/lib/chart-tokens";

export interface BarChartDataItem {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartDataItem[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  /** If true, value as percentage of max (or 100) */
  normalized?: boolean;
}

function getBarColor(item: BarChartDataItem, defaultColor: string): string {
  if (item.color) return item.color;
  if (item.max === undefined) return defaultColor;
  const pct = item.value / item.max;
  if (pct >= 0.7) return chartColors.success;
  if (pct >= 0.4) return chartColors.warning;
  return chartColors.gray;
}

export function BarChart({
  data,
  color = chartColors.primary,
  height = 180,
  showGrid = true,
  showTooltip = true,
  normalized = false,
}: BarChartProps) {
  const chartData = data.map((d) => ({
    name: d.label,
    value: normalized && d.max ? Math.round((d.value / d.max) * 100) : d.value,
    _original: d,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={chartData} margin={chartMargins.default}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
        )}
        <XAxis
          dataKey="name"
          tick={{ fontSize: chartFontSize, fill: chartTextColor }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: chartFontSize, fill: chartTextColor }}
          tickLine={false}
          axisLine={false}
          domain={normalized ? [0, 100] : undefined}
          tickFormatter={normalized ? (v) => `${v}%` : undefined}
        />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              fontSize: chartFontSize,
              border: `1px solid ${chartColors.border}`,
              borderRadius: "0.5rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
            cursor={{ fill: chartColors.muted }}
            formatter={(_value, _name, props) => {
              const orig = props.payload._original as BarChartDataItem;
              if (orig.max) return [`${orig.value}/${orig.max}`, orig.label];
              return [orig.value, orig.label];
            }}
          />
        )}
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarColor(entry._original, color)}
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
