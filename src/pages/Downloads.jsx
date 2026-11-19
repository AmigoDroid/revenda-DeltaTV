import AppInstallGuide from "@deltatv/ui/AppInstallGuide";
import { api } from "../api.js";
import { useEffect, useState } from "react";
import { Icon } from "../icons.jsx";
import { Empty, Pager, useDebounced, useList, useUi } from "../ui.jsx";

function safeHref(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol) ? value : null;
  } catch {
    return null;
  }
}

function DownloadCard({ item }) {
  const { toast } = useUi();
  const href = safeHref(item.downloadUrl);
  const code = item.downloaderCode;
  const isLink = item.kind === "link";
  const instructions = [
    item.name,
    code && `Abra o Downloader no aparelho e digite o código ${code}.`,
    href && `${isLink ? "Acesse" : "Endereço para download"}: ${href}`,
  ].filter(Boolean).join("\n");

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(String(value));
      toast("Copiado.");
    } catch {
      toast("Abra as instruções para selecionar e copiar o texto.", "bad");
    }
  }

  return <article className="delta-download">
    <header><span className="delta-glyph"><Icon name={isLink ? "server" : "download"} size={22}/></span>
      <div><small>{isLink ? "Link" : "Aplicativo"}{item.version && ` · v${item.version}`}</small><h3>{item.name}</h3></div>
    </header>
    {code && <div className="delta-code"><div><small>Código Downloader</small><strong>{code}</strong></div>
      <button className="btn sm" onClick={() => copy(code)}>Copiar código</button></div>}
    {href && <div className="delta-actions"><a className="btn primary" href={href} target="_blank" rel="noopener noreferrer">{isLink ? "Abrir link" : "Baixar aplicativo"} <Icon name="arrow-right" size={15}/></a>
      <button className="btn" onClick={() => copy(href)}>Copiar link</button>
      {item.hosted && item.fileSize != null && <small>{new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(item.fileSize / 1048576)} MB</small>}</div>}
    {href || code ? <details><summary>Instruções para o cliente</summary><p>{instructions}</p><button className="btn sm" onClick={() => copy(instructions)}>Copiar instruções</button></details> :
      <p className="muted">Aguardando endereço ou código da plataforma.</p>}
  </article>;
}

const loadPublishedDownloads = ({ page, pageSize }) => api("/app-installation/downloads", { query: { page, pageSize } });

export default function Downloads() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const list = useList("/partner/app-downloads", { q: "", kind: "" });
  useEffect(() => { list.filter({ q: dq }); }, [dq]);
  return <>
    <AppInstallGuide loadDownloads={loadPublishedDownloads}/>
    <details className="delta-existing-downloads"><summary>Catálogo anterior: filtros e links cadastrados</summary>
    <div className="delta-filterbar">
      <input type="search" aria-label="Buscar por nome ou versão" placeholder="Buscar por nome ou versão" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Tipo de download" value={list.params.kind} onChange={e => list.filter({ kind: e.target.value })}><option value="">Todos os tipos</option><option value="app">Aplicativos</option><option value="link">Links</option></select>
    </div>
    <div className="delta-downloads">{list.data.map(item => <DownloadCard key={item.id} item={item}/>)}</div>
    <Empty loading={list.loading} error={list.error} count={list.data.length}/>
    <Pager meta={list.meta} onPage={list.setPage}/>
    </details>
  </>;
}
