import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { qrMatrix } from "../qr.js";
import { Badge, Empty, Field, Modal, Pager, Table, fmtDateTime, fmtMoney, useAction, useList } from "../ui.jsx";

/**
 * Pagamento por Pix (portal do revendedor/parceiro).
 * O valor e o que está sendo comprado são decididos pelo SERVIDOR: aqui só se escolhe "qual fatura" ou "quantas licenças de
 * quantos meses". A confirmação é automática (o banco avisa o servidor); esta tela só consulta o status.
 */
const monthsLabel = (m) => `${m} ${m === 1 ? "mês" : "meses"}`;
const chargeTitle = (c) => (c.purpose === "invoice" ? `Mensalidade ${c.invoice?.competence ?? ""}`.trim() : c.purpose === "credit" ? `${c.quantity} ${c.quantity === 1 ? "crédito" : "créditos"}` : `${c.quantity} licença(s) de ${monthsLabel(c.months)}`);
const secondsLeft = (iso) => Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** QR Code desenhado no navegador a partir do "copia e cola": não depende de imagem vinda do provedor. */
function QrSvg({ text, size = 220 }) {
  const m = useMemo(() => { try { return qrMatrix(text); } catch { return null; } }, [text]);
  if (!m) return null;
  const n = m.length;
  const path = m.map((row, y) => row.map((on, x) => (on ? `M${x + 4} ${y + 4}h1v1h-1z` : "")).join("")).join("");
  return (
    <svg role="img" aria-label="QR Code do Pix" width={size} height={size} viewBox={`0 0 ${n + 8} ${n + 8}`} shapeRendering="crispEdges" style={{ background: "#fff", borderRadius: 8 }}>
      <path d={path} fill="#000" />
    </svg>
  );
}

export const ChargeBadge = ({ status }) => (status === "pending" ? <Badge status="info" label="Aguardando pagamento" /> : <Badge status={status} />);

// Uma única consulta compartilhada (a tela tem vários botões "Pagar com Pix"); renova a cada minuto.
let configCache = null;
const loadConfig = () => {
  if (!configCache || Date.now() - configCache.at > 60_000) {
    const promise = api("/partner/pix/config").catch(() => ({ enabled: false, canBuyStock: false, prices: [] }));
    configCache = { at: Date.now(), promise };
  }
  return configCache.promise;
};

/** Configuração do Pix para este parceiro (ligado? o que ele pode comprar e por quanto). Falha = Pix escondido, nunca erro na tela. */
export function usePixConfig() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    let alive = true;
    loadConfig().then((c) => alive && setConfig(c));
    return () => { alive = false; };
  }, []);
  return config;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Janela do QR Code: mostra, acompanha o pagamento (consulta a cada 4 s) e avisa quando confirmar. */
export function PixModal({ charge: initial, onClose, onPaid }) {
  const [charge, setCharge] = useState(initial);
  const [left, setLeft] = useState(() => secondsLeft(initial.expiresAt));
  const [copied, setCopied] = useState(false);
  const notified = useRef(false);
  const run = useAction();

  useEffect(() => {
    if (charge.status !== "pending") return undefined;
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try { const c = await api(`/partner/pix/charges/${charge.id}`); if (!stop) setCharge(c); } catch { /* rede instável: tenta de novo no próximo ciclo */ }
    };
    const t = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [charge.id, charge.status]);

  useEffect(() => {
    const t = setInterval(() => setLeft(secondsLeft(charge.expiresAt)), 1000);
    return () => clearInterval(t);
  }, [charge.expiresAt]);

  useEffect(() => {
    if (charge.status === "paid" && !notified.current) { notified.current = true; onPaid?.(charge); }
  }, [charge, onPaid]);

  const copy = async () => {
    const ok = await copyText(charge.qrCode);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2500); }
    else run(() => Promise.reject(new Error("Não foi possível copiar automaticamente. Selecione o código e copie.")));
  };

  const pending = charge.status === "pending" && left > 0;
  return (
    <Modal title={`Pagar com Pix · ${chargeTitle(charge)}`} onClose={onClose}>
      <p style={{ textAlign: "center", margin: "0 0 4px" }} className="muted">Valor</p>
      <p style={{ textAlign: "center", fontSize: 30, fontWeight: 700, margin: "0 0 12px" }}>{fmtMoney(charge.amountCents)}</p>

      {pending && (
        <>
          {charge.qrCode && <div style={{ textAlign: "center", marginBottom: 12 }}><QrSvg text={charge.qrCode} /></div>}
          <Field label="Pix copia e cola" hint="No app do seu banco: Pix → Pagar → Pix Copia e Cola (ou leia o QR Code).">
            <textarea readOnly rows={3} value={charge.qrCode || ""} className="mono" style={{ fontSize: 12 }} onFocus={(e) => e.target.select()} />
          </Field>
          <div className="actions left" style={{ marginTop: 0 }}>
            <button className="btn primary" onClick={copy}>{copied ? "Copiado!" : "Copiar código Pix"}</button>
          </div>
          <p role="status" aria-live="polite" className="muted" style={{ marginTop: 14 }}>
            <span className="dot" /> Aguardando o pagamento… expira em <strong>{clock(left)}</strong>. A confirmação é automática: não precisa enviar comprovante.
          </p>
        </>
      )}

      {charge.status === "paid" && (
        <div role="status" aria-live="polite" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--ok)", fontSize: 18, fontWeight: 700, margin: "8px 0" }}>Pagamento confirmado!</p>
          <p className="muted">{charge.purpose === "invoice" ? `A ${chargeTitle(charge).toLowerCase()} foi quitada.` : charge.purpose === "credit" ? "Os créditos já estão no seu saldo." : `${chargeTitle(charge)} já estão no seu estoque.`}</p>
        </div>
      )}

      {(charge.status === "expired" || charge.status === "cancelled" || (charge.status === "pending" && left === 0)) && (
        <p role="status" className="error" style={{ textAlign: "center" }}>Este Pix expirou. Feche esta janela e gere um novo — se você já pagou, aguarde alguns instantes: a confirmação ainda pode chegar.</p>
      )}

      {charge.status === "review" && (
        <p role="status" style={{ textAlign: "center" }}>Recebemos o seu pagamento, mas ele precisa de uma conferência da plataforma antes de ser liberado. Fale com a plataforma informando o código <strong className="mono">{charge.id.slice(0, 8)}</strong>.</p>
      )}
      {charge.status === "refunded" && <p role="status" className="muted" style={{ textAlign: "center" }}>Este pagamento foi devolvido.</p>}

      <div className="actions">
        <button className={`btn ${charge.status === "paid" ? "primary" : ""}`} onClick={onClose}>{charge.status === "paid" ? "Concluir" : "Fechar"}</button>
      </div>
    </Modal>
  );
}

/** Cartão "Comprar licenças por Pix" (revendedor). Some se o Pix estiver desligado ou não houver preços. */
export function BuyStock({ onPaid }) {
  const config = usePixConfig();
  const run = useAction();
  const [months, setMonths] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [charge, setCharge] = useState(null);
  const [busy, setBusy] = useState(false);
  const prices = config?.prices ?? [];
  useEffect(() => { if (prices.length && !prices.some((p) => String(p.months) === months)) setMonths(String(prices[0].months)); }, [prices]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!config?.enabled || !config.canBuyStock || !prices.length) return null;

  const unit = prices.find((p) => String(p.months) === months)?.priceCents ?? 0;
  const q = Number(quantity);
  const valid = Number.isInteger(q) && q >= 1 && q <= config.maxQuantity && unit > 0;
  const submit = async () => {
    setBusy(true);
    const r = await run(() => api("/partner/pix/stock", { method: "POST", body: { months: Number(months), quantity: q } }));
    setBusy(false);
    if (r && r !== true) setCharge(r);
  };
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h4 style={{ margin: "0 0 4px" }}>Comprar licenças por Pix</h4>
      <p className="muted" style={{ marginTop: 0 }}>Pague por Pix e as licenças entram no seu estoque na hora, sem esperar aprovação.</p>
      <div className="row">
        <Field label="Duração">
          <select value={months} onChange={(e) => setMonths(e.target.value)}>
            {prices.map((p) => <option key={p.months} value={p.months}>{monthsLabel(p.months)} — {fmtMoney(p.priceCents)} cada</option>)}
          </select>
        </Field>
        <Field label="Quantidade" hint={`De 1 a ${config.maxQuantity}`}>
          <input type="number" min="1" max={config.maxQuantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
      </div>
      <div className="actions left" style={{ alignItems: "center" }}>
        <button className="btn primary" disabled={!valid || busy} onClick={submit}>{busy ? "Gerando…" : "Gerar Pix"}</button>
        <span>Total: <strong>{valid ? fmtMoney(unit * q) : "—"}</strong></span>
      </div>
      {charge && <PixModal charge={charge} onClose={() => setCharge(null)} onPaid={onPaid} />}
    </div>
  );
}

/** Botão "Pagar com Pix" de uma mensalidade em aberto. */
export function PayInvoiceButton({ invoice, onPaid }) {
  const config = usePixConfig();
  const run = useAction();
  const [charge, setCharge] = useState(null);
  const [busy, setBusy] = useState(false);
  const paidRef = useRef(false);
  if (!config?.enabled || !["open", "partial", "overdue"].includes(invoice.status)) return null;
  const open = async () => {
    setBusy(true);
    const r = await run(() => api(`/partner/pix/invoices/${invoice.id}`, { method: "POST" }));
    setBusy(false);
    if (r && r !== true) setCharge(r);
  };
  // A fatura quitada some deste botão (e leva o modal junto): só atualiza a tela depois que o modal for fechado.
  const close = () => {
    setCharge(null);
    if (paidRef.current) { paidRef.current = false; onPaid?.(); }
  };
  return (
    <>
      <button className="btn sm primary" disabled={busy} onClick={open}>{busy ? "Gerando…" : "Pagar com Pix"}</button>
      {charge && <PixModal charge={charge} onClose={close} onPaid={() => { paidRef.current = true; }} />}
    </>
  );
}

/** Histórico dos Pix do parceiro; os que aguardam pagamento podem ser reabertos. */
export function PixHistory({ refreshKey }) {
  const config = usePixConfig();
  const list = useList("/partner/pix/charges", {});
  const run = useAction();
  const [open, setOpen] = useState(null);
  const reload = list.reload;
  useEffect(() => { reload(); }, [refreshKey, reload]);
  const show = useCallback(async (c) => {
    const r = await run(() => api(`/partner/pix/charges/${c.id}`));
    if (r && r !== true) setOpen(r);
  }, [run]);
  if (!config?.enabled && !list.data.length) return null;
  return (
    <>
      <h3 style={{ marginTop: 20 }}>Pagamentos por Pix</h3>
      <Table>
        <thead><tr><th>Data</th><th>Referente a</th><th>Valor</th><th>Status</th><th /></tr></thead>
        <tbody>{list.data.map((c) => (
          <tr key={c.id}>
            <td>{fmtDateTime(c.createdAt)}</td><td>{chargeTitle(c)}</td><td>{fmtMoney(c.amountCents)}</td><td><ChargeBadge status={c.status} /></td>
            <td className="actions">{c.status === "pending" && new Date(c.expiresAt) > new Date() && <button className="btn sm" onClick={() => show(c)}>Ver QR Code</button>}</td>
          </tr>))}</tbody>
      </Table>
      <Empty loading={list.loading} error={list.error} count={list.data.length} />
      <Pager meta={list.meta} onPage={list.setPage} />
      {open && <PixModal charge={open} onClose={() => { setOpen(null); reload(); }} onPaid={reload} />}
    </>
  );
}
