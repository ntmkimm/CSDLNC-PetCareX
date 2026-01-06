// src/app/revenue/total/page.tsx
"use client";

import AppShell from "@/components/AppShell";
import KpiCard from "@/components/KpiCard";
import { api } from "@/lib/api";
import type { TotalRevenueRow } from "@/lib/types";
import { Spin } from "antd";
import { useEffect, useState } from "react";

export default function TotalRevenuePage() {
  const [data, setData] = useState<TotalRevenueRow | null>(null);

  useEffect(() => {
    api.get<TotalRevenueRow>("/company/revenue/total").then((res) => setData(res.data));
  }, []);

  return (
    <AppShell>
      {!data ? <Spin /> : <KpiCard title="Tổng doanh thu" value={data.TongDoanhThu ?? 0} />}
    </AppShell>
  );
}

