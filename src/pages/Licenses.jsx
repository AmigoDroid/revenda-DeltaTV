import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Empty, Field, LoadError, Modal, OnlineBadge, Pager, Table, fmtDate, fmtDateTime, useAction, useDebounced, useList, useLoad, useUi } from "../ui.jsx";
import { monthsLabel } from "./Stock.jsx";
import TransferLicense from "./TransferLicense.jsx";

/**
 * Licenças do revendedor: as que nasceram do estoque dele (aplicadas a um MAC ou vendidas pelo código).
 * Aqui ele vê o prazo de cada uma, renova gastando uma licença do estoque e suspende/reativa as suas.
 * Bloquear e cancelar continuam com a plataforma. O servidor isola tudo pelo token; esta tela só apresenta.
 */

const FILTERS = [
  ["all", "Todas"], ["active", "Em vigor"], ["expiring", "Vencem em 7 dias"], ["expired", "Vencidas"],
  ["suspended", "Suspensas"], ["blocked", "Bloqueadas"], ["cancelled", "Canceladas"], ["pending", "Pendentes"], ["unused", "Sem aparelho"],
];
const EVENT = {
  purchased: "Comprada", assigned: "Atribuída", activated: "Ativada", transferred: "Transferida de MAC",
  suspended: "Suspensa", reactivated: "Reativada", revoked: "Revogada", released: "Liberada",
};
const changed = () => window.dispatchEvent(new Event("stock-changed"));

function Remaining({ l }) {
  if (!l.expiresAt) return <span className="muted">Começa ao ativar</span>;
  const live = l.status === "active" && l.remainingDays > 0;
  return <>{fmtDate(l.expiresAt)}<div className="muted" style={{ fontSize: 12 }}>{live ? `${l.remainingDays} dia(s)` : l.status === "active" ? "vencida" : ""}</div></>;
}

const stateOf = (l) => l.effectiveStatus; // "expired" é derivado da data

/** Escolhe a duração entre as que há em estoque e gasta 1 licença na renovação. */
function RenewModal({ license, onClose, onDone }) {
  const run = useAction();
  const { toast } = useUi();
  const stock = useLoad(() => api("/partner/stock", { query: { page: 1, pageSize: 1 } }), []);
  const balances = stock.data?.balances ?? [];
  const [months, setMonths] = useState("");
  useEffect(() => { if (balances.length && !balances.some((b) => String(b.months) === months)) setMonths(String(balances[0].months)); }, [stock.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const r = await run(() => api(`/partner/licenses/${license.id}/renew`, { method: "POST", body: { months: Number(months) } }));
    setBusy(false);
    if (r && r !== true) { toast(`Licença renovada até ${fmtDate(r.expiresAt)}.`); changed(); onDone(); }
  };
  return (
    <Modal title="Renovar licença" onClose={onClose}>
      <p className="muted">
        {license.device ? <>MAC <span className="mono">{license.device.mac}</span> · </> : null}
        {license.expiresAt ? <>vence em <strong>{fmtDate(license.expiresAt)}</strong>. Se ainda estiver em vigor, o prazo novo é somado ao vencimento; se já venceu, conta a partir de hoje.</> : "ainda não começou a contar."}
      </p>
      {stock.error ? <LoadError error={stock.error} onRetry={stock.reload} /> : !stock.data ? <p className="muted">Carregando estoque…</p> : balances.length === 0 ? (
        <p className="error">Seu estoque está vazio. Compre ou peça mais licenças para renovar.</p>
      ) : (
        <Field label="Duração" hint="Gasta 1 licença do seu estoque.">
          <select value={months} onChange={(e) => setMonths(e.target.value)}>{balances.map((b) => <option key={b.months} value={b.months}>{monthsLabel(b.months)} ({b.quantity} disponível)</option>)}</select>
        </Field>
      )}
      <div className="actions"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={!months || busy} onClick={submit}>{busy ? "Renovando…" : "Renovar"}</button></div>
    </Modal>
  );
}

function Detail({ id, onClose, onChanged }) {
  const { confirm } = useUi();
  const run = useAction();
  const d = useLoad(() => api(`/partner/licenses/${id}`), [id]);
  const [renew, setRenew] = useState(false);
  const [transfer, setTransfer] = useState(null);
  const l = d.data;

  const after = () => { d.reload(); onChanged(); };
  const suspend = async () => {
    const c = await confirm({
      title: "Suspender licença", danger: true, reason: "optional", confirmLabel: "Suspender",
      message: "O cliente perde o acesso agora. O prazo continua correndo enquanto estiver suspensa. Você pode reativar quando quiser.",
    });
    if (!c) return;
    const r = await run(() => api(`/partner/licenses/${id}/suspend`, { method: "POST", body: { reason: c.reason } }), "Licença suspensa.");
    if (r && r !== true) { d.setData(r); onChanged(); }
  };
  const reactivate = async () => {
    const r = await run(() => api(`/partner/licenses/${id}/reactivate`, { method: "POST", body: {} }), "Licença reativada.");
    if (r && r !== true) { d.setData(r); onChanged(); }
  };

  return (
    <Modal title="Licença" onClose={onClose} wide>
      {d.error && <LoadError error={d.error} onRetry={d.reload} />}
      {!l && !d.error && <p className="muted">Carregando…</p>}
      {l && (
        <>
          <dl className="kv">
            <dt>Situação</dt><dd><Badge status={stateOf(l)} />{l.statusReason && <span className="muted"> {l.statusReason}</span>}</dd>
            <dt>Duração</dt><dd>{l.months ? monthsLabel(l.months) : "—"}</dd>
            <dt>Início</dt><dd>{fmtDate(l.startsAt)}</dd>
            <dt>Vencimento</dt><dd>{l.expiresAt ? <>{fmtDate(l.expiresAt)} <span className="muted">({l.status === "active" && l.remainingDays > 0 ? `${l.remainingDays} dia(s)` : "sem tempo restante"})</span></> : "Começa ao ativar"}</dd>
            <dt>Final do código</dt><dd className="mono">{l.codeLast4}</dd>
            <dt>Criada em</dt><dd>{fmtDateTime(l.createdAt)}</dd>
          </dl>
          <div className="actions left" style={{ marginTop: 12 }}>
            {l.canRenew && <button className="btn primary" onClick={() => setRenew(true)}>Renovar</button>}
            {l.canSuspend && <button className="btn danger" onClick={suspend}>Suspender</button>}
            {l.canReactivate && <button className="btn primary" onClick={reactivate}>Reativar</button>}
          </div>
          {!l.canRenew && <p className="muted">Licença {l.status === "blocked" ? "bloqueada" : "cancelada"} pela plataforma: fale com ela para reverter.</p>}
          {l.status === "suspended" && !l.canReactivate && <p className="muted">Suspensa pela plataforma: só ela pode reativar.</p>}

          <h4 style={{ margin: "16px 0 6px" }}>Aparelhos</h4>
          {l.devices.length === 0 ? <p className="muted">Nenhum aparelho vinculado. Aplique-a a um MAC em Dispositivos.</p> : (
            <Table>
              <thead><tr><th>MAC</th><th>Situação</th><th>Ativado em</th><th>Última atividade</th><th /></tr></thead>
              <tbody>{l.devices.map((v) => (
                <tr key={v.activationId}>
                  <td className="mono">{v.mac || "—"}</td>
                  <td>{v.status === "revoked" ? <><Badge status="revoked" />{v.statusReason && <div className="muted" style={{ fontSize: 12 }}>{v.statusReason}</div>}</> : <Badge status={v.status === "active" && !v.access.allowed ? "blocked" : v.status} label={v.status === "active" && !v.access.allowed ? v.access.message : undefined} />}</td>
                  <td>{fmtDateTime(v.activatedAt)}</td>
                  <td><OnlineBadge online={v.online} lastSeenAt={v.lastSeenAt} /><div className="muted">{fmtDateTime(v.lastSeenAt)}</div></td>
                  <td className="actions">{v.transferable && l.status === "active" && l.remainingDays > 0 && <button className="btn sm" onClick={() => setTransfer(v)}>Transferir MAC</button>}</td>
                </tr>))}</tbody>
            </Table>
          )}

          <h4 style={{ margin: "16px 0 6px" }}>Renovações</h4>
          {l.renewals.length === 0 ? <p className="muted">Nenhuma renovação.</p> : (
            <Table>
              <thead><tr><th>Quando</th><th>Duração</th><th>Vencimento anterior</th><th>Novo vencimento</th></tr></thead>
              <tbody>{l.renewals.map((r) => <tr key={r.id}><td>{fmtDateTime(r.at)}</td><td>{r.months ? monthsLabel(r.months) : "—"}</td><td>{fmtDate(r.from)}</td><td>{fmtDate(r.to)}</td></tr>)}</tbody>
            </Table>
          )}

          {l.events.length > 0 && (
            <>
              <h4 style={{ margin: "16px 0 6px" }}>Histórico</h4>
              <Table>
                <thead><tr><th>Quando</th><th>O que</th><th>Detalhe</th></tr></thead>
                <tbody>{l.events.map((e) => (
                  <tr key={e.id}><td>{fmtDateTime(e.at)}</td><td>{EVENT[e.event] || e.event}</td>
                    <td>{[e.metadata.fromMac && e.metadata.toMac ? `${e.metadata.fromMac} → ${e.metadata.toMac}` : null, e.metadata.months ? monthsLabel(e.metadata.months) : null, e.metadata.reason].filter(Boolean).join(" · ") || "—"}</td></tr>))}</tbody>
              </Table>
            </>
          )}
          <div className="actions"><button className="btn" onClick={onClose}>Fechar</button></div>
        </>
      )}
      {renew && l && <RenewModal license={{ ...l, device: l.devices.find((v) => v.status !== "revoked") }} onClose={() => setRenew(false)} onDone={() => { setRenew(false); after(); }} />}
      {transfer && l && (
        <TransferLicense
          activation={{ id: transfer.activationId, mac: transfer.mac, grantedLicense: { expiresAt: l.expiresAt, remainingDays: l.remainingDays } }}
          onClose={() => setTransfer(null)} onDone={() => { setTransfer(null); changed(); after(); }}
        />
      )}
    </Modal>
  );
}

export default function Licenses() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const list = useList("/partner/licenses", { q: "", filter: "all" });
  const summary = useLoad(() => api("/partner/licenses/summary"), []);
  const [open, setOpen] = useState(null); // id da licença no detalhe
  const [renew, setRenew] = useState(null); // linha a renovar
  const { filter: applyFilter, reload: reloadList } = list;
  const reloadSummary = summary.reload;

  useEffect(() => { applyFilter({ q: dq }); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps
  // Aplicar/transferir licença em outras telas muda o que está listado aqui.
  useEffect(() => {
    const h = () => { reloadList(); reloadSummary(); };
    window.addEventListener("stock-changed", h);
    return () => window.removeEventListener("stock-changed", h);
  }, [reloadList, reloadSummary]);
  const refresh = () => { reloadList(); reloadSummary(); };

  const s = summary.data;
  const card = (label, value, filter, tone) => (
    <button type="button" className="card stat" style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => list.filter({ filter })}>
      <small>{label}</small><strong style={value && tone ? { color: `var(--${tone})` } : undefined}>{value}</strong>
    </button>
  );
  return (
    <section>
      {s && (
        <div className="grid cards">
          {card("Total", s.total, "all")}
          {card("Em vigor", s.active, "active", "ok")}
          {card(`Vencem em ${s.expiringDays} dias`, s.expiring, "expiring", "warn")}
          {card("Vencidas", s.expired, "expired", "bad")}
          {card("Suspensas/bloqueadas", s.suspended, "suspended", "warn")}
        </div>
      )}
      <div className="toolbar" style={{ marginTop: 12 }}>
        <input placeholder="Buscar por cliente, telefone, MAC ou final do código" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar licença" />
        <select value={list.params.filter} onChange={(e) => list.filter({ filter: e.target.value })} aria-label="Filtro">
          {FILTERS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
      </div>
      <Table>
        <thead><tr><th>Cliente / MAC</th><th>Duração</th><th>Situação</th><th>Vence em</th><th /></tr></thead>
        <tbody>{list.data.map((l) => (
          <tr key={l.id}>
            <td>
              {l.client ? <strong>{l.client.name}</strong> : <span className="muted">{l.device ? "Sem cadastro" : "Sem aparelho"}</span>}
              {l.device && <div className="mono muted" style={{ fontSize: 12 }}>{l.device.mac}</div>}
            </td>
            <td>{monthsLabel(l.months)}</td>
            <td><Badge status={stateOf(l)} /></td>
            <td><Remaining l={l} /></td>
            <td className="actions">
              <button className="btn sm" onClick={() => setOpen(l.id)}>Detalhes</button>
              {l.canRenew && <button className="btn sm primary" onClick={() => setRenew(l)}>Renovar</button>}
            </td>
          </tr>))}</tbody>
      </Table>
      <Empty loading={list.loading} error={list.error} count={list.data.length} />
      <Pager meta={list.meta} onPage={list.setPage} />
      {open && <Detail id={open} onClose={() => setOpen(null)} onChanged={refresh} />}
      {renew && <RenewModal license={renew} onClose={() => setRenew(null)} onDone={() => { setRenew(null); refresh(); }} />}
    </section>
  );
}
