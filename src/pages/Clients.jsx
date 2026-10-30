import { useEffect, useState } from "react";
import { api } from "../api.js";
import { usePortal } from "../portal.jsx";
import { NewWebAccess } from "./WebAccess.jsx";
import { Badge, Empty, Field, Modal, Pager, RowMenu, Table, dateInput, fmtDate, fmtMoney, formatMac, toCents, useAction, useDebounced, useList, useLoad, useUi } from "../ui.jsx";

/**
 * Clientes do revendedor: agenda por MAC (nome, telefone, endereço, valor e vencimento).
 * Mostra juntas as TVs ativadas por este revendedor e os MACs que ele cadastrou à mão (mesmo sem ativação).
 * O servidor isola tudo pelo token; aqui só se apresenta e se edita.
 */

// "2026-10-25" -> "25/10/2026" sem passar por Date (evita voltar um dia por fuso).
const fmtDay = (ymd) => (ymd ? ymd.split("-").reverse().join("/") : "—");
const today = () => dateInput(new Date());

/** Soma 1 mês a "AAAA-MM-DD" mantendo o fim do mês (31/01 -> 28/02). */
function addMonth(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // último dia do mês seguinte
  const dt = new Date(Date.UTC(y, m, Math.min(d, lastDay)));
  return dt.toISOString().slice(0, 10);
}
const nextDue = (due) => addMonth(due && due >= today() ? due : today()); // vencido: conta a partir de hoje

export const whatsapp = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
};

function DueBadge({ days }) {
  if (days == null) return <span className="muted">—</span>;
  if (days < 0) return <Badge status="overdue" label={`Vencido há ${-days} dia(s)`} />;
  if (days === 0) return <Badge status="partial" label="Vence hoje" />;
  if (days <= 7) return <Badge status="partial" label={`Vence em ${days} dia(s)`} />;
  return <Badge status="active" label={`Em ${days} dias`} />;
}

function DeviceCell({ device, onAccess }) {
  if (!device) return <span className="muted">TV não ativada</span>;
  const lic = device.licenseExpiresAt && device.licenseStatus === "active" ? `licença até ${fmtDate(device.licenseExpiresAt)}` : null;
  return <><Badge status={device.status} />{lic && <div className="muted" style={{ fontSize: 12 }}>{lic}</div>}<div><button className="btn sm" style={{ marginTop: 4 }} onClick={onAccess}>Ver usuário e senha</button></div></>;
}

const FILTERS = [["all", "Todos"], ["overdue", "Vencidos"], ["due_soon", "Vencem em 7 dias"], ["no_due", "Sem vencimento"], ["unregistered", "TV ativa sem cadastro"]];

export default function Clients() {
  const { isReseller } = usePortal();
  const [webFor, setWebFor] = useState(null); // linha (cliente/MAC) para a qual se gera um acesso do Player Web
  const { confirm } = useUi();
  const run = useAction();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const list = useList("/partner/clients", { q: "", filter: "all" });
  const summary = useLoad(() => api("/partner/clients/summary"), []);
  const [edit, setEdit] = useState(null); // linha da lista (cadastrar/editar) ou { mac: "", isNew: true }
  const [access, setAccess] = useState(null); // linha cujo usuário/senha da lista está aberto
  const { filter: applyFilter, reload: reloadList } = list;
  const reloadSummary = summary.reload;

  useEffect(() => { applyFilter({ q: dq }); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps
  // Aplicar licença do estoque muda a TV da linha: recarrega.
  useEffect(() => {
    const h = () => reloadList();
    window.addEventListener("stock-changed", h);
    return () => window.removeEventListener("stock-changed", h);
  }, [reloadList]);

  const refresh = () => { reloadList(); reloadSummary(); };
  const renew = async (r) => {
    const due = nextDue(r.dueDate);
    if (await run(() => api(`/partner/clients/${r.clientId}`, { method: "PATCH", body: { dueDate: due } }), `Novo vencimento: ${fmtDay(due)}.`)) refresh();
  };
  const remove = async (r) => {
    if (!(await confirm({ title: "Excluir cliente", message: `${r.name} · ${r.mac}. Só apaga o cadastro (nome, contato, valor); a TV e a licença não são afetadas.`, danger: true, confirmLabel: "Excluir" }))) return;
    if (await run(() => api(`/partner/clients/${r.clientId}`, { method: "DELETE" }), "Cliente excluído.")) refresh();
  };

  const s = summary.data;
  return (
    <section>
      <div className="actions left"><button className="btn primary" onClick={() => setEdit({ mac: "", isNew: true })}>Adicionar cliente</button></div>
      {s && (
        <div className="grid cards">
          <div className="card stat"><small>Clientes cadastrados</small><strong>{s.clients}</strong></div>
          <div className="card stat"><small>Vencidos</small><strong style={s.overdue ? { color: "var(--bad)" } : undefined}>{s.overdue}</strong></div>
          <div className="card stat"><small>Vencem em {s.dueSoonDays} dias</small><strong style={s.dueSoon ? { color: "var(--warn)" } : undefined}>{s.dueSoon}</strong></div>
          <div className="card stat"><small>Receita mensal prevista</small><strong>{fmtMoney(s.monthlyCents)}</strong></div>
        </div>
      )}
      <div className="toolbar">
        <input placeholder="Buscar por nome, telefone, endereço ou MAC" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar cliente" />
        <select value={list.params.filter} onChange={(e) => list.filter({ filter: e.target.value })} aria-label="Filtro">
          {FILTERS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
      </div>
      <Table>
        <thead><tr><th>Cliente</th><th>MAC</th><th>Valor</th><th>Vencimento</th><th>TV</th><th /></tr></thead>
        <tbody>{list.data.map((r) => {
          const wa = whatsapp(r.phone);
          return (
            <tr key={r.mac}>
              <td>
                {r.clientId ? <strong>{r.name}</strong> : <span className="muted">Sem cadastro</span>}
                {r.phone && <div style={{ fontSize: 12 }}>{wa ? <a href={wa} target="_blank" rel="noopener noreferrer" title="Abrir conversa no WhatsApp">{r.phone}</a> : r.phone}</div>}
                {r.address && <div className="muted" style={{ fontSize: 12 }}>{r.address}</div>}
              </td>
              <td className="mono">{r.mac}</td>
              <td>{r.priceCents != null ? fmtMoney(r.priceCents) : <span className="muted">—</span>}</td>
              <td>{r.dueDate ? <>{fmtDay(r.dueDate)}<div><DueBadge days={r.daysLeft} /></div></> : <span className="muted">—</span>}</td>
              <td><DeviceCell device={r.device} onAccess={() => setAccess(r)} /></td>
              <td className="actions">
                <RowMenu items={r.clientId ? [
                  { label: "+1 mês", title: `Novo vencimento: ${fmtDay(nextDue(r.dueDate))}`, onClick: () => renew(r) },
                  { label: "Gerar acesso Player Web", hidden: !(isReseller && r.mac && r.device && r.device.status !== "revoked"), onClick: () => setWebFor(r) },
                  { label: "Editar", onClick: () => setEdit(r) },
                  { label: "Excluir", danger: true, onClick: () => remove(r) },
                ] : [
                  { label: "Cadastrar dados", onClick: () => setEdit(r) },
                  { label: "Gerar acesso Player Web", hidden: !(isReseller && r.mac && r.device && r.device.status !== "revoked"), onClick: () => setWebFor(r) },
                ]} />
              </td>
            </tr>);
        })}</tbody>
      </Table>
      <Empty loading={list.loading} error={list.error} count={list.data.length} />
      <Pager meta={list.meta} onPage={list.setPage} />
      {webFor && <NewWebAccess initial={{ mac: webFor.mac, label: webFor.name || undefined }} onClose={() => setWebFor(null)} />}
      {access && <ListAccessModal row={access} onClose={() => setAccess(null)} />}
      {edit && <ClientModal row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
    </section>
  );
}

/** Usuário e senha da lista desta TV. Buscados só ao abrir (cada consulta fica na auditoria); somem da memória ao fechar. */
function ListAccessModal({ row, onClose }) {
  const { toast } = useUi();
  const [cred, setCred] = useState(null);
  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    let alive = true;
    api("/partner/clients/credentials", { method: "POST", body: { activationId: row.device.activationId } })
      .then((r) => alive && setCred(r)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [row.device.activationId]);
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); toast(`${what} copiado.`); } catch { toast("Não foi possível copiar; selecione e copie manualmente.", "bad"); }
  };
  return (
    <Modal title={`Lista de ${row.name || row.mac}`} onClose={onClose}>
      {error && <p className="error">{error}</p>}
      {!cred && !error && <p className="muted">Carregando…</p>}
      {cred && (
        <dl className="kv">
          <dt>MAC</dt><dd className="mono">{cred.mac}</dd>
          {cred.server && <><dt>Servidor</dt><dd>{cred.server}</dd></>}
          <dt>Usuário</dt><dd><span className="mono">{cred.username}</span> <button className="btn sm" onClick={() => copy(cred.username, "Usuário")}>Copiar</button></dd>
          <dt>Senha</dt><dd><span className="mono">{show ? cred.password : "••••••••"}</span> <button className="btn sm" onClick={() => setShow((v) => !v)}>{show ? "Ocultar" : "Mostrar"}</button> <button className="btn sm" onClick={() => copy(cred.password, "Senha")}>Copiar</button></dd>
        </dl>
      )}
      <p className="muted" style={{ fontSize: 12 }}>Dado sensível do cliente: esta consulta fica registrada na auditoria.</p>
      <div className="actions"><button className="btn" onClick={onClose}>Fechar</button></div>
    </Modal>
  );
}

function ClientModal({ row, onClose, onSaved }) {
  const run = useAction();
  const { toast } = useUi();
  const existing = !!row.clientId;
  const [f, setF] = useState({
    mac: row.mac || "", name: row.name || "", phone: row.phone || "", address: row.address || "", notes: row.notes || "",
    price: row.priceCents != null ? (row.priceCents / 100).toFixed(2).replace(".", ",") : "", dueDate: row.dueDate || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const macLocked = !existing && !row.isNew; // TV já ativada: o MAC vem da lista

  const submit = async (e) => {
    e.preventDefault();
    const mac = formatMac(f.mac);
    if (!mac) return toast("MAC inválido. Informe 12 dígitos hexadecimais, ex.: AA:BB:CC:DD:EE:FF.", "bad");
    if (f.name.trim().length < 2) return toast("Informe o nome do cliente.", "bad");
    let priceCents = null;
    if (f.price.trim()) {
      priceCents = toCents(f.price);
      if (priceCents == null) return toast("Valor inválido. Use um número, ex.: 30,00.", "bad");
    }
    const body = { mac, name: f.name, phone: f.phone || null, address: f.address || null, notes: f.notes || null, priceCents, dueDate: f.dueDate || null };
    setBusy(true);
    const r = await run(() => (existing
      ? api(`/partner/clients/${row.clientId}`, { method: "PATCH", body })
      : api("/partner/clients", { method: "POST", body })), existing ? "Cliente atualizado." : "Cliente cadastrado.");
    setBusy(false);
    if (r) onSaved();
  };

  return (
    <Modal title={existing ? `Editar cliente · ${row.name}` : "Cadastrar cliente"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="row">
          <Field label="MAC da TV" hint={macLocked ? "TV já ativada por você." : "Pode ser de uma TV ainda não ativada."}>
            <input className="mono" value={f.mac} onChange={set("mac")} placeholder="AA:BB:CC:DD:EE:FF" readOnly={macLocked} required autoFocus={row.isNew} />
          </Field>
          <Field label="Nome do cliente"><input value={f.name} onChange={set("name")} maxLength={160} required autoFocus={!row.isNew} /></Field>
        </div>
        <div className="row">
          <Field label="Telefone / WhatsApp"><input value={f.phone} onChange={set("phone")} placeholder="(85) 99999-0000" inputMode="tel" maxLength={30} /></Field>
          <Field label="Valor cobrado (R$)" hint="Opcional. Ex.: 30,00"><input value={f.price} onChange={set("price")} placeholder="30,00" inputMode="decimal" /></Field>
        </div>
        <div className="row">
          <Field label="Próximo vencimento"><input type="date" value={f.dueDate} onChange={set("dueDate")} min="2000-01-01" max="2100-12-31" /></Field>
          <Field label="Endereço"><input value={f.address} onChange={set("address")} maxLength={300} /></Field>
        </div>
        <Field label="Observações"><input value={f.notes} onChange={set("notes")} maxLength={500} /></Field>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}
