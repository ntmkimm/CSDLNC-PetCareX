// src/components/charts/MemberShipPie.tsx
import React from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

type Data = { name: string; value: number }[]

const COLORS = ['#1890ff', '#13c2c2', '#ffc53d', '#ff7a45', '#a0d911', '#722ed1', '#fa541c']

export default function MembershipPie({ data }: { data: Data }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(entry) => `${entry.name}: ${entry.value}`} />
          {data.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
          <Tooltip formatter={(v: any) => Number(v).toLocaleString('vi-VN')} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
