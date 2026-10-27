import { useState } from "react";
import { api } from "../api.js";
import { Badge, Field, Modal, Table, useAction, useUi } from "../ui.jsx";

/**
 * Servidores IPTV do próprio revendedor. Ele cadastra o servidor e cria os códigos que apontam para ele.
 * O backend decide tudo: a URL passa pela proteção contra endereços internos, o modo de entrega fica em redirecionamento
 * (o modo proxy gasta banda da plataforma e é decisão do admin) e há um teto de servidores por conta.
 */
export default function Providers({ providers, codes, onChanged }) {
  const run = useAction();
  const { confirm } = useUi();
  const [form, setForm] = useState(null); // null | {} (novo) | provider (editar)

  const remove = async (p) => {
    if (!(await confirm({ title: "Excluir servidor", message: `Excluir “${p.name}”? Só é possível se nenhum dispositivo nem código ativo usar este servidor.`, danger: true, confirmLabel: "Excluir" }))) return;
    if (await run(() => api(`/partner/providers/${p.id}`, { method: "DELETE" }), "Servidor excluído.")) onChanged();
  };

  return (
    <section>
      <p className="muted">Cadastre o painel do seu provedor. Depois crie um código de ativação apontando para ele.</p>
      <div className="actions left"><button className="btn primary" onClick={() => setForm({})}>Novo servidor</button></div>
      <Table>
        <thead><tr><th>Nome</th><th>URL base</th><th>Códigos</th><th>Prioridade</th><th>Status</th><th /></tr></thead>
        <tbody>{providers.map((p) => (
          <tr key={p.id}>
            <td>{p.name}</td><td>{p.baseUrl}</td>
            <td>{codes.filter((c) => c.providerId === p.id && c.status === "active").map((c) => c.code).join(", ") || "—"}</td>
            <td>{p.priority}</td><td><Badge status={p.status} /></td>
            <td className="actions"><button className="btn sm" onClick={() => setForm(p)}>Editar</button><button className="btn sm danger" onClick={() => remove(p)}>Excluir</button></td>
          </tr>))}</tbody>
      </Table>
      {providers.length === 0 && <p className="muted">Nenhum servidor cadastrado.</p>}
      {form && <ProviderForm provider={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); onChanged(); }} />}
    </section>
  );
}

function ProviderForm({ provider, onClose, onSaved }) {
  const run = useAction();
  const edit = !!provider;
  const [f, setF] = useState({ name: provider?.name || "", baseUrl: provider?.baseUrl || "", priority: provider?.priority ?? 0, status: provider?.status || "active" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    const body = { ...f, priority: Number(f.priority) || 0 };
    const r = await run(() => api(edit ? `/partner/providers/${provider.id}` : "/partner/providers", { method: edit ? "PATCH" : "POST", body }), "Servidor salvo.");
    if (r) onSaved();
  };
  return (
    <Modal title={edit ? "Editar servidor" : "Novo servidor IPTV"} onClose={onClose}>
      <Field label="Nome"><input value={f.name} onChange={set("name")} placeholder="Servidor principal" /></Field>
      <Field label="URL base" hint="Apenas o endereço do painel, ex.: http://meuservidor.net:8080 (endereços internos são bloqueados)"><input value={f.baseUrl} onChange={set("baseUrl")} placeholder="http://meuservidor.net" autoComplete="off" spellCheck={false} /></Field>
      <div className="row">
        <Field label="Prioridade" hint="Menor = tentado primeiro (só vale para códigos sem servidor definido)"><input type="number" min="0" value={f.priority} onChange={set("priority")} /></Field>
        <Field label="Status"><select value={f.status} onChange={set("status")}><option value="active">Ativo</option><option value="disabled">Desativado</option></select></Field>
      </div>
      <div className="actions"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={!f.name.trim() || !f.baseUrl.trim()} onClick={submit}>Salvar</button></div>
    </Modal>
  );
}
