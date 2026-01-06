// src/components/AppShell.tsx

"use client";

import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  DollarOutlined,
  AppstoreOutlined,
  TeamOutlined,
  CrownOutlined,
  BugOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

const { Header, Sider, Content } = Layout;

const items = [
  { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
  {
    key: "revenue",
    icon: <DollarOutlined />,
    label: "Doanh thu",
    children: [
      { key: "/revenue/total", label: "Tổng doanh thu" },
      { key: "/revenue/by-branch", label: "Theo chi nhánh" },
    ],
  },
  {
    key: "services",
    icon: <AppstoreOutlined />,
    label: "Dịch vụ",
    children: [{ key: "/services/top", label: "Top dịch vụ" }],
  },
  {
    key: "customers",
    icon: <TeamOutlined />,
    label: "Khách hàng",
    children: [{ key: "/customers/by-branch", label: "Theo chi nhánh" }],
  },
  { key: "/memberships/stats", icon: <CrownOutlined />, label: "Hạng khách" },
  { key: "/pets/stats", icon: <BugOutlined />, label: "Thú cưng" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible>
        <div style={{ color: "white", padding: 16, fontWeight: 700 }}>
          PetCareX Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={items as any}
          onClick={({ key }) => {
            if (typeof key === "string" && key.startsWith("/")) router.push(key);
          }}
        />
      </Sider>

      <Layout>
        <Header style={{ background: "white", padding: "0 16px", fontWeight: 600 }}>
          {pathname}
        </Header>
        <Content style={{ margin: 16 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
