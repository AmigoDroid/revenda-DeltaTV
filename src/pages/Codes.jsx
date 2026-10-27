import { useState } from "react";
import { api } from "../api.js";
import { usePortal } from "../portal.jsx";
import CodeModal, { CodeEditModal, monthsLabel } from "./CodeModal.jsx";
import { Table, useAction, useUi } from "../ui.jsx";

export default function Codes() {
  const { me, isReseller, codes, providers, loadCodes } = usePortal();
  const { confirm } = useUi();
  const run = useAction();
  const [newCode, setNewCode] = useState(false);
  const [editCode, setEditCode] = useState(null);
  const revoke = async (c) => { if (await confirm({ title: "Revogar código", message: "Impede novas ativações com este código.", danger: true }) && await run(() => api(`/partner/codes/${c.id}/revoke`, { method: "POST" }), "Código revogado.")) loadCodes(); };
  return (
    <>
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
          <td className="actions">{c.status === "active" && <><button className="btn sm" onClick={() => setEditCode(c)}>Editar</button> <button className="btn sm danger" onClick={() => revoke(c)}>Revogar</button></>}</td>
        </tr>))}</tbody></Table>
      {codes.length === 0 && <p className="muted">Nenhum código criado ainda.</p>}
      {newCode && <CodeModal checkPath="/partner/codes/check" createPath="/partner/codes" kind={me?.kind} providers={providers} onClose={() => setNewCode(false)} onCreated={() => { setNewCode(false); loadCodes(); }} />}
      {editCode && <CodeEditModal code={editCode} kind={me?.kind} providers={providers} onClose={() => setEditCode(null)} onSaved={() => { setEditCode(null); loadCodes(); }} />}
    </>
  );
}
