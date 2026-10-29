import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Modal, fmtDateTime, useAction } from "../ui.jsx";
import DeviceLists from "./DeviceLists.jsx";

/**
 * Listas de um dispositivo (MAC) da própria revenda, sem digitar o MAC em "Buscar TV por MAC".
 * Usa o mesmo endpoint da busca (/partner/mac/lookup): o backend valida o cadastro de revendedor e a política
 * de edição a cada chamada, e registra a consulta em auditoria. Aqui é só consulta; alterar continua em "Buscar TV por MAC".
 */
export default function DeviceListsModal({ mac, onClose }) {
  const run = useAction();
  const [device, setDevice] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await run(() => api("/partner/mac/lookup", { method: "POST", body: { mac } }));
      if (alive && r && r !== true) setDevice(r);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mac]);

  return (
    <Modal title={`Listas de ${mac}`} onClose={onClose} wide>
      {!device ? <p className="muted">Carregando…</p> : (
        <>
          <p className="muted">Última atividade: {fmtDateTime(device.lastSeenAt)}{device.appVersion ? ` · App ${device.appVersion}` : ""}</p>
          <DeviceLists device={device} />
        </>
      )}
    </Modal>
  );
}
