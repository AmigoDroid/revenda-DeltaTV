import { createApiClient, ApiError } from "../shared/api-client.js";
export { ApiError };
const API = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3000" : "")).replace(/\/+$/, "");
if (!API || !/^https?:\/\//i.test(API) || (import.meta.env.PROD && !API.startsWith("https://"))) throw new Error("VITE_API_URL deve apontar para uma API válida via HTTPS em produção.");
const client = createApiClient({ baseUrl: API, key: "iptv-reseller-auth", audience: "partner" });
export const { getAuth, api, login, logout, ensureAccessToken, acceptSession, endImpersonation } = client;
export const updateAuthUser = client.updateAuthUser;
const { raw, refresh } = client;
// Acesso por MAC + chave de 6 dígitos (/device-access). O token dessa sessão é limitado a UM dispositivo e fica só em memória
// (nunca em localStorage): fechar a aba encerra o acesso.
export async function deviceApi(path, { method = "GET", body, token, signal } = {}) {
  return raw(`/device-access${path}`, { method, body, token, signal });
}

// Cadastro público de revendedor (sem login). A resposta é a mesma para qualquer e-mail.
export const registerReseller = (body) => raw("/auth/register-reseller", { method: "POST", body });

export const completePasswordReset = (token, newPassword) => raw("/auth/password-reset/complete", { method: "POST", body: { token, newPassword } });
export const requestPasswordReset = (email) => raw("/auth/password-reset/request", { method: "POST", body: { email, audience: "reseller" } });
