"use client";

import AppShell from "@/components/AppShell";
import PieChartCard from "@/components/charts/PieChartCard";
import { api } from "@/lib/api";
import type { PetsRow } from "@/lib/types";
import { Spin, Table } from "antd";
import { useEffect, useState } from "react";

export default function PetsStatsPage() {
  const [items, setItems] = useState<PetsRow[] | null>(null);

  useEffect(() => {
    api.get<{ items: PetsRow[] }>("/company/pets/stats").then((res) => setItems(res.data.items));
  }, []);

  return (
    <AppShell>
      {!items ? (
        <Spin />
      ) : (
        <>
          <PieChartCard title="Thú cưng theo loại" data={items} nameKey="Loai" valueKey="SoLuong" />
          <div style={{ height: 16 }} />
          <Table
            rowKey={(r) => `${r.Loai}`}
            dataSource={items}
            columns={[
              { title: "Loại", dataIndex: "Loai" },
              { title: "Số lượng", dataIndex: "SoLuong" },
            ]}
          />
        </>
      )}
    </AppShell>
  );
}
