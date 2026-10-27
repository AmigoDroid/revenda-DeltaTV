import { useEffect, useState } from "react";
import { api } from "../api.js";
import { BuyStock } from "./Pix.jsx";
import { Empty, Field, LoadError, Modal, Pager, Table, fmtDate, fmtDateTime, fmtMoney, useAction, useLoad, useUi } from "../ui.jsx";

export const monthsLabel = (m) => `${m} ${m === 1 ? "mês" : "meses"}`;
const changed = () => window.dispatchEvent(new Event("stock-changed"));

const KIND = { grant: "Entrada", adjust: "Ajuste", transfer_in: "Recebida de", transfer_out: "Enviada para", consume: "Aplicada em cliente" };

function Balances({ balances }) {
  if (!balances.length) return <p className="muted">Estoque vazio.</p>;
  return (
    <div className="grid cards">
      {balances.map((b) => <div className="card stat" key={b.months}><small>{monthsLabel(b.months)}</small><strong>{b.quantity}</strong><span>licença(s)</span></div>)}
    </div>
  );
}

function Ledger({ ledger, onPage, admin }) {
  return (
    <>
      <Table>
        <thead><tr><th>Quando</th><th>Movimento</th><th>Duração</th><th>Qtd.</th><th>Saldo</th><th>Detalhe</th>{admin && <th>Quem</th>}</tr></thead>
        <tbody>{ledger.data.map((r) => (
          <tr key={r.id}>
            <td>{fmtDateTime(r.at)}</td>
            <td>{KIND[r.kind] || r.kind}{r.counterparty ? ` ${r.counterparty.name}` : ""}</td>
            <td>{monthsLabel(r.months)}</td>
            <td style={{ color: r.delta > 0 ? "var(--ok)" : undefined }}>{r.delta > 0 ? `+${r.delta}` : r.delta}</td>
            <td>{r.balanceAfter}</td>
            <td>{[r.unitPriceCents != null ? `${fmtMoney(r.unitPriceCents)} cada` : null, r.note].filter(Boolean).join(" · ") || "—"}</td>
            {admin && <td>{r.actorName || "—"}</td>}
          </tr>))}</tbody>
      </Table>
      <Empty loading={false} error="" count={ledger.data.length} />
      <Pager meta={ledger.meta} onPage={onPage} />
    </>
  );
}

/* ================= Portal do revendedor ================= */

function useStock(page) {
  const s = useLoad(() => api("/partner/stock", { query: { page, pageSize: 10 } }), [page]);
  useEffect(() => { window.addEventListener("stock-changed", s.reload); return () => window.removeEventListener("stock-changed", s.reload); }, [s.reload]);
  return s;
}

export function StockPortal() {
  const [page, setPage] = useState(1);
  const [transfer, setTransfer] = useState(false);
  const { data, error, reload } = useStock(page);
  if (!data) return error ? <LoadError error={error} onRetry={reload} /> : <p className="muted">Carregando…</p>;
  return (
    <section>
      <h3>Meu estoque de licenças</h3>
      <p className="muted">Aplique uma licença ao MAC de um cliente (na busca por MAC abaixo) ou transfira para outro revendedor pelo e-mail dele.</p>
      <Balances balances={data.balances} />
      <div className="actions left" style={{ marginTop: 12 }}>
        <button className="btn" disabled={!data.balances.length} onClick={() => setTransfer(true)}>Transferir para outro revendedor</button>
      </div>
      <BuyStock onPaid={changed} />
      <h4>Extrato</h4>
      <Ledger ledger={data.ledger} onPage={setPage} />
      {transfer && <TransferModal balances={data.balances} onClose={() => setTransfer(false)} onDone={() => { setTransfer(false); changed(); }} />}
    </section>
  );
}

function TransferModal({ balances, onClose, onDone }) {
  const run = useAction();
  const { confirm } = useUi();
  const [email, setEmail] = useState("");
  const [recipient, setRecipient] = useState(null); // { email, name } já verificado
  const [months, setMonths] = useState(String(balances[0].months));
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const available = balances.find((b) => b.months === Number(months))?.quantity ?? 0;
  const verified = recipient && recipient.email === email.trim().toLowerCase();

  const verify = async () => {
    const e = email.trim().toLowerCase();
    const r = await run(() => api("/partner/stock/recipient", { method: "POST", body: { email: e } }));
    setRecipient(r && r !== true ? { email: e, name: r.name } : null);
  };
  const submit = async () => {
    const q = Number(quantity);
    const c = await confirm({
      title: "Transferir licenças", danger: true, confirmLabel: "Transferir",
      message: `Enviar ${q} licença(s) de ${monthsLabel(Number(months))} para ${recipient.name}? A transferência é imediata e não pode ser desfeita.`,
    });
    if (!c) return;
    const body = { email: recipient.email, months: Number(months), quantity: q, note: note.trim() || undefined };
    if (await run(() => api("/partner/stock/transfer", { method: "POST", body }), "Transferência concluída.")) onDone();
  };
  const q = Number(quantity);
  const ok = verified && Number.isInteger(q) && q >= 1 && q <= available;
  return (
    <Modal title="Transferir licenças" onClose={onClose}>
      <Field label="E-mail do outro revendedor" hint="O e-mail de acesso dele ao portal.">
        <div style={{ display: "flex", gap: 6 }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" style={{ flex: 1 }} />
          <button type="button" className="btn" disabled={!email.includes("@")} onClick={verify}>Verificar</button>
        </div>
      </Field>
      {verified && <p style={{ color: "var(--ok)" }}>Destinatário: <strong>{recipient.name}</strong></p>}
      <div className="row">
        <Field label="Duração"><select value={months} onChange={(e) => { setMonths(e.target.value); setQuantity("1"); }}>{balances.map((b) => <option key={b.months} value={b.months}>{monthsLabel(b.months)} (você tem {b.quantity})</option>)}</select></Field>
        <Field label="Quantidade" hint={`Máx. ${available}`}><input type="number" min="1" max={available} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
      </div>
      <Field label="Observação (opcional)"><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></Field>
      <div className="actions"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={!ok} onClick={submit}>Transferir</button></div>
    </Modal>
  );
}

/** Dentro do cartão do MAC: gasta 1 licença do estoque (ativa uma nova ou renova a do dispositivo). */
export function ApplyStock({ mac, onApplied }) {
  const run = useAction();
  const { confirm, toast } = useUi();
  const { data, reload } = useStock(1);
  const balances = data?.balances ?? [];
  const [months, setMonths] = useState("");
  useEffect(() => { if (balances.length && !balances.some((b) => String(b.months) === months)) setMonths(String(balances[0].months)); }, [data]); // eslint-disable-line
  if (!data) return null;
  const apply = async () => {
    const m = Number(months);
    const c = await confirm({
      title: "Aplicar licença do estoque", confirmLabel: "Aplicar",
      message: `Usar 1 licença de ${monthsLabel(m)} no MAC ${mac}. Se o dispositivo já tem licença, o prazo é somado ao vencimento atual. Esta ação será registrada em seu nome.`,
    });
    if (!c) return;
    const r = await run(() => api("/partner/stock/apply", { method: "POST", body: { mac, months: m } }));
    if (r && r !== true) {
      toast(`${r.action === "renew" ? "Licença renovada" : "Licença ativada"} até ${fmtDate(r.expiresAt)}.`);
      changed();
      reload();
      onApplied?.(r);
    }
  };
  return (
    <div style={{ marginTop: 12 }}>
      <h4 style={{ margin: "0 0 6px" }}>Licença do estoque</h4>
      {balances.length === 0 ? <p className="muted">Seu estoque está vazio. Peça mais licenças à plataforma.</p> : (
        <div className="toolbar">
          <select value={months} onChange={(e) => setMonths(e.target.value)}>{balances.map((b) => <option key={b.months} value={b.months}>{monthsLabel(b.months)} ({b.quantity} disponível)</option>)}</select>
          <button className="btn primary" disabled={!months} onClick={apply}>Aplicar a este MAC</button>
        </div>
      )}
    </div>
  );
}

