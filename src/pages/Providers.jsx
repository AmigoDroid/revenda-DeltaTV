import { useState } from "react";
import { api } from "../api.js";
import ContentSourcesWorkspace from "@deltatv/ui/ContentSourcesWorkspace";
import { Field, Modal, useAction, useUi } from "../ui.jsx";

/** Frontend único para URLs de revenda; o backend continua validando origem, permissões e roteamento. */
export default function Providers({ providers = [], codes = [], onChanged, tab = "links", onTabChange, qualityContent }) {
  const run = useAction();
  const { confirm } = useUi();
  const [form, setForm] = useState(null);
  const remove = async (p) => {
    if (!(await confirm({ title: "Excluir servidor", message: `Excluir “${p.name}”? Códigos ou dispositivos vinculados podem impedir a exclusão.`, danger: true, confirmLabel: "Excluir" }))) return;
    if (await run(() => api(`/partner/providers/${p.id}`, { method: "DELETE" }), "Servidor excluído.")) onChanged();
  };
  return <ContentSourcesWorkspace
    title="Fontes de conteúdo" description="Edite links, confira prioridades e consulte a qualidade HTTP dos seus servidores sem trocar de área."
    sources={providers} activeTab={tab} onTabChange={onTabChange} onCreate={()=>setForm({})}
    onEdit={setForm} onDelete={remove} onRefresh={onChanged}
    showSummary={false} qualityContent={qualityContent} onOpenCodes={()=>{window.location.hash='#/codigos'}}
  >
    {!!codes.length && <p className="muted" style={{fontSize:12,margin:0}}>{codes.filter(c=>c.status==='active').length} código(s) ativo(s) na sua conta. A distribuição e prioridade final são definidas pelo backend.</p>}
    {form && <ProviderForm provider={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => {setForm(null);onChanged();}} />}
  </ContentSourcesWorkspace>;
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
