import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import "./server-health-alert.css";

const KIND = {
  slow: { label: "Resposta lenta", className: "slow" },
  down: { label: "Indisponível", className: "down" },
  unstable: { label: "Instável", className: "unstable" },
};

/** Alerta global, visível em todas as páginas do portal da revenda.
 * Consulta só metadados resumidos já medidos pelo monitor do backend.
 */
export default function ServerHealthAlert({ onOpenMonitor }) {
  const [report, setReport] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const active = useRef(true);
  const inFlight = useRef(false);
  const lastFetch = useRef(0);
  const reload = useCallback(async (force = false) => {
    if (!active.current || document.hidden || inFlight.current) return;
    // Protege o banco de rajadas de eventos WebSocket e de foco de aba.
    if (!force && Date.now() - lastFetch.current < 8000) return;
    inFlight.current = true;
    lastFetch.current = Date.now();
    try {
      const result = await api("/partner/server-monitor/alerts");
      if (active.current) setReport(result);
    } catch (error) {
      // Não esconder o último aviso válido se ocorrer uma falha temporária de rede.
      if (active.current && error.status === 403) setReport(null);
    } finally {
      inFlight.current = false;
    }
  }, []);
  useEffect(() => {
    active.current = true;
    reload(true);
    let pending;
    const onRealtime = (event) => {
      if (event.type === "realtime-change" && !["server-health", "data"].includes(event.detail?.topic)) return;
      clearTimeout(pending);
      pending = setTimeout(() => reload(), 350);
    };
    const onVisibility = () => { if (!document.hidden) reload(); };
    // Recuperação caso um evento WS não tenha chegado. Sem requisições quando a aba está oculta.
    const interval = setInterval(() => reload(), 60000);
    window.addEventListener("realtime-change", onRealtime);
    window.addEventListener("realtime-ready", onRealtime);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active.current = false;
      clearTimeout(pending);
      clearInterval(interval);
      window.removeEventListener("realtime-change", onRealtime);
      window.removeEventListener("realtime-ready", onRealtime);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reload]);

  if (!report?.monitorEnabled || !report?.total) return null;
  const hasOutage = report.down > 0;
  return (
    <section className={`sh-alert ${hasOutage ? "sh-alert-critical" : ""}`} role="alert" aria-label="Alerta de servidores que precisam de atenção">
      <span className="sh-alert-icon" aria-hidden="true">!</span>
      <div className="sh-alert-main">
        <strong>{report.total === 1 ? "Uma URL do seu servidor precisa de atenção" : `${report.total} URLs dos seus servidores precisam de atenção`}</strong>
        <p>{report.slow > 0 && `${report.slow} com resposta lenta. `}{report.down > 0 && `${report.down} com falha de disponibilidade. `}{report.unstable > 0 && `${report.unstable} instável(is). `}Verifique o monitoramento para evitar interrupções aos clientes.</p>
        <div className="sh-alert-details">
          {report.items.slice(0, expanded ? 3 : 1).map((item) => (
            <div className="sh-alert-item" key={item.id}>
              <span className="sh-alert-host" title={item.host}><b>{item.name}</b> <small>{item.host}</small></span>
              <span className={`sh-alert-status ${KIND[item.kind]?.className || "unstable"}`}>
                {KIND[item.kind]?.label || "Instável"}{item.latencyMs != null ? ` · ${Math.round(item.latencyMs).toLocaleString("pt-BR")} ms` : ""}
              </span>
            </div>
          ))}
        </div>
        {report.items.length > 1 && <button type="button" className="sh-alert-expand" onClick={() => setExpanded(v => !v)}>{expanded ? "Mostrar menos" : `Ver mais ${Math.min(report.items.length, 3) - 1} servidor(es)`}</button>}
      </div>
      <button type="button" className="btn sh-alert-cta" onClick={onOpenMonitor}>Ver monitoramento</button>
    </section>
  );
}
