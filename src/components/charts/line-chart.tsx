"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { chartColors, chartFontSize, chartGridColor, chartTextColor, chartMargins } from "@/lib/chart-tokens";

export interface LineChartDataItem {
  x: string;
  y: number;
}

interface LineChartProps {
  data: LineChartDataItem[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  showDots?: boolean;
}

export function LineChart({
  data,
  color = chartColors.primary,
  height = 180,
  showGrid = true,
  showDots = true,
}: LineChartProps) {
  const chartData = data.map((d) => ({ name: d.x, value: d.y }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={chartData} margin={chartMargins.default}>
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
        />
        <Tooltip
          contentStyle={{
            fontSize: chartFontSize,
            border: `1px solid ${chartColors.border}`,
            borderRadius: "0.5rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
          cursor={{ stroke: chartColors.border }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={showDots ? { fill: color, r: 3, strokeWidth: 0 } : false}
          activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
