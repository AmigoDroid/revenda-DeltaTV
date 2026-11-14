import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from './read-source.js';
const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('login da revenda mostra o botão e abre o formulário de recuperação', () => {
  const app = source('src/App.jsx');
  assert.match(app, /Esqueci minha senha/);
  assert.match(app, /onForgotPassword\(email\)/);
  assert.match(app, /<ForgotPassword\s+initialEmail=\{forgotEmail\}/);
  assert.match(app, /onBack=\{\(\) => show\("login"\)\}/);
});

test('solicitação de e-mail identifica a audiência da revenda', () => {
  const api = source('src/api.js');
  assert.match(api, /requestPasswordReset = \(email\) => raw\("\/auth\/password-reset\/request", \{ method: "POST", body: \{ email, audience: "reseller" \} \}\)/);
  const form = source('src/PasswordReset.jsx');
  assert.match(form, /requestReset=\{requestPasswordReset\}/);
  assert.match(form, /accountType="revendedor"/);
});

test('link de e-mail abre formulário que envia token somente no corpo POST', () => {
  const index = source('index.html');
  const reset = source('src/PasswordReset.jsx');
  assert.match(index, /isReset.*redefinir-senha/);
  assert.match(index, /__DELTA_PASSWORD_RESET_TOKEN__/);
  assert.match(reset, /completeReset=\{completePasswordReset\}/);
  assert.match(source('src/api.js'), /completePasswordReset = \(token, newPassword\) => raw\("\/auth\/password-reset\/complete"/);
});
