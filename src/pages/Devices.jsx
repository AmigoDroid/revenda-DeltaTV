import { useEffect, useState } from "react";
import { api } from "../api.js";
import { usePortal } from "../portal.jsx";
import MacDevice from "./MacDevice.jsx";
import TransferLicense from "./TransferLicense.jsx";
import { Badge, Empty, accessStatus, Pager, Table, fmtDate, fmtDateTime, useAction, useDebounced, useList, useUi } from "../ui.jsx";

export default function Devices() {
  const { isReseller } = usePortal();
  const { confirm } = useUi();
  const run = useAction();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const devices = useList("/partner/devices", { q: "" });
  const [transfer, setTransfer] = useState(null); // ativação cuja licença vai para outro MAC
  useEffect(() => { devices.filter({ q: dq }); /* eslint-disable-next-line */ }, [dq]);

  const change = async (a, action, o) => {
    const c = await confirm(o);
    if (c && (await run(() => api(`/partner/devices/${a.id}/${action}`, { method: "POST", body: { reason: c.reason } }), "Atualizado."))) devices.reload();
  };
  return (
    <>
      {isReseller && <MacDevice />}
      <section>
        <div className="section-head">
          <h3>{isReseller ? "Ativações" : "Meus dispositivos"}</h3>
          <input placeholder="Pesquisar por MAC" aria-label="Pesquisar por MAC" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Table><thead><tr><th>MAC</th><th>Status</th><th>Licença vence em</th><th>Ativado em</th><th /></tr></thead><tbody>{devices.data.map((a) => {
          const lic = a.grantedLicense;
          const live = !!lic && lic.status === "active" && lic.remainingDays > 0;
          return (
            <tr key={a.id}><td className="mono">{a.mac || "—"}</td><td><Badge status={accessStatus(a)} /></td>
              <td>{lic ? <>{fmtDate(lic.expiresAt)} <span className="muted">({live ? `${lic.remainingDays} dia(s)` : lic.status === "active" ? "vencida" : lic.status})</span></> : "—"}</td>
              <td>{fmtDateTime(a.activatedAt)}</td><td className="actions">
                {a.status === "active" && live && <button className="btn sm" onClick={() => setTransfer(a)}>Transferir MAC</button>}{" "}
                {a.status === "active" && <button className="btn sm" onClick={() => change(a, "block", { title: "Bloquear dispositivo", message: a.mac, reason: "required", danger: true })}>Bloquear</button>}
                {a.status === "blocked" && <button className="btn sm" onClick={() => change(a, "unblock", { title: "Desbloquear", message: a.mac })}>Desbloquear</button>}
                {a.status !== "revoked" && !live && <button className="btn sm danger" onClick={() => change(a, "revoke", { title: "Remover ativação", message: a.mac, danger: true })}>Remover</button>}
                {a.status !== "revoked" && live && <span className="muted" title="Com licença em andamento, use Transferir MAC: remover perderia o tempo restante."> licença em uso</span>}</td></tr>);
        })}</tbody></Table>
        <Empty loading={devices.loading} error={devices.error} count={devices.data.length} /><Pager meta={devices.meta} onPage={devices.setPage} />
      </section>
      {transfer && <TransferLicense activation={transfer} onClose={() => setTransfer(null)} onDone={() => { setTransfer(null); devices.reload(); window.dispatchEvent(new Event("stock-changed")); }} />}
    </>
  );
}
