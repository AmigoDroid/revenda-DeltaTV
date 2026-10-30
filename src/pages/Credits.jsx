import { useEffect, useState } from "react";
import { api } from "../api.js";
import { PixModal } from "./Pix.jsx";
import { buyWithCredit, creditChanged, creditsLabel } from "../credit.js";
import { Empty, Field, LoadError, Pager, Table, fmtDateTime, fmtMoney, useAction, useList, useLoad, useUi } from "../ui.jsx";

const monthsLabel = (m) => `${m} ${m === 1 ? "mês" : "meses"}`;
const KIND = { topup: "Recarga por Pix", purchase: "Compra de licença", adjust: "Ajuste da plataforma" };

function Recharge({ credit, onPaid }) {
  const run = useAction();
  const [credits, setCredits] = useState("10");
  const [charge, setCharge] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!credit.canRecharge) {
    return (
      <div className="card" style={{ marginTop: 12 }}>
        <h4 style={{ margin: "0 0 4px" }}>Recarregar por Pix</h4>
        <p className="muted" style={{ margin: 0 }}>A recarga por Pix não está disponível no momento. Fale com a plataforma para receber créditos.</p>
      </div>
    );
  }
  const n = Number(credits);
  const valid = Number.isInteger(n) && n >= 1 && n <= credit.maxRecharge;
  const submit = async () => {
    setBusy(true);
    const r = await run(() => api("/partner/pix/credits", { method: "POST", body: { credits: n } }));
    setBusy(false);
    if (r && r !== true) setCharge(r);
  };
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h4 style={{ margin: "0 0 4px" }}>Recarregar por Pix</h4>
      <p className="muted" style={{ marginTop: 0 }}>Hoje 1 crédito custa <strong>{fmtMoney(credit.rateCents)}</strong>. Pague por Pix e o saldo é liberado na hora.</p>
      <Field label="Quantos créditos" hint={`De 1 a ${credit.maxRecharge}`}>
        <input type="number" min="1" max={credit.maxRecharge} value={credits} onChange={(e) => setCredits(e.target.value)} />
      </Field>
      <div className="actions left" style={{ alignItems: "center" }}>
        <button className="btn primary" disabled={!valid || busy} onClick={submit}>{busy ? "Gerando…" : "Gerar Pix"}</button>
        <span>Total: <strong>{valid ? fmtMoney(n * credit.rateCents) : "—"}</strong></span>
      </div>
      {charge && <PixModal charge={charge} onClose={() => setCharge(null)} onPaid={onPaid} />}
    </div>
  );
}

function BuyLicenses({ credit }) {
  const run = useAction();
  const { confirm } = useUi();
  const prices = credit.prices;
  const [months, setMonths] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const m = prices.some((p) => String(p.months) === months) ? months : String(prices[0]?.months ?? "");
  if (!prices.length) {
    return (
      <div className="card" style={{ marginTop: 12 }}>
        <h4 style={{ margin: "0 0 4px" }}>Comprar licenças com crédito</h4>
        <p className="muted" style={{ margin: 0 }}>Nenhuma licença está à venda por crédito no momento. Fale com a plataforma.</p>
      </div>
    );
  }
  const unit = prices.find((p) => String(p.months) === m)?.priceCredits ?? 0;
  const q = Number(quantity);
  const valid = Number.isInteger(q) && q >= 1 && q <= credit.maxBuyQuantity;
  const total = valid ? unit * q : 0;
  const enough = total <= credit.balance;
  const submit = async () => {
    const ok = await confirm({
      title: "Comprar licenças com crédito", confirmLabel: "Comprar",
      message: `Gastar ${creditsLabel(total)} para comprar ${q} licença(s) de ${monthsLabel(Number(m))}? Elas entram no seu estoque na hora.`,
    });
    if (!ok) return;
    setBusy(true);
    const r = await run(() => buyWithCredit(Number(m), q), `${q} licença(s) de ${monthsLabel(Number(m))} adicionada(s) ao estoque.`);
    setBusy(false);
    if (r) { creditChanged(); window.dispatchEvent(new Event("stock-changed")); }
  };
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h4 style={{ margin: "0 0 4px" }}>Comprar licenças com crédito</h4>
      <p className="muted" style={{ marginTop: 0 }}>As licenças entram no seu estoque. Depois é só aplicar a um MAC ou renovar uma licença.</p>
      <div className="row">
        <Field label="Duração">
          <select value={m} onChange={(e) => setMonths(e.target.value)}>
            {prices.map((p) => <option key={p.months} value={p.months}>{monthsLabel(p.months)} — {creditsLabel(p.priceCredits)} cada</option>)}
          </select>
        </Field>
        <Field label="Quantidade" hint={`De 1 a ${credit.maxBuyQuantity}`}>
          <input type="number" min="1" max={credit.maxBuyQuantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
      </div>
      <div className="actions left" style={{ alignItems: "center" }}>
        <button className="btn primary" disabled={!valid || !enough || busy} onClick={submit}>{busy ? "Comprando…" : "Comprar"}</button>
        <span>Total: <strong>{valid ? creditsLabel(total) : "—"}</strong></span>
        {valid && !enough && <span className="error">Saldo insuficiente.</span>}
      </div>
    </div>
  );
}

function Ledger() {
  const list = useList("/partner/credits/ledger", {});
  const { reload } = list;
  useEffect(() => { window.addEventListener("credit-changed", reload); return () => window.removeEventListener("credit-changed", reload); }, [reload]);
  return (
    <>
      <div className="section-head"><h3>Extrato</h3></div>
      <Table>
        <thead><tr><th>Quando</th><th>Movimento</th><th>Créditos</th><th>Saldo</th><th>Detalhe</th></tr></thead>
        <tbody>{list.data.map((r) => (
          <tr key={r.id}>
            <td>{fmtDateTime(r.at)}</td>
            <td>{KIND[r.kind] || r.kind}</td>
            <td style={{ color: r.delta > 0 ? "var(--ok)" : undefined }}>{r.delta > 0 ? `+${r.delta}` : r.delta}</td>
            <td>{r.balanceAfter}</td>
            <td className="wrap">{[r.kind === "purchase" ? `${r.quantity} × ${monthsLabel(r.months)} (${creditsLabel(r.unitPriceCredits)} cada)` : null, r.kind === "topup" && r.rateCents ? `1 crédito = ${fmtMoney(r.rateCents)}` : null, r.kind === "adjust" ? r.note : null].filter(Boolean).join(" · ") || "—"}</td>
          </tr>))}</tbody>
      </Table>
      <Empty loading={list.loading} error={list.error} count={list.data.length} />
      <Pager meta={list.meta} onPage={list.setPage} />
    </>
  );
}

export default function Credits() {
  const o = useLoad(() => api("/partner/credits"), []);
  const { reload } = o;
  useEffect(() => { window.addEventListener("credit-changed", reload); return () => window.removeEventListener("credit-changed", reload); }, [reload]);
  if (!o.data) return o.error ? <LoadError error={o.error} onRetry={o.reload} /> : <p className="muted">Carregando…</p>;
  const credit = o.data;
  return (
    <section>
      <div className="grid cards">
        <div className="card stat"><small>Seu saldo</small><strong>{credit.balance}</strong><span>{credit.balance === 1 ? "crédito" : "créditos"}</span></div>
        {credit.rateCents && <div className="card stat"><small>Valor do crédito</small><strong>{fmtMoney(credit.rateCents)}</strong><span>por crédito, na recarga</span></div>}
      </div>
      <p className="muted" style={{ marginBottom: 0 }}>Crédito é um saldo pré-pago usado só para comprar licenças. Ele não pode ser transferido, devolvido nem sacado.</p>
      <Recharge credit={credit} onPaid={creditChanged} />
      <BuyLicenses credit={credit} />
      <Ledger />
    </section>
  );
}
