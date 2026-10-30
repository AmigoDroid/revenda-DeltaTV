import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

/**
 * Crédito pré-pago do revendedor. Só serve para COMPRAR licenças (que caem no estoque) — não há transferência,
 * venda de volta nem saque. Câmbio e preços são do admin; o servidor calcula tudo, aqui só se escolhe duração/quantidade.
 */
export const creditsLabel = (n) => `${n} ${n === 1 ? "crédito" : "créditos"}`;
export const creditChanged = () => window.dispatchEvent(new Event("credit-changed"));

/** Saldo, câmbio e preços em crédito. Falha = null (o crédito some dos pontos de uso; nunca vira erro na tela). */
export function useCredit() {
  const [credit, setCredit] = useState(null);
  const reload = useCallback(() => api("/partner/credits").then(setCredit).catch(() => setCredit(null)), []);
  useEffect(() => {
    reload();
    window.addEventListener("credit-changed", reload);
    return () => window.removeEventListener("credit-changed", reload);
  }, [reload]);
  return { credit, reload };
}

/** Compra licenças com crédito: o débito e a entrada no estoque acontecem juntos no servidor. */
export const buyWithCredit = (months, quantity) => api("/partner/credits/buy", { method: "POST", body: { months, quantity } });
