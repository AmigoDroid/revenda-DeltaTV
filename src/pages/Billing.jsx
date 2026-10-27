import { usePortal } from "../portal.jsx";
import { PayInvoiceButton, PixHistory } from "./Pix.jsx";
import { Badge, Empty, Pager, Table, fmtDate, fmtMoney } from "../ui.jsx";

export default function Billing() {
  const { invoices, paid, pixTick } = usePortal();
  return (
    <>
      <section>
        <div className="section-head"><h3>Mensalidades</h3></div>
        <Table><thead><tr><th>Competência</th><th>Valor</th><th>Pago</th><th>Vencimento</th><th>Status</th><th /></tr></thead><tbody>{invoices.data.map((i) => <tr key={i.id}><td>{i.competence}</td><td>{fmtMoney(i.amountCents)}</td><td>{fmtMoney(i.paidCents)}</td><td>{fmtDate(i.dueDate)}</td><td><Badge status={i.status} /></td><td className="actions"><PayInvoiceButton invoice={i} onPaid={paid} /></td></tr>)}</tbody></Table>
        <Empty loading={invoices.loading} error={invoices.error} count={invoices.data.length} /><Pager meta={invoices.meta} onPage={invoices.setPage} />
      </section>
      <section><PixHistory refreshKey={pixTick} /></section>
    </>
  );
}

/** Cadastro em análise, suspenso, bloqueado ou vencido: só o aviso (e a mensalidade, se o motivo for atraso). */
export function Blocked() {
  const { me } = usePortal();
  if (!me) return null;
  return (
    <>
      <div className="panel notice">
        <div className="panel-head"><h3>{me.pendingApproval ? "Cadastro em análise" : "Conta indisponível"}</h3><Badge status={me.effectiveStatus} /></div>
        <div className="pad">
          {me.pendingApproval
            ? <p>Recebemos o seu cadastro. Assim que a plataforma aprovar, o seu portal será liberado. Não é preciso fazer mais nada.</p>
            : <><p>Seu acesso está {me.effectiveStatus === "expired" ? "com a vigência encerrada" : "suspenso ou bloqueado"}{me.statusReason ? `: ${me.statusReason}` : "."}</p><p className="muted">Fale com a plataforma para regularizar{me.effectiveStatus === "suspended" ? " ou pague a mensalidade em aberto abaixo (a liberação é automática após a confirmação do Pix)" : ""}.</p></>}
        </div>
      </div>
      {me.effectiveStatus === "suspended" && !me.pendingApproval && <Billing />}
    </>
  );
}
