import { useEffect, useState } from "react";
import { api } from "../api.js";
import { usePortal } from "../portal.jsx";
import MacDevice from "./MacDevice.jsx";
import TransferLicense from "./TransferLicense.jsx";
import DeviceListsModal from "./DeviceListsModal.jsx";
import { Badge, Empty, OnlineBadge, PlatformBadge, accessStatus, Pager, Table, fmtDate, fmtDateTime, useAction, useDebounced, useList, useUi } from "../ui.jsx";

const REFRESH_MS = 20000;

export default function Devices() {
  const { isReseller } = usePortal();
  const { confirm } = useUi();
  const run = useAction();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const devices = useList("/partner/devices", { q: "", online: "" });
  const [transfer, setTransfer] = useState(null); // ativação cuja licença vai para outro MAC
  const [viewMac, setViewMac] = useState(null); // MAC cujas listas estão abertas
  useEffect(() => { devices.filter({ q: dq }); /* eslint-disable-next-line */ }, [dq]);

  // Atualização automática da presença: pausa com a aba escondida ou com janela aberta.
  const busy = transfer || viewMac;
  useEffect(() => {
    if (busy) return undefined;
    const t = setInterval(() => { if (!document.hidden) devices.reload(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [busy, devices.reload]);

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
          <select value={devices.params.online} onChange={(e) => devices.filter({ online: e.target.value })} aria-label="Conexão">
            <option value="">Online e offline</option><option value="true">Só online</option><option value="false">Só offline</option>
          </select>
        </div>
        <Table><thead><tr><th>MAC</th><th>Tipo</th><th>Conexão</th><th>Status</th><th>Licença vence em</th><th>Ativado em</th><th /></tr></thead><tbody>{devices.data.map((a) => {
          const lic = a.grantedLicense;
          const live = !!lic && lic.status === "active" && lic.remainingDays > 0;
          return (
            <tr key={a.id}><td className="mono">{a.mac || "—"}</td><td><PlatformBadge platform={a.platform} /></td><td><OnlineBadge online={a.online} lastSeenAt={a.lastSeenAt} /></td><td><Badge status={accessStatus(a)} /></td>
              <td>{lic ? <>{fmtDate(lic.expiresAt)} <span className="muted">({live ? `${lic.remainingDays} dia(s)` : lic.status === "active" ? "vencida" : lic.status})</span></> : "—"}</td>
              <td>{fmtDateTime(a.activatedAt)}</td><td className="actions">
                {isReseller && a.mac && <button className="btn sm" onClick={() => setViewMac(a.mac)}>Listas</button>}{" "}
                {a.status === "active" && live && <button className="btn sm" onClick={() => setTransfer(a)}>Transferir MAC</button>}{" "}
                {a.status === "active" && <button className="btn sm" onClick={() => change(a, "block", { title: "Bloquear dispositivo", message: a.mac, reason: "required", danger: true })}>Bloquear</button>}
                {a.status === "blocked" && <button className="btn sm" onClick={() => change(a, "unblock", { title: "Desbloquear", message: a.mac })}>Desbloquear</button>}
                {a.status !== "revoked" && !live && <button className="btn sm danger" onClick={() => change(a, "revoke", { title: "Remover ativação", message: a.mac, danger: true })}>Remover</button>}
                {a.status !== "revoked" && live && <span className="muted" title="Com licença em andamento, use Transferir MAC: remover perderia o tempo restante."> licença em uso</span>}</td></tr>);
        })}</tbody></Table>
        <Empty loading={devices.loading} error={devices.error} count={devices.data.length} /><Pager meta={devices.meta} onPage={devices.setPage} />
      </section>
      {viewMac && <DeviceListsModal mac={viewMac} onClose={() => setViewMac(null)} />}
      {transfer && <TransferLicense activation={transfer} onClose={() => setTransfer(null)} onDone={() => { setTransfer(null); devices.reload(); window.dispatchEvent(new Event("stock-changed")); }} />}
    </>
  );
}
