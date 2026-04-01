"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { chartColors, chartFontSize } from "@/lib/chart-tokens";

export interface DonutChartDataItem {
  name: string;
  value: number;
  color?: string;
}

const DEFAULT_COLORS = [
  chartColors.primary,
  chartColors.success,
  chartColors.warning,
  chartColors.danger,
  chartColors.info,
  chartColors.gray,
];

interface DonutChartProps {
  data: DonutChartDataItem[];
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

export function DonutChart({
  data,
  colors = DEFAULT_COLORS,
  height = 200,
  showLegend = true,
  innerRadius = 50,
  outerRadius = 75,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color ?? colors[index % colors.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            fontSize: chartFontSize,
            border: `1px solid ${chartColors.border}`,
            borderRadius: "0.5rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
          formatter={(value, name) => {
            const v = typeof value === "number" ? value : 0;
            return [`${v} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`, name];
          }}
        />
        {showLegend && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: chartFontSize }}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
