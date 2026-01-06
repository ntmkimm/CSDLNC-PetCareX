// src/app/revenue/by-branch/page.tsx


"use client";

import AppShell from "@/components/AppShell";
import BarChartCard from "@/components/charts/BarChartCard";
import { api } from "@/lib/api";
import type { RevenueByBranchRow } from "@/lib/types";
import { Spin, Table } from "antd";
import { useEffect, useState } from "react";

export default function RevenueByBranchPage() {
  const [items, setItems] = useState<RevenueByBranchRow[] | null>(null);

  useEffect(() => {
    api.get<{ items: RevenueByBranchRow[] }>("/company/revenue/by-branch").then((res) => setItems(res.data.items));
  }, []);

  return (
    <AppShell>
      {!items ? (
        <Spin />
      ) : (
        <>
          <BarChartCard title="Doanh thu theo chi nhánh" data={items} xKey="MaCN" barKey="DoanhThu" />
          <div style={{ height: 16 }} />
          <Table
            rowKey={(r) => `${r.MaCN}`}
            dataSource={items}
            columns={[
              { title: "Mã chi nhánh", dataIndex: "MaCN" },
              { title: "Doanh thu", dataIndex: "DoanhThu" },
            ]}
          />
        </>
      )}
    </AppShell>
  );
}
