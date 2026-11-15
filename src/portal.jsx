import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";
import { useList } from "./ui.jsx";

// Dados compartilhados entre as páginas do portal. O backend restringe tudo ao parceiro do token.
const Ctx = createContext(null);
export const usePortal = () => useContext(Ctx);

export function PortalProvider({ children }) {
  const [me, setMe] = useState(null);
  const [codes, setCodes] = useState([]);
  const [providers, setProviders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pixTick, setPixTick] = useState(0);
  const invoices = useList("/partner/invoices", {});
  const loadMe = useCallback(() => api("/partner/me").then(setMe).catch(() => {}), []);
  const loadCodes = useCallback(() => api("/partner/codes").then(r => setCodes(r.data)).catch(() => {}), []);
  const loadProviders = useCallback(() => api("/partner/providers").then(r => setProviders(r.data)).catch(() => {}), []);
  const isReseller = me?.kind === "reseller" || me?.kind === "both";
  const loadSummary = useCallback(() => api("/partner/clients/summary").then(setSummary).catch(() => {}), []);

  useEffect(() => { loadMe(); loadProviders(); loadCodes(); }, [loadMe, loadProviders, loadCodes]);
  useEffect(() => { if (isReseller) loadSummary(); }, [isReseller, loadSummary]);
  // O saldo do estoque aparece na tabela de códigos: recarrega quando o estoque muda.
  useEffect(() => { window.addEventListener("stock-changed", loadCodes); return () => window.removeEventListener("stock-changed", loadCodes); }, [loadCodes]);
  // Invalidar apenas o recurso afetado: presença de TVs / saúde do servidor não deve recarregar perfil,
  // códigos e provedores a cada sinal. Mantém reload completo só na reconexão autenticada.
  useEffect(() => {
    let timer;
    const pending = new Set();
    const flush = () => {
      if (document.hidden) { pending.clear(); return; }
      const topics = [...pending]; pending.clear();
      const all = topics.includes('all');
      if (all || topics.some(t => ['partners', 'service-plan', 'platform-settings'].includes(t))) loadMe();
      if (all || topics.some(t => ['codes', 'stock', 'network'].includes(t))) loadCodes();
      if (all || topics.some(t => ['providers', 'provider-monitor'].includes(t))) loadProviders();
      if (isReseller && (all || topics.some(t => ['clients', 'devices', 'activations', 'mac'].includes(t)))) loadSummary();
    };
    const schedule = topic => {
      pending.add(topic);
      clearTimeout(timer);
      timer = setTimeout(flush, 650);
    };
    const onChange = event => {
      if (event?.detail?.type !== 'changed') return;
      const topic = event.detail.topic;
      if (!topic) return;
      schedule(topic === 'data' ? 'all' : topic);
    };
    const onReady = () => schedule('all');
    window.addEventListener('realtime-change', onChange);
    window.addEventListener('realtime-ready', onReady);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('realtime-change', onChange);
      window.removeEventListener('realtime-ready', onReady);
    };
  }, [isReseller, loadMe, loadProviders, loadCodes, loadSummary]);

  // Pix pago: a fatura quitada pode reativar a parceria e o saldo do estoque pode ter mudado.
  const paid = () => { invoices.reload(); loadMe(); loadCodes(); setPixTick((n) => n + 1); window.dispatchEvent(new Event("stock-changed")); };

  return <Ctx.Provider value={{ me, isReseller, codes, providers, summary, invoices, pixTick, loadMe, loadCodes, loadProviders, loadSummary, paid }}>{children}</Ctx.Provider>;
}
