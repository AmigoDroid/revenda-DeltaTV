import { useEffect, useState } from "react";
import { api } from "../api.js";
export default function Notifications() {
  const [reading, setReading] = useState(null);
  const [items, setItems] = useState([]), [unread, setUnread] = useState(0), [page, setPage] = useState(1), [pages, setPages] = useState(1), [error, setError] = useState("");
  const reload = () => api("/partner/notifications", { query: { page } }).then(v => { setItems(v.data); setUnread(v.unread); setPages(v.meta.pages); setError(""); }).catch(e => setError(e.message));
  useEffect(() => { reload(); const h = e => { if (e.type === "realtime-ready" || e.detail?.type === "notification") reload(); }; window.addEventListener("realtime-change", h); window.addEventListener("realtime-ready", h); return () => { window.removeEventListener("realtime-change", h); window.removeEventListener("realtime-ready", h); }; }, [page]);
  async function read(n) { setReading(n.id); try { await api(`/partner/notifications/${n.id}/read`, { method: "PATCH" }); reload(); window.dispatchEvent(new Event("notification-updated")); } catch(e) { setError(e.message); } finally { setReading(null); } }
  async function readAll() { try { await api("/partner/notifications/read-all", { method: "POST" }); reload(); window.dispatchEvent(new Event("notification-updated")); } catch(e) { setError(e.message); } }
  return <section><div className="toolbar"><strong aria-live="polite">{unread ? `🔔 ${unread} mensagem(ns) aguardando leitura` : "✓ Todas as mensagens lidas"}</strong><button className="btn" disabled={!unread} onClick={readAll}>Marcar todas como lidas</button></div>{error && <p role="alert">{error}</p>}
  <div style={{ display: "grid", gap: 12 }}>{items.map(n => <article className="card" style={{ padding: 18, borderLeft: `4px solid ${n.severity === "warning" ? "#e59c3a" : n.severity === "important" ? "#4f8eff" : "#689888"}` }} key={n.id}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><strong>{n.title}</strong><small>{new Date(n.createdAt).toLocaleString("pt-BR")}</small></div>
    <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{n.message}</p>
    {n.readAt ? <small>Lida</small> : <button className="btn primary" style={{fontWeight:800,padding:"12px 20px",minHeight:44}} disabled={reading===n.id} onClick={() => read(n)}>{reading===n.id ? "Salvando…" : "✓ Marcar como lida"}</button>}
  </article>)}{!items.length && <p>Nenhuma notificação recebida.</p>}</div>
  <div className="toolbar"><button className="btn" disabled={page <= 1} onClick={() => setPage(p => p-1)}>Anterior</button><span>Página {page} de {Math.max(1,pages)}</span><button className="btn" disabled={page >= pages} onClick={() => setPage(p => p+1)}>Próxima</button></div></section>;
}
