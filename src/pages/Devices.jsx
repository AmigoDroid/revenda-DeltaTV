import { useDeviceBulkActions } from "../../shared/useDeviceBulkActions.jsx";
import { useBulkRemoval } from "../../shared/useBulkRemoval.jsx";
import { Modal } from "../ui.jsx";
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { usePortal } from "../portal.jsx";
import MacDevice from "./MacDevice.jsx";
import TransferLicense from "./TransferLicense.jsx";
import DeviceListsModal from "./DeviceListsModal.jsx";
import { NewWebAccess } from "./WebAccess.jsx";
import { Badge, Empty, OnlineBadge, PlatformBadge, accessStatus, Pager, Table, fmtDate, fmtDateTime, useAction, RowMenu, useDebounced, useList, useUi } from "../ui.jsx";

const REFRESH_MS = 60000; // fallback quando o WebSocket não informa mudanças; evita refazer a lista a cada 20 s

export default function Devices({ go }) {
  const { isReseller } = usePortal();
  const [webFor, setWebFor] = useState(null); // dispositivo para o qual se gera um acesso do Player Web
  const { confirm } = useUi();
  const run = useAction();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const devices = useList("/partner/devices", { q: "", online: "", status: "", showRemoved: "false" });
  const [hiddenIds,setHiddenIds] = useState([]);
  const [transfer, setTransfer] = useState(null); // ativação cuja licença vai para outro MAC
  const [viewMac, setViewMac] = useState(null); // MAC cujas listas estão abertas
  useEffect(() => { devices.filter({ q: dq }); /* eslint-disable-next-line */ }, [dq]);

  // Atualização automática da presença: pausa com a aba escondida ou com janela aberta.
  const busy = transfer || viewMac;
  useEffect(() => {
    if (busy) return undefined;
    const t = setInterval(() => { if (!document.hidden && !devices.loading) devices.reload({ passive: true }); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [busy, devices.reload, devices.loading]);

  const bulk = useDeviceBulkActions({
    Modal, rows: devices.data, scope: JSON.stringify(devices.params), loading: devices.loading,
    request: (action, body) => api(`/partner/devices/bulk-${action}`, { method: "POST", body }),
    onOptimistic: ids => setHiddenIds(old => [...old, ...ids]),
    refresh: devices.reload,
  });
  const exclude = async a => {
    const confirmMac = window.prompt(`EXCLUIR definitivamente o vínculo de ${a.mac}? Digite exatamente o MAC:`);
    if (confirmMac !== a.mac) return;
    const reason = window.prompt("Motivo da exclusão (mínimo 3 caracteres):");
    if (!reason || reason.trim().length < 3) return;
    if (await run(() => api(`/partner/devices/${a.id}`, { method: "DELETE", body: { confirmMac, reason } }), "Vínculo excluído.")) {
      setHiddenIds(old => [...old, a.id]);
      devices.reload();
    }
  };
  const change = async (a, action, o) => {
    const c = await confirm(o);
    if (!c) return false;
    const ok = await run(() => api(`/partner/devices/${a.id}/${action}`, { method: "POST", body: { reason: c.reason } }), "Atualizado.");
    if (ok) devices.reload();
    return Boolean(ok);
  };
  return (
    <>
      {isReseller && <MacDevice onActivate={mac=>{
        sessionStorage.setItem('deltatv-activation-mac', mac);
        go('ativar-tv');
      }}/>}
      <section>
        <div className="delta-filterbar">
          <h3>{isReseller ? "Ativações" : "Meus dispositivos"}</h3>
          <input maxLength={40} type="search" data-help-target="search-device" placeholder="Pesquisar por MAC" aria-label="Pesquisar por MAC" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={devices.params.online} onChange={(e) => devices.filter({ online: e.target.value })} aria-label="Conexão">
            <option value="">Online e offline</option><option value="true">Só online</option><option value="false">Só offline</option>
          </select>
          <select aria-label="Status da ativação" value={devices.params.status} onChange={e => devices.filter({ status: e.target.value })}>
            <option value="">Vínculos atuais</option><option value="active">Ativa</option><option value="blocked">Bloqueada</option><option value="revoked">Removida</option>
          </select>
          <label><input type="checkbox" checked={devices.params.showRemoved === "true"} onChange={e => { setHiddenIds([]); devices.filter({ showRemoved: String(e.target.checked) }); }}/> Mostrar removidos</label>
        </div>
        <p className="muted">Desvincular mantém o dispositivo cadastrado. Excluir apaga apenas o vínculo da sua revenda.</p>
        {bulk.toolbar}
      <div className="device-list delta-tv-list"><Table><thead><tr><th>MAC</th><th>Tipo</th><th>Conexão</th><th>Assistindo / IP</th><th>Status</th><th>Licença vence em</th><th>Ativado em</th><th /><th className="mobile-details-header">Informações</th></tr></thead><tbody>{devices.data.filter(a => !hiddenIds.includes(a.id)).map((a) => {
          const lic = a.grantedLicense;
          const live = !!lic && lic.status === "active" && lic.remainingDays > 0;
          return (
            <tr key={a.id}><td className="mono">{bulk.pick(a)}{a.mac || "—"}</td><td><PlatformBadge platform={a.platform} /></td><td><OnlineBadge online={a.online} lastSeenAt={a.lastSeenAt} /></td><td><strong>{a.live?.playback?.title || '—'}</strong><div className="muted">{a.live?.online ? `IP: ${a.live.ip || 'indisponível'}` : 'Sem telemetria'}</div></td><td><Badge status={accessStatus(a)} /></td>
              <td>{lic ? <>{fmtDate(lic.expiresAt)} <span className="muted">({live ? `${lic.remainingDays} dia(s)` : lic.status === "active" ? "vencida" : lic.status})</span></> : "—"}</td>
              <td>{fmtDateTime(a.activatedAt)}</td><td className="actions">
                <RowMenu items={[
                  { label: "Listas", hidden: !(isReseller && a.mac), onClick: () => setViewMac(a.mac) },
                  { label: "Gerar acesso Player Web", hidden: !(isReseller && a.mac && a.status === "active" && a.platform !== "web"), onClick: () => setWebFor(a) },
                  { label: "Transferir MAC", hidden: !(a.status === "active" && live), onClick: () => setTransfer(a) },
                  { label: "Bloquear", hidden: a.status !== "active", onClick: () => change(a, "block", { title: "Bloquear dispositivo", message: a.mac, reason: "required", danger: true }) },
                  { label: "Desbloquear", hidden: a.status !== "blocked", onClick: () => change(a, "unblock", { title: "Desbloquear", message: a.mac }) },
                  { label: "Desvincular", danger: true, hidden: a.status === "revoked", disabled: live, title: live ? "Com licença em andamento, use Transferir MAC: remover perderia o tempo restante." : undefined, onClick: async () => { if (await change(a, "revoke", { title: "Desvincular ativação", message: a.mac, danger: true })) setHiddenIds(old => [...old, a.id]); } },
                  { label: "Excluir vínculo", danger: true, onClick: () => exclude(a) },
                ]} />
              </td>
              <td className="mobile-device-details" data-label="Informações"><details><summary>Mais informações da TV</summary>
                <div>Tipo: <PlatformBadge platform={a.platform}/></div>
                <div>Reprodução: {a.live?.playback?.title || 'Sem telemetria atual'}</div>
                <div>IP: {a.live?.online ? a.live.ip || 'indisponível' : 'offline'}</div>
                <div>Ativada em: {fmtDateTime(a.activatedAt)}</div>
              </details></td></tr>);
        })}</tbody></Table></div>
        {devices.loading || devices.error || devices.data.length ? <Empty loading={devices.loading} error={devices.error} count={devices.data.length} /> :
          <div className="delta-empty"><strong>{dq || devices.params.status || devices.params.online ? "Nenhuma TV corresponde aos filtros" : "Nenhuma ativação cadastrada"}</strong>
            {(q || devices.params.online || devices.params.status) ? <button className="btn" onClick={() => { setQ(""); devices.filter({ q: "", online: "", status: "" }); }}>Limpar filtros</button> :
              isReseller && <button className="btn primary" onClick={() => go("ativar-tv")}>Ativar primeira TV</button>}
          </div>}<Pager meta={devices.meta} onPage={devices.setPage} />
      </section>
      {webFor && <NewWebAccess initial={{ mac: webFor.mac }} onClose={() => setWebFor(null)} />}
      {viewMac && <DeviceListsModal mac={viewMac} onClose={() => setViewMac(null)} />}
      {transfer && <TransferLicense activation={transfer} onClose={() => setTransfer(null)} onDone={() => { setTransfer(null); devices.reload(); window.dispatchEvent(new Event("stock-changed")); }} />}
    </>
  );
}
