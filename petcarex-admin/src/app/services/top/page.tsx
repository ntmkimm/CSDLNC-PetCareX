// src/app/services/top/page.tsx

"use client";

import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import type { TopServiceRow } from "@/lib/types";
import { Card, Select, Spin, Table } from "antd";
import { useEffect, useRef, useState } from "react";

export default function TopServicesPage() {
  const [months, setMonths] = useState(6);
  const [items, setItems] = useState<TopServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const ran = useRef(false);

  useEffect(() => {
    // chặn StrictMode double-run lần đầu
    if (!ran.current) ran.current = true;

    let alive = true;
    setLoading(true);

    api
      .get<{ items: TopServiceRow[] }>("/company/services/top", { params: { months } })
      .then((res) => {
        if (!alive) return;
        setItems(res.data.items);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [months]);

  return (
    <AppShell>
      <Card
        title="Top dịch vụ"
        extra={
          <Select
            value={months}
            style={{ width: 140 }}
            onChange={setMonths}
            options={[
              { value: 1, label: "1 tháng" },
              { value: 3, label: "3 tháng" },
              { value: 6, label: "6 tháng" },
              { value: 12, label: "12 tháng" },
            ]}
          />
        }
      >
        {loading ? (
          <Spin />
        ) : (
          <Table
            rowKey={(r) => `${r.MaDV}`}
            dataSource={items}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: "Mã DV", dataIndex: "MaDV" },
              { title: "Tên DV", dataIndex: "TenDV" },
              { title: "Số lần", dataIndex: "SoLan" },
            ]}
          />
        )}
      </Card>
    </AppShell>
  );
}