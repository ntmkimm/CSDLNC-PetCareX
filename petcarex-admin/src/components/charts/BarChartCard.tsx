// src/components/charts/BarChartCard.tsx

"use client";

import { Card } from "antd";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";

export default function BarChartCard<T extends object>({
  title,
  data,
  xKey,
  barKey,
}: {
  title: string;
  data: T[];
  xKey: keyof T;
  barKey: keyof T;
}) {
  return (
    <Card title={title}>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <BarChart data={data as any}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey as any} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={barKey as any} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
