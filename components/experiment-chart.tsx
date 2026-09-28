"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Experiment } from "@/lib/domain/types";

export function ExperimentChart({ experiment }: { experiment: Experiment }) {
  const data = [
    {
      metric: "First-pass success",
      Baseline:
        (experiment.baseline.successCount / experiment.baseline.sampleSize) *
        100,
      Improved:
        (experiment.improved.successCount / experiment.improved.sampleSize) *
        100,
    },
    {
      metric: "Regression rate",
      Baseline:
        (experiment.baseline.regressionCount / experiment.baseline.sampleSize) *
        100,
      Improved:
        (experiment.improved.regressionCount / experiment.improved.sampleSize) *
        100,
    },
  ];
  return (
    <div
      className="experiment-chart"
      role="img"
      aria-label="Illustrative experiment: first-pass success 71 to 91 percent; regression rate 17 to 4 percent. Exact values also appear in the comparison table."
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={data}
          margin={{ top: 18, right: 20, left: -15, bottom: 0 }}
          barGap={8}
        >
          <CartesianGrid
            vertical={false}
            stroke="#e9ece9"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="metric"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#626c67", fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value: number) => `${value}%`}
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#87918a", fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => `${value}%`}
            cursor={{ fill: "#f3f5f3" }}
            contentStyle={{
              borderRadius: 6,
              borderColor: "#e0e5e1",
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            iconType="square"
            iconSize={9}
          />
          <Bar
            dataKey="Baseline"
            fill="#c6cfc9"
            radius={[3, 3, 0, 0]}
            maxBarSize={54}
            isAnimationActive={false}
          />
          <Bar
            dataKey="Improved"
            fill="#29785b"
            radius={[3, 3, 0, 0]}
            maxBarSize={54}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
