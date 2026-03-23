// @ts-nocheck
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Chart({ data }) {
  return (
    <div style={{ height: '400px', width: '100%', backgroundColor: 'white', padding: '20px', borderRadius: '10px', color: 'black' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="time" stroke="#8884d8" />
          <YAxis yAxisId="left" stroke="#8884d8" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#000' }} />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="kwh" stroke="#8884d8" name="Zużycie (kWh)" strokeWidth={3} dot={false} />
          <Line yAxisId="right" type="stepAfter" dataKey="price" stroke="#82ca9d" name="Cena (PLN/kWh)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
