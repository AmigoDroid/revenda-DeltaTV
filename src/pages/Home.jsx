import { useEffect, useState } from "react";
import { api } from "../api.js";
import { usePortal } from "../portal.jsx";
import { Badge, fmtDate, fmtMoney, useList, useLoad } from "../ui.jsx";
import { monthsLabel } from "./CodeModal.jsx";
import { whatsapp } from "./Clients.jsx";

const Metric = ({ label, value, hint, tone, onClick }) => (
  <div className={`metric ${onClick ? "link" : ""}`} onClick={onClick}>
    <small>{label}</small>
    <strong style={tone ? { color: `var(--${tone})` } : undefined}>{value}</strong>
    {hint && <span>{hint}</span>}
  </div>
);

function Overdue({ go }) {
  const list = useList("/partner/clients", { filter: "overdue" });
  const rows = list.data.slice(0, 6);
  return (
    <section className="panel">
      <div className="panel-head"><h3>Clientes para cobrar</h3><button className="btn sm" onClick={() => go("clientes")}>Ver todos</button></div>
      {list.loading ? <p className="muted pad">Carregando…</p> : rows.length === 0 ? <p className="muted pad">Nenhum cliente vencido.</p> : (
        <ul className="plain">{rows.map((r) => {
          const wa = whatsapp(r.phone);
          return (
            <li key={r.mac}>
              <div><strong>{r.name || "Sem cadastro"}</strong><div className="muted mono sm">{r.mac}</div></div>
              <div className="end"><Badge status="overdue" label={`Vencido há ${-r.daysLeft} dia(s)`} />{wa && <a className="btn sm" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}</div>
            </li>);
        })}</ul>
      )}
    </section>
  );
}

function StockPanel({ go }) {
  const s = useLoad(() => api("/partner/stock", { query: { page: 1, pageSize: 1 } }), []);
  const balances = s.data?.balances ?? [];
  return (
    <section className="panel">
      <div className="panel-head"><h3>Estoque de licenças</h3><button className="btn sm" onClick={() => go("estoque")}>Gerenciar</button></div>
      {!s.data ? <p className="muted pad">Carregando…</p> : balances.length === 0 ? <p className="muted pad">Estoque vazio. Compre licenças em Estoque.</p> : (
        <ul className="plain">{balances.map((b) => <li key={b.months}><span>{monthsLabel(b.months)}</span><strong>{b.quantity}</strong></li>)}</ul>
      )}
    </section>
  );
}

export default function Home({ go }) {
  const { me, isReseller, summary } = usePortal();
  const [presence, setPresence] = useState(null);
  // Só a contagem de online é atualizada em tempo quase real (consulta leve); o resto da tela não recarrega.
  useEffect(() => {
    const load = () => { if (!document.hidden) api("/partner/devices/presence").then(setPresence).catch(() => {}); };
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);
  if (!me) return <p className="muted">Carregando…</p>;
  return (
    <>
      <div className="metrics">
        {isReseller && summary && <>
          <Metric label="Clientes vencidos" value={summary.overdue} tone={summary.overdue ? "bad" : undefined} onClick={() => go("clientes")} />
          <Metric label={`Vencem em ${summary.dueSoonDays} dias`} value={summary.dueSoon} tone={summary.dueSoon ? "warn" : undefined} onClick={() => go("clientes")} />
          <Metric label="Receita mensal prevista" value={fmtMoney(summary.monthlyCents)} hint={`${summary.clients} cliente(s)`} />
        </>}
        <Metric label="Online agora" value={presence ? presence.online : "—"} hint={presence ? `Atividade nos últimos ${presence.windowSeconds} s` : "Carregando…"} tone={presence?.online ? "ok" : undefined} onClick={() => go("dispositivos")} />
        <Metric label="Dispositivos" value={`${me.deviceCount}${me.deviceLimit != null ? ` / ${me.deviceLimit}` : ""}`} hint="em uso na parceria" />
        {!isReseller && <><Metric label="Vigência até" value={fmtDate(me.endsAt)} /><Metric label="Mensalidade vence" value={`dia ${me.dueDay}`} hint={`tolerância de ${me.graceDays} dia(s)`} /></>}
      </div>
      {isReseller && <div className="two-col"><Overdue go={go} /><StockPanel go={go} /></div>}
      <section className="panel">
        <div className="panel-head"><h3>Sua parceria</h3><Badge status={me.effectiveStatus} /></div>
        <dl className="kv pad"><dt>Vigência até</dt><dd>{fmtDate(me.endsAt)}</dd><dt>Mensalidade vence</dt><dd>dia {me.dueDay} (tolerância de {me.graceDays} dia(s))</dd></dl>
      </section>
    </>
  );
}
