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

type OpenVsCompletedDatum = {
  projectKey: string;
  open: number;
  completed: number;
};

type DashboardChartsProps = {
  openVsCompleted: OpenVsCompletedDatum[];
};

export function DashboardCharts({ openVsCompleted }: DashboardChartsProps) {
  return (
    <div className="h-80 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
        Open vs Completed Issues
      </h2>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={openVsCompleted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="projectKey" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="open" fill="#f97316" radius={4} />
          <Bar dataKey="completed" fill="#16a34a" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
