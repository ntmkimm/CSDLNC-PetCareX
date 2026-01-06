// src/app/customers/by-branch/page.tsx
"use client";

import AppShell from "@/components/AppShell";
import BarChartCard from "@/components/charts/BarChartCard";
import { api } from "@/lib/api";
import type { CustomersByBranchRow } from "@/lib/types";
import { Spin, Table } from "antd";
import { useEffect, useState } from "react";

export default function CustomersByBranchPage() {
  const [items, setItems] = useState<CustomersByBranchRow[] | null>(null);

  useEffect(() => {
    api.get<{ items: CustomersByBranchRow[] }>("/company/customers/by-branch").then((res) => setItems(res.data.items));
  }, []);

  return (
    <AppShell>
      {!items ? (
        <Spin />
      ) : (
        <>
          <BarChartCard title="Khách theo chi nhánh" data={items} xKey="MaCN" barKey="SoKhach" />
          <div style={{ height: 16 }} />
          <Table
            rowKey={(r) => `${r.MaCN}`}
            dataSource={items}
            columns={[
              { title: "Mã chi nhánh", dataIndex: "MaCN" },
              { title: "Số khách", dataIndex: "SoKhach" },
            ]}
          />
        </>
      )}
    </AppShell>
  );
}
