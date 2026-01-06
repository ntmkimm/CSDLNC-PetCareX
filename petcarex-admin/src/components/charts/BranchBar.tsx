// src/components/charts/BranchBar.tsx

import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function BranchBar({ data }: { data: { branch: string; revenue: number }[] }) {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 20, bottom: 60, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="branch" angle={-30} textAnchor="end" interval={0} height={60} />
          <YAxis tickFormatter={(v) => Number(v).toLocaleString('vi-VN')} />
          <Tooltip formatter={(v: any) => Number(v).toLocaleString('vi-VN')} />
          <Bar dataKey="revenue" fill="#1890ff" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
