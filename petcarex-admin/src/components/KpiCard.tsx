// src/components/KpiCard.tsx

"use client";

import { Card, Statistic } from "antd";

export default function KpiCard({
  title,
  value,
  suffix,
}: {
  title: string;
  value: number;
  suffix?: string;
}) {
  return (
    <Card>
      <Statistic title={title} value={value} suffix={suffix} />
    </Card>
  );
}
