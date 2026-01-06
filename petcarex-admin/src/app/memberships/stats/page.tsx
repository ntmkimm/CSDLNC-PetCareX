"use client";

import AppShell from "@/components/AppShell";
import PieChartCard from "@/components/charts/PieChartCard";
import { api } from "@/lib/api";
import type { MembershipRow } from "@/lib/types";
import { Spin, Table } from "antd";
import { useEffect, useState } from "react";

export default function MembershipStatsPage() {
  const [items, setItems] = useState<MembershipRow[] | null>(null);

  useEffect(() => {
    api.get<{ items: MembershipRow[] }>("/company/memberships/stats").then((res) => setItems(res.data.items));
  }, []);

  return (
    <AppShell>
      {!items ? (
        <Spin />
      ) : (
        <>
          <PieChartCard title="Phân bố hạng khách" data={items} nameKey="Bac" valueKey="SoLuong" />
          <div style={{ height: 16 }} />
          <Table
            rowKey={(r) => `${r.Bac}`}
            dataSource={items}
            columns={[
              { title: "Bậc", dataIndex: "Bac" },
              { title: "Số lượng", dataIndex: "SoLuong" },
            ]}
          />
        </>
      )}
    </AppShell>
  );
}
