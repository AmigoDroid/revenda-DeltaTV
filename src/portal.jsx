import { createContext, useContext, useEffect, useState } from "react";
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
  const quiet = (p) => p.catch(() => {});
  const loadMe = () => quiet(api("/partner/me").then(setMe));
  const loadCodes = () => quiet(api("/partner/codes").then((r) => setCodes(r.data)));
  const loadProviders = () => quiet(api("/partner/providers").then((r) => setProviders(r.data)));
  const isReseller = me?.kind === "reseller" || me?.kind === "both";
  const loadSummary = () => quiet(api("/partner/clients/summary").then(setSummary));

  useEffect(() => { loadMe(); loadProviders(); loadCodes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (isReseller) loadSummary(); }, [isReseller]); // eslint-disable-line react-hooks/exhaustive-deps
  // O saldo do estoque aparece na tabela de códigos: recarrega quando o estoque muda.
  useEffect(() => { window.addEventListener("stock-changed", loadCodes); return () => window.removeEventListener("stock-changed", loadCodes); }, []);
  // Pix pago: a fatura quitada pode reativar a parceria e o saldo do estoque pode ter mudado.
  const paid = () => { invoices.reload(); loadMe(); loadCodes(); setPixTick((n) => n + 1); window.dispatchEvent(new Event("stock-changed")); };

  return <Ctx.Provider value={{ me, isReseller, codes, providers, summary, invoices, pixTick, loadMe, loadCodes, loadProviders, loadSummary, paid }}>{children}</Ctx.Provider>;
}
