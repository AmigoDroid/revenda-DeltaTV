import { useEffect, useState } from "react";
import { api } from "../api.js";
import CodeModal, { CodeEditModal, monthsLabel } from "./CodeModal.jsx";
import MacDevice from "./MacDevice.jsx";
import Providers from "./Providers.jsx";
import TransferLicense from "./TransferLicense.jsx";
import { StockPortal } from "./Stock.jsx";
import { PayInvoiceButton, PixHistory } from "./Pix.jsx";
import Clients from "./Clients.jsx";
import { Badge, Empty, Pager, Table, fmtDate, fmtDateTime, fmtMoney, useAction, useDebounced, useList, useUi, RowMenu } from "../ui.jsx";

// Portal do parceiro: o backend restringe tudo ao parceiro do token (nunca confie neste front).
export default function PartnerPortal() {
  const { confirm } = useUi();
  const run = useAction();
  const [me, setMe] = useState(null);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const devices = useList("/partner/devices", { q: "" });
  const invoices = useList("/partner/invoices", {});
  const [codes, setCodes] = useState([]);
  const [newCode, setNewCode] = useState(false);
  const [providers, setProviders] = useState([]);
  const [editCode, setEditCode] = useState(null);
  const [transfer, setTransfer] = useState(null); // ativação cuja licença vai para outro MAC
  const loadCodes = () => api("/partner/codes").then((r) => setCodes(r.data));
  const loadProviders = () => api("/partner/providers").then((r) => setProviders(r.data));
  const loadMe = () => api("/partner/me").then(setMe);
  useEffect(() => { loadMe(); loadProviders(); loadCodes(); }, []);
  // Pix pago: a fatura quitada pode reativar a parceria (suspensa por atraso) e o saldo do estoque pode ter mudado.
  const [pixTick, setPixTick] = useState(0);
  const paid = () => { invoices.reload(); loadMe(); loadCodes(); setPixTick((n) => n + 1); window.dispatchEvent(new Event("stock-changed")); };
  const invoicesTable = (
    <>
      <h3 style={{ marginTop: 20 }}>Mensalidades</h3>
      <Table><thead><tr><th>Competência</th><th>Valor</th><th>Pago</th><th>Vencimento</th><th>Status</th><th /></tr></thead><tbody>{invoices.data.map((i) => <tr key={i.id}><td>{i.competence}</td><td>{fmtMoney(i.amountCents)}</td><td>{fmtMoney(i.paidCents)}</td><td>{fmtDate(i.dueDate)}</td><td><Badge status={i.status} /></td><td className="actions"><PayInvoiceButton invoice={i} onPaid={paid} /></td></tr>)}</tbody></Table>
      <Empty loading={invoices.loading} error={invoices.error} count={invoices.data.length} /><Pager meta={invoices.meta} onPage={invoices.setPage} />
      <PixHistory refreshKey={pixTick} />
    </>
  );
  // O saldo do estoque aparece na tabela de códigos: recarrega quando o estoque muda (transferência, aplicação).
  useEffect(() => { window.addEventListener("stock-changed", loadCodes); return () => window.removeEventListener("stock-changed", loadCodes); }, []);
  const isReseller = me?.kind === "reseller" || me?.kind === "both";
  useEffect(() => { devices.filter({ q: dq }); /* eslint-disable-next-line */ }, [dq]);

  const change = async (a, action, o) => {
    const c = await confirm(o);
    if (c && (await run(() => api(`/partner/devices/${a.id}/${action}`, { method: "POST", body: { reason: c.reason } }), "Atualizado."))) devices.reload();
  };
  const revoke = async (c) => { if (await confirm({ title: "Revogar código", message: "Impede novas ativações com este código.", danger: true }) && await run(() => api(`/partner/codes/${c.id}/revoke`, { method: "POST" }), "Código revogado.")) loadCodes(); };

  // Cadastro ainda não aprovado (ou suspenso/bloqueado): mostra só o aviso, sem ferramentas.
  if (me && me.effectiveStatus !== "active") {
    return (
      <>
        <div className="page-head"><h2>{me.name}</h2><Badge status={me.effectiveStatus} /></div>
        <div className="card" style={{ padding: 16 }}>
          {me.pendingApproval
            ? <><h3 style={{ marginTop: 0 }}>Cadastro em análise</h3><p>Recebemos o seu cadastro. Assim que a plataforma aprovar, o seu portal será liberado. Não é preciso fazer mais nada.</p></>
            : <><h3 style={{ marginTop: 0 }}>Conta indisponível</h3><p>Seu acesso está {me.effectiveStatus === "expired" ? "com a vigência encerrada" : "suspenso ou bloqueado"}{me.statusReason ? `: ${me.statusReason}` : "."}</p><p className="muted">Fale com a plataforma para regularizar{me.effectiveStatus === "suspended" ? " ou pague a mensalidade em aberto abaixo (a liberação é automática após a confirmação do Pix)" : ""}.</p></>}
        </div>
        {me.effectiveStatus === "suspended" && !me.pendingApproval && invoicesTable}
      </>
    );
  }
  return (
    <>
      <div className="page-head"><h2>{me?.name || "Minha parceria"}</h2>{me && <Badge status={me.effectiveStatus} />}</div>
      {me && <div className="grid cards"><div className="card stat"><small>Dispositivos</small><strong>{me.deviceCount}{me.deviceLimit != null ? `/${me.deviceLimit}` : ""}</strong></div><div className="card stat"><small>Vigência até</small><strong>{fmtDate(me.endsAt)}</strong></div><div className="card stat"><small>Vencimento</small><strong>dia {me.dueDay}</strong><span>tolerância {me.graceDays} dia(s)</span></div></div>}
      {(me?.kind === "reseller" || me?.kind === "both") && <><StockPortal /><MacDevice /><Clients /></>}
      {isReseller
        ? <Providers providers={providers} codes={codes} onChanged={() => { loadProviders(); loadCodes(); }} />
        : <>
          <h3>Servidores do provedor</h3>
          <Table><thead><tr><th>Nome</th><th>URL base</th><th>Status</th></tr></thead><tbody>{providers.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.baseUrl}</td><td><Badge status={p.status} /></td></tr>)}</tbody></Table>
          <p className="muted">Para alterar os servidores, fale com a plataforma.</p>
        </>}
      <h3>Códigos de ativação</h3>
      {isReseller && <p className="muted">Cada código é atrelado a uma licença do seu estoque: quando um cliente ativa a TV com ele, 1 licença daquela duração é usada e o prazo começa a contar.</p>}
      <div className="actions left"><button className="btn primary" onClick={() => setNewCode(true)}>Novo código</button></div>
      <Table><thead><tr><th>Código</th><th>Servidor</th>{isReseller && <th>Licença</th>}<th>Status</th><th>Ativações</th><th /></tr></thead><tbody>{codes.map((c) => (
        <tr key={c.id}>
          <td><strong>{c.code}</strong></td>
          <td>{c.provider?.name || <span className="muted">Qualquer servidor</span>}</td>
          {isReseller && <td>{c.licenseMonths
            ? <>{monthsLabel(c.licenseMonths)} · <span style={c.stockAvailable === 0 ? { color: "var(--bad)" } : undefined}>{c.stockAvailable} em estoque</span>{c.status === "active" && c.stockAvailable === 0 && <div className="error">Sem estoque: novas ativações serão recusadas.</div>}</>
            : <span className="muted" title="Código sem licença: não consome estoque. Edite para atrelar a uma licença.">Sem licença</span>}</td>}
          <td>{c.status === "active" ? "Ativo" : "Revogado"}</td>
          <td>{c.activationCount ?? 0} / {c.maxActivations ?? "∞"}</td>
          <td className="actions">
              <RowMenu items={[
                { label: "Editar", hidden: c.status !== "active", onClick: () => setEditCode(c) },
                { label: "Revogar", hidden: c.status !== "active", danger: true, onClick: () => revoke(c) },
              ]} />
            </td>
        </tr>))}</tbody></Table>
      <h3 style={{ marginTop: 20 }}>{isReseller ? "Dispositivos ativados (bloquear, transferir, remover)" : "Meus dispositivos"}</h3>
      <div className="toolbar"><input placeholder="Pesquisar por MAC" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Table><thead><tr><th>MAC</th><th>Status</th><th>Licença vence em</th><th>Ativado em</th><th /></tr></thead><tbody>{devices.data.map((a) => {
        const lic = a.grantedLicense;
        const live = !!lic && lic.status === "active" && lic.remainingDays > 0;
        return (
        <tr key={a.id}><td className="mono">{a.mac || "—"}</td><td><Badge status={a.status} /></td>
          <td>{lic ? <>{fmtDate(lic.expiresAt)} <span className="muted">({live ? `${lic.remainingDays} dia(s)` : lic.status === "active" ? "vencida" : lic.status})</span></> : "—"}</td>
          <td>{fmtDateTime(a.activatedAt)}</td><td className="actions">
              <RowMenu items={[
                { label: "Transferir MAC", hidden: !(a.status === "active" && live), onClick: () => setTransfer(a) },
                { label: "Bloquear", hidden: a.status !== "active", onClick: () => change(a, "block", { title: "Bloquear dispositivo", message: a.mac, reason: "required", danger: true }) },
                { label: "Desbloquear", hidden: a.status !== "blocked", onClick: () => change(a, "unblock", { title: "Desbloquear", message: a.mac }) },
                { label: "Remover", hidden: a.status === "revoked", danger: true, disabled: live, title: live ? "Com licença em andamento, use Transferir MAC: remover perderia o tempo restante." : undefined, onClick: () => change(a, "revoke", { title: "Remover ativação", message: a.mac, danger: true }) },
              ]} />
            </td></tr>);})}</tbody></Table>
      <Empty loading={devices.loading} error={devices.error} count={devices.data.length} /><Pager meta={devices.meta} onPage={devices.setPage} />
      {invoicesTable}
      {newCode && <CodeModal checkPath="/partner/codes/check" createPath="/partner/codes" kind={me?.kind} providers={providers} onClose={() => setNewCode(false)} onCreated={() => { setNewCode(false); loadCodes(); }} />}
      {editCode && <CodeEditModal code={editCode} kind={me?.kind} providers={providers} onClose={() => setEditCode(null)} onSaved={() => { setEditCode(null); loadCodes(); }} />}
      {transfer && <TransferLicense activation={transfer} onClose={() => setTransfer(null)} onDone={() => { setTransfer(null); devices.reload(); window.dispatchEvent(new Event("stock-changed")); }} />}
    </>
  );
}
