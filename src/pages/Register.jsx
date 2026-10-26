import { useState } from "react";
import { registerReseller } from "../api.js";
import { Field, PasswordInput, useAction } from "../ui.jsx";

/** Tela pública de cadastro de revendedor. O cadastro fica aguardando aprovação da plataforma. */
export default function Register({ onBack }) {
  const run = useAction();
  const [f, setF] = useState({ name: "", contactName: "", email: "", phone: "", password: "", confirm: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const mismatch = f.confirm !== "" && f.password !== f.confirm;
  const valid = f.name.trim().length >= 2 && f.contactName.trim().length >= 2 && f.email.includes("@") && f.phone.trim().length >= 8 && f.password.length >= 12 && f.password === f.confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const { confirm, ...body } = f;
    const r = await run(() => registerReseller(body));
    setBusy(false);
    if (r) setDone(true);
  };

  if (done) {
    return (
      <div className="login card">
        <h2 style={{ marginBottom: 12 }}>Cadastro recebido</h2>
        <p>Recebemos o seu cadastro. Assim que a plataforma aprovar, você poderá usar o portal com o e-mail e a senha que acabou de criar.</p>
        <p className="muted">Você já pode entrar para acompanhar a análise.</p>
        <button className="btn primary" style={{ width: "100%", marginTop: 12 }} onClick={onBack}>Ir para o login</button>
      </div>
    );
  }
  return (
    <div className="login card">
      <h2 style={{ marginBottom: 16 }}>Cadastro de revendedor</h2>
      <form onSubmit={submit}>
        <Field label="Nome da empresa ou do revendedor"><input value={f.name} onChange={set("name")} maxLength={160} required /></Field>
        <Field label="Nome do responsável"><input value={f.contactName} onChange={set("contactName")} maxLength={160} autoComplete="name" required /></Field>
        <Field label="E-mail" hint="Será o seu login."><input type="email" value={f.email} onChange={set("email")} maxLength={200} autoComplete="username" required /></Field>
        <Field label="Telefone / WhatsApp"><input type="tel" value={f.phone} onChange={set("phone")} maxLength={40} autoComplete="tel" required /></Field>
        <Field label="Senha" hint="Mínimo de 12 caracteres."><PasswordInput value={f.password} onChange={set("password")} autoComplete="new-password" required /></Field>
        <Field label="Repita a senha"><PasswordInput value={f.confirm} onChange={set("confirm")} autoComplete="new-password" required /></Field>
        {mismatch && <p className="error">As senhas não são iguais.</p>}
        {/* Isca anti-robô: invisível para pessoas. Se preenchida, o servidor ignora o cadastro. */}
        <input name="website" value={f.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
        <button className="btn primary" style={{ width: "100%" }} disabled={busy || !valid}>{busy ? "Enviando…" : "Criar cadastro"}</button>
      </form>
      <p style={{ marginTop: 16, textAlign: "center" }}><button className="btn sm" onClick={onBack}>Já tenho conta</button></p>
    </div>
  );
}
