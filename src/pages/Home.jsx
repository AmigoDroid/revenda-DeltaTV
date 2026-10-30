import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Icon } from "../icons.jsx";
import { usePortal } from "../portal.jsx";
import { Badge, fmtDate, fmtMoney, useList, useLoad } from "../ui.jsx";
import { monthsLabel } from "./CodeModal.jsx";
import { whatsapp } from "./Clients.jsx";

const Metric = ({ label, value, hint, tone, icon, onClick }) => (
  <div className={`metric ${onClick ? "link" : ""}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}>
    <div className="metric-top"><small>{label}</small>{icon && <span className={`metric-ico ${tone || ""}`}><Icon name={icon} /></span>}</div>
    <strong style={tone ? { color: `var(--${tone})` } : undefined}>{value}</strong>
    {hint && <span>{hint}</span>}
  </div>
);

const Section = ({ title, hint, children }) => (
  <section className="home-section">
    <div className="sect-title"><h3>{title}</h3>{hint && <span className="muted">{hint}</span>}</div>
    {children}
  </section>
);

function Overdue({ go }) {
  const list = useList("/partner/clients", { filter: "overdue" });
  const rows = list.data.slice(0, 6);
  return (
    <section className="panel">
      <div className="panel-head"><h3>Clientes para cobrar</h3><button className="btn sm" onClick={() => go("clientes")}>Ver todos</button></div>
      {list.loading ? <p className="muted pad">Carregando…</p> : rows.length === 0 ? <p className="empty-ok"><Icon name="check" /> Nenhum cliente vencido.</p> : (
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

function StockPanel({ go, balances, loaded }) {
  return (
    <section className="panel">
      <div className="panel-head"><h3>Estoque de licenças</h3><button className="btn sm" onClick={() => go("estoque")}>Gerenciar</button></div>
      {!loaded ? <p className="muted pad">Carregando…</p> : balances.length === 0 ? <p className="muted pad">Estoque vazio. Compre licenças em Estoque.</p> : (
        <ul className="plain">{balances.map((b) => <li key={b.months}><span>{monthsLabel(b.months)}</span><strong>{b.quantity}</strong></li>)}</ul>
      )}
    </section>
  );
}

export default function Home({ go }) {
  const { me, isReseller, summary } = usePortal();
  const [presence, setPresence] = useState(null);
  const stock = useLoad(() => (isReseller ? api("/partner/stock", { query: { page: 1, pageSize: 1 } }) : Promise.resolve(null)), [isReseller]);
  // Só a contagem de online é atualizada em tempo quase real (consulta leve); o resto da tela não recarrega.
  useEffect(() => {
    const load = () => { if (!document.hidden) api("/partner/devices/presence").then(setPresence).catch(() => {}); };
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);
  if (!me) return <p className="muted">Carregando…</p>;

  const balances = stock.data?.balances ?? [];
  const stockLoaded = stock.data !== null || !!stock.error;
  const what = isReseller ? "revenda" : "parceria";
  const attention = isReseller ? [
    summary?.overdue > 0 && { go: "clientes", tone: "bad", text: `${summary.overdue} cliente(s) vencido(s)` },
    summary?.dueSoon > 0 && { go: "clientes", tone: "warn", text: `${summary.dueSoon} vencem em ${summary.dueSoonDays} dias` },
    stock.data && balances.length === 0 && { go: "estoque", tone: "info", text: "Estoque de licenças vazio" },
  ].filter(Boolean) : [];

  return (
    <>
      {isReseller && summary && (
        <div className={`attn ${attention.length ? "" : "ok"}`}>
          {attention.length ? <>
            <span className="attn-title">Precisa de atenção</span>
            {attention.map((a) => <button key={a.text} className={`attn-pill ${a.tone}`} onClick={() => go(a.go)}>{a.text} →</button>)}
          </> : <><span className="attn-title">Tudo em dia</span><span className="muted">Nenhum cliente vencido ou perto de vencer.</span></>}
        </div>
      )}

      {isReseller && summary && (
        <Section title="Seus clientes" hint="Vencimentos e receita">
          <div className="metrics">
            <Metric icon="alert" label="Clientes vencidos" value={summary.overdue} tone={summary.overdue ? "bad" : undefined} onClick={() => go("clientes")} />
            <Metric icon="clock" label={`Vencem em ${summary.dueSoonDays} dias`} value={summary.dueSoon} tone={summary.dueSoon ? "warn" : undefined} onClick={() => go("clientes")} />
            <Metric icon="trend" label="Receita mensal prevista" value={fmtMoney(summary.monthlyCents)} hint={`${summary.clients} cliente(s)`} />
          </div>
        </Section>
      )}

      <Section title="Aparelhos" hint={`Em uso na ${what}`}>
        <div className="metrics">
          <Metric icon="pulse" label="Online agora" value={presence ? presence.online : "—"} hint={presence ? `Atividade nos últimos ${presence.windowSeconds} s` : "Carregando…"} tone={presence?.online ? "ok" : undefined} onClick={() => go("dispositivos")} />
          <Metric icon="tv" label="Dispositivos" value={`${me.deviceCount}${me.deviceLimit != null ? ` / ${me.deviceLimit}` : ""}`} hint={me.deviceLimit != null ? "usados do limite" : "sem limite"} onClick={() => go("dispositivos")} />
          {!isReseller && <>
            <Metric icon="clock" label="Vigência até" value={fmtDate(me.endsAt)} />
            <Metric icon="wallet" label="Mensalidade vence" value={`dia ${me.dueDay}`} hint={`tolerância de ${me.graceDays} dia(s)`} onClick={() => go("financeiro")} />
          </>}
        </div>
      </Section>

      {isReseller && <div className="two-col"><Overdue go={go} /><StockPanel go={go} balances={balances} loaded={stockLoaded} /></div>}

      <section className="panel">
        <div className="panel-head"><h3>Sua {what}</h3><Badge status={me.effectiveStatus} /></div>
        <dl className="kv pad"><dt>Vigência até</dt><dd>{fmtDate(me.endsAt)}</dd><dt>Mensalidade vence</dt><dd>dia {me.dueDay} (tolerância de {me.graceDays} dia(s))</dd></dl>
      </section>
    </>
  );
}
