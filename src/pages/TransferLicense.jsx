import { useState } from "react";
import { api } from "../api.js";
import { Field, Modal, formatMac, fmtDate, useAction, useUi } from "../ui.jsx";

/**
 * Passa a licença de um cliente para OUTRO MAC sem perder o tempo restante: o prazo começou a contar na venda e o
 * vencimento não muda. O MAC atual perde o acesso e o de destino recebe o mesmo servidor e as mesmas credenciais.
 * O MAC de destino precisa ter aberto o aplicativo ao menos uma vez (é de lá que o servidor o reconhece).
 */
export default function TransferLicense({ activation, onClose, onDone }) {
  const run = useAction();
  const { confirm, toast } = useUi();
  const [mac, setMac] = useState("");
  const lic = activation.grantedLicense;
  const target = formatMac(mac);

  const submit = async () => {
    const c = await confirm({
      title: "Transferir licença para outro MAC", danger: true, confirmLabel: "Transferir",
      message: `A licença de ${activation.mac} (vence em ${fmtDate(lic.expiresAt)}, restam ${lic.remainingDays} dia(s)) irá para ${target}. O vencimento NÃO muda. ${activation.mac} perde o acesso agora. Esta ação será registrada em seu nome.`,
    });
    if (!c) return;
    const r = await run(() => api("/partner/licenses/transfer", { method: "POST", body: { activationId: activation.id, toMac: target } }));
    if (r && r !== true) {
      toast(`Licença transferida para ${r.toMac}. Vence em ${fmtDate(r.expiresAt)}.`);
      onDone();
    }
  };

  return (
    <Modal title="Transferir licença para outro MAC" onClose={onClose}>
      <p className="muted">
        MAC atual: <span className="mono">{activation.mac}</span> · vence em <strong>{fmtDate(lic.expiresAt)}</strong> ({lic.remainingDays} dia(s) restantes).
        O cliente leva só o tempo que ainda resta.
      </p>
      <Field label="MAC de destino" hint="O MAC que aparece na TV nova. Ela precisa ter aberto o aplicativo uma vez.">
        <input value={mac} onChange={(e) => setMac(e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" autoComplete="off" spellCheck={false} />
      </Field>
      {mac && !target && <p className="error">MAC inválido: use 12 dígitos hexadecimais.</p>}
      <div className="actions"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={!target} onClick={submit}>Transferir</button></div>
    </Modal>
  );
}
