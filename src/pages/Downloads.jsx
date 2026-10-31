import { useEffect, useState } from "react";
import { Empty, Pager, Table, useDebounced, useList, useUi } from "../ui.jsx";

/**
 * Downloads e links: lista cadastrada pelo admin (somente leitura). O revendedor copia o link ou o código do Downloader
 * para passar ao cliente. Quem edita isso é só a plataforma. Tipo "app" tem versão e código; tipo "link" é só o endereço.
 */
// Só abre links http(s): o endereço vem de um cadastro e nunca deve virar "javascript:" no href.
const safeHref = (u) => { try { return ["http:", "https:"].includes(new URL(u).protocol) ? u : undefined; } catch { return undefined; } };

function Copy({ text, label }) {
  const { toast } = useUi();
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast(`${label} copiado.`); }
    catch { toast("Não foi possível copiar. Selecione e copie manualmente.", "bad"); }
  };
  return <button type="button" className="btn sm" onClick={copy} title={`Copiar ${label.toLowerCase()}`}>Copiar</button>;
}

export default function Downloads() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const list = useList("/partner/app-downloads", { q: "", kind: "" });
  useEffect(() => { list.filter({ q: dq }); /* eslint-disable-next-line */ }, [dq]);
  return (
    <>
      <div className="toolbar">
        <input placeholder="Buscar por nome ou versão" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={list.params.kind} onChange={(e) => list.filter({ kind: e.target.value })}><option value="">Todos os tipos</option><option value="app">Aplicativos</option><option value="link">Links</option></select>
      </div>
      <Table>
        <thead><tr><th>Nome</th><th>Tipo</th><th>Versão</th><th>Código Downloader</th><th>Link</th></tr></thead>
        <tbody>{list.data.map((d) => {
          const href = safeHref(d.downloadUrl);
          return (
            <tr key={d.id}>
              <td><strong>{d.name}</strong></td>
              <td><span className={`badge ${d.kind === "link" ? "muted" : "info"}`}>{d.kind === "link" ? "Link" : "Aplicativo"}</span></td>
              <td>{d.version || <span className="muted">—</span>}</td>
              <td>{d.downloaderCode
                ? <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><span className="mono"><strong>{d.downloaderCode}</strong></span><Copy text={d.downloaderCode} label="Código" /></span>
                : <span className="muted">—</span>}</td>
              <td><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                {href && <a className="btn sm primary" href={href} target="_blank" rel="noopener noreferrer">{d.kind === "link" ? "Abrir" : "Baixar"}</a>}
                <Copy text={d.downloadUrl} label="Link" />
              </span></td>
            </tr>
          );
        })}</tbody>
      </Table>
      <Empty loading={list.loading} error={list.error} count={list.data.length} />
      <Pager meta={list.meta} onPage={list.setPage} />
    </>
  );
}
