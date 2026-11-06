import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const component = fs.readFileSync(new URL("../src/ProfilePage.jsx", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../src/Shell.jsx", import.meta.url), "utf8");
const api = fs.readFileSync(new URL("../src/api.js", import.meta.url), "utf8");

test("Minha conta está disponível no menu lateral e no menu do usuário", () => {
 assert.match(shell, /id: "conta", label: "Minha conta"/);
 assert.match(shell, /onAccount=\{\(\) => go\("conta"\)\}/);
 assert.match(shell, /page: ProfilePage/);
});
test("ações do perfil consomem somente rotas autenticadas de conta", () => {
 for (const endpoint of ["/auth/profile", "/auth/profile/email", "/auth/profile/avatar", "/auth/profile/preferences", "/auth/profile/sessions", "/auth/profile/history", "/auth/profile/activity", "/auth/change-password"])
   assert.ok(component.includes(endpoint), `Faltou ${endpoint}`);
 assert.match(api, /export const updateAuthUser/);
});
test("novas preferências alteram contador e banner, sem remover a caixa de mensagens", () => {
 assert.match(shell, /showBadge && notificationCount > 0/);
 assert.match(shell, /showUnread && notificationCount > 0/);
 assert.match(component, /comunicados administrativos continuam disponíveis/);
});
