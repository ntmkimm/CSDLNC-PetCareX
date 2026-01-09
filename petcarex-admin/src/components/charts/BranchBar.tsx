// src/components/charts/BranchBar.tsx
import React from 'react'
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Cell, LabelList 
} from 'recharts'

const COLORS = ['#1890ff', '#2fc25b', '#facc14', '#223273', '#8543e0', '#13c2c2', '#ff4d4f'];

export default function BranchBar({ data }: { data: { branch: string; revenue: number }[] }) {
  // Hàm rút gọn số: 1.000.000 -> 1M
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    return value.toLocaleString('vi-VN');
  }

  return (
    <div style={{ width: '100%', height: 350, padding: '10px' }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 25, right: 30, left: 10, bottom: 65 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#1890ff" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="branch" 
            angle={-35} 
            textAnchor="end" 
            interval={0} 
            height={70}
            tick={{ fill: '#595959', fontSize: 12 }}
          />
          <YAxis 
            tickFormatter={formatYAxis}
            tick={{ fill: '#595959', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            cursor={{ fill: '#f5f5f5' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            formatter={(v: any) => [new Intl.NumberFormat('vi-VN').format(v) + ' đ', 'Doanh thu']}
          />
          <Bar 
            dataKey="revenue" 
            fill="url(#barGradient)" 
            radius={[4, 4, 0, 0]} // Bo góc trên
            barSize={40}
          >
            {/* Hiển thị số liệu trực tiếp trên cột */}
            <LabelList 
              dataKey="revenue" 
              position="top" 
              formatter={formatYAxis} 
              style={{ fontSize: 11, fill: '#8c8c8c' }} 
            />
            {/* Đổ màu khác nhau cho mỗi cột nếu muốn (Tùy chọn) */}
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}