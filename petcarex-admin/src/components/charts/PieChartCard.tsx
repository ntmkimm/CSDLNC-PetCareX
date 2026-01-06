// src/components/charts/PieChartCard.tsx
"use client";

import { Card } from "antd";
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend } from "recharts";

export default function PieChartCard<T extends object>({
  title,
  data,
  nameKey,
  valueKey,
}: {
  title: string;
  data: T[];
  nameKey: keyof T;
  valueKey: keyof T;
}) {
  return (
    <Card title={title}>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data as any} dataKey={valueKey as any} nameKey={nameKey as any} label />
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
