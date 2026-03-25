'use client';

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
  Legend
} from 'recharts';

export default function Chart({ data, g11Rate }: { data: any, g11Rate?: number }) {
  if (!data || data.length === 0) return <p style={{ color: '#64748b' }}>Brak danych do wyświetlenia.</p>;

  return (
    <div style={{ width: '100%', height: '400px', marginTop: '2rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} />
          <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}kWh`} />
          <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(2)}zł`} />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
          />
          <Legend verticalAlign="top" align="right" height={40} iconType="circle" />
          <Bar yAxisId="left" dataKey="kwh" name="Zużycie (kWh)" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="price" name="Cena RCE (Giełda)" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
          <Line yAxisId="right" type="step" dataKey="g11Price" name="Twoja Stawka G11" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
