"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Datum = { name: string; total: number };
type ScheduleStatusDatum = { name: string; pending: number; inProgress: number; completed: number };
const colors = ["#0068d9", "#23a8ff", "#14b88a", "#f59e0b", "#657087"];

export function DashboardCharts({ byTeam, discProfiles, bySchedule, scheduleComparison, completedProfiles = false }: {
  byTeam: Datum[];
  discProfiles: Datum[];
  bySchedule?: Datum[];
  scheduleComparison?: ScheduleStatusDatum[];
  completedProfiles?: boolean;
}) {
  const profileNames: Record<string, string> = { D: "Dominância", I: "Influência", S: "Estabilidade", C: "Conformidade" };
  const profileColors: Record<string, string> = { D: "#F05E61", I: "#C59B27", S: "#0A9F68", C: "#1473E6" };
  const profileCounts = completedProfiles ? [
    ...Object.entries(profileNames).map(([code, name]) => ({
      name, total: discProfiles.find((item) => item.name === code)?.total ?? 0, color: profileColors[code],
    })),
    ...discProfiles.filter((item) => !profileNames[item.name]).map((item) => ({
      ...item, name: item.name.split("/").map((code) => profileNames[code] ?? code).join(" / "), color: "#657087",
    })),
  ] : [];
  const completedCount = profileCounts.reduce((sum, item) => sum + item.total, 0);
  return <div className="dashboard-charts">
    {completedProfiles ? <section className="surface" style={{ padding: 18 }}>
      <p className="eyebrow">Resultados dos concluintes</p>
      <h2 style={{ fontSize: 17, margin: "5px 0 8px" }}>Quantos integrantes têm cada perfil DISC?</h2>
      <p className="muted" style={{ fontSize: 12 }}>{completedCount} {completedCount === 1 ? "integrante com resultado concluído" : "integrantes com resultado concluído"} · avaliação mais recente de cada pessoa</p>
      {completedCount ? <div style={{ width: "100%", height: 245 }}><ResponsiveContainer><BarChart data={profileCounts} margin={{ top: 20, right: 12, left: -20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip />
        <Bar dataKey="total" name="Integrantes" radius={[4, 4, 0, 0]}>{profileCounts.map((item) => <Cell key={item.name} fill={item.color} />)}<LabelList dataKey="total" position="top" /></Bar>
      </BarChart></ResponsiveContainer></div> : <div className="empty-state">Os perfis serão exibidos quando houver avaliações concluídas.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>{profileCounts.map((item) => <div key={item.name} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 10, borderLeft: `3px solid ${item.color}` }}>
        <strong style={{ fontSize: 12 }}>{item.name}</strong><p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 700 }}>{item.total} <span className="muted" style={{ fontSize: 11, fontWeight: 400 }}>de {completedCount} concluintes</span></p>
      </div>)}</div>
    </section> : <section className="surface" style={{ padding: 18 }}><p className="eyebrow">Participação</p><h2 style={{ fontSize: 17, margin: "5px 0 16px" }}>Conclusões por equipe</h2>{byTeam.length ? <div style={{ width: "100%", height: 245 }}><ResponsiveContainer><BarChart data={byTeam} margin={{ top: 5, right: 12, left: -20, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="total" name="Concluídas" fill="#0068d9" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="empty-state">Sem conclusões registradas para exibir.</div>}</section>}
    {!completedProfiles && <section className="surface" style={{ padding: 18 }}><p className="eyebrow">Indicadores DISC</p><h2 style={{ fontSize: 17, margin: "5px 0 16px" }}>Autopercepções registradas</h2>{discProfiles.length ? <div style={{ width: "100%", height: 245 }}><ResponsiveContainer><PieChart><Pie data={discProfiles} dataKey="total" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={3}>{discProfiles.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <div className="empty-state">Os perfis aparecerão após avaliações concluídas.</div>}</section>}
    {bySchedule && <section className="surface" style={{ padding: 18 }}><p className="eyebrow">Organização da equipe</p><h2 style={{ fontSize: 17, margin: "5px 0 16px" }}>Integrantes por horário</h2>{bySchedule.length ? <div style={{ width: "100%", height: 245 }}><ResponsiveContainer><BarChart data={bySchedule} margin={{ top: 5, right: 12, left: -20, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="total" name="Integrantes" fill="#14b88a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="empty-state">Nenhum integrante nas equipes vinculadas.</div>}</section>}
    {scheduleComparison && <section className="surface" style={{ padding: 18 }}><p className="eyebrow">Comparativo de participação</p><h2 style={{ fontSize: 17, margin: "5px 0 16px" }}>Andamento por horário</h2>{scheduleComparison.length ? <div style={{ width: "100%", height: 245 }}><ResponsiveContainer><BarChart data={scheduleComparison} margin={{ top: 5, right: 12, left: -20, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Bar dataKey="pending" name="Pendentes" fill="#f59e0b" radius={[4, 4, 0, 0]} /><Bar dataKey="inProgress" name="Em andamento" fill="#23a8ff" radius={[4, 4, 0, 0]} /><Bar dataKey="completed" name="Concluídas" fill="#14b88a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="empty-state">Sem dados de participação por horário.</div>}</section>}
  </div>;
}