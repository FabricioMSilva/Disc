"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Datum = { name: string; total: number };
const colors = ["#0068d9", "#23a8ff", "#14b88a", "#f59e0b", "#657087"];

export function DashboardCharts({ byTeam, discProfiles }: { byTeam: Datum[]; discProfiles: Datum[] }) {
  return <div className="dashboard-charts">
    <section className="surface" style={{ padding: 18 }}><p className="eyebrow">Participação</p><h2 style={{ fontSize: 17, margin: "5px 0 16px" }}>Conclusões por equipe</h2>{byTeam.length ? <div style={{ width: "100%", height: 245 }}><ResponsiveContainer><BarChart data={byTeam} margin={{ top: 5, right: 12, left: -20, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="total" name="Concluídas" fill="#0068d9" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="empty-state">Sem conclusões registradas para exibir.</div>}</section>
    <section className="surface" style={{ padding: 18 }}><p className="eyebrow">Indicadores DISC</p><h2 style={{ fontSize: 17, margin: "5px 0 16px" }}>Autopercepções registradas</h2>{discProfiles.length ? <div style={{ width: "100%", height: 245 }}><ResponsiveContainer><PieChart><Pie data={discProfiles} dataKey="total" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={3}>{discProfiles.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <div className="empty-state">Os perfis aparecerão após avaliações concluídas.</div>}</section>
  </div>;
}