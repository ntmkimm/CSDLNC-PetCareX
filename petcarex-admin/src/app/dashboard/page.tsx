// src/app/dashboard/page.tsx

"use client";

import { Col, Row, Spin, Table } from "antd";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import KpiCard from "@/components/KpiCard";
import BarChartCard from "@/components/charts/BarChartCard";
import PieChartCard from "@/components/charts/PieChartCard";
import { api } from "@/lib/api";
import type {
  RevenueByBranchRow,
  TotalRevenueRow,
  TopServiceRow,
  MembershipRow,
  CustomersByBranchRow,
  PetsRow,
} from "@/lib/types";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  const [total, setTotal] = useState<TotalRevenueRow>({ TongDoanhThu: 0 });
  const [revByBranch, setRevByBranch] = useState<RevenueByBranchRow[]>([]);
  const [topServices, setTopServices] = useState<TopServiceRow[]>([]);
  const [membership, setMembership] = useState<MembershipRow[]>([]);
  const [custByBranch, setCustByBranch] = useState<CustomersByBranchRow[]>([]);
  const [pets, setPets] = useState<PetsRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [
        totalRes,
        revRes,
        topRes,
        memRes,
        custRes,
        petsRes,
      ] = await Promise.all([
        api.get<TotalRevenueRow>("/company/revenue/total"),
        api.get<{ items: RevenueByBranchRow[] }>("/company/revenue/by-branch"),
        api.get<{ items: TopServiceRow[] }>("/company/services/top", { params: { months: 6 } }),
        api.get<{ items: MembershipRow[] }>("/company/memberships/stats"),
        api.get<{ items: CustomersByBranchRow[] }>("/company/customers/by-branch"),
        api.get<{ items: PetsRow[] }>("/company/pets/stats"),
      ]);

      setTotal(totalRes.data);
      setRevByBranch(revRes.data.items);
      setTopServices(topRes.data.items);
      setMembership(memRes.data.items);
      setCustByBranch(custRes.data.items);
      setPets(petsRes.data.items);

      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      {loading ? (
        <Spin />
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <KpiCard title="Tổng doanh thu" value={total.TongDoanhThu ?? 0} />
          </Col>

          <Col xs={24} md={16}>
            <BarChartCard
              title="Doanh thu theo chi nhánh"
              data={revByBranch}
              xKey="MaCN"
              barKey="DoanhThu"
            />
          </Col>

          <Col xs={24} md={12}>
            <BarChartCard
              title="Khách theo chi nhánh"
              data={custByBranch}
              xKey="MaCN"
              barKey="SoKhach"
            />
          </Col>

          <Col xs={24} md={12}>
            <PieChartCard
              title="Hạng khách hàng"
              data={membership}
              nameKey="Bac"
              valueKey="SoLuong"
            />
          </Col>

          <Col xs={24} md={12}>
            <PieChartCard title="Thú cưng theo loại" data={pets} nameKey="Loai" valueKey="SoLuong" />
          </Col>

          <Col xs={24} md={12}>
            <Table
              title={() => "Top dịch vụ (6 tháng)"}
              rowKey={(r) => `${r.MaDV}`}
              dataSource={topServices}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: "Mã DV", dataIndex: "MaDV" },
                { title: "Tên DV", dataIndex: "TenDV" },
                { title: "Số lần", dataIndex: "SoLan" },
              ]}
            />
          </Col>
        </Row>
      )}
    </AppShell>
  );
}
