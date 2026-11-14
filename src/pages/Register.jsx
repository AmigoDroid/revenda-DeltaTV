import { useEffect, useState } from "react";
import { api } from "../api.js";
import { registerReseller } from "../api.js";
import { Field, PasswordInput, useAction } from "../ui.jsx";

/** Cadastro normal depende de aprovação; um convite validado ativa a conta na rede. */
export default function Register({ onBack }) {
  const run = useAction();
  const invitationToken = (()=>{
    const fragment=window.location.hash.split("?")[1]||"";
    return new URLSearchParams(fragment).get("convite") || new URLSearchParams(window.location.search).get("convite") || "";
  })();
  const [masterName,setMasterName]=useState("");
  const [inviteError,setInviteError]=useState("");
  useEffect(()=>{
    setMasterName("");setInviteError("");
    if(!invitationToken)return;
    api("/auth/network-invite/verify",{method:"POST",body:{token:invitationToken}})
      .then(d=>setMasterName(d.masterName||"Master"))
      .catch(e=>setInviteError(e.message||"Convite inválido"));
  },[invitationToken]);
  const [f, setF] = useState({ contactName: "", email: "", phone: "", password: "", confirm: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const mismatch = f.confirm !== "" && f.password !== f.confirm;
  const valid = f.contactName.trim().length >= 2 && f.email.includes("@") && f.phone.trim().length >= 8 && f.password.length >= 12 && f.password === f.confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const { confirm, ...body } = f;
    if(invitationToken)body.inviteToken=invitationToken;
    const r = await run(() => registerReseller(body));
    setBusy(false);
    if (r) setDone(true);
  };

  if (done) {
    return (
      <div className="login card">
        <h2 style={{ marginBottom: 12 }}>{invitationToken ? "Cadastro concluído" : "Cadastro recebido"}</h2>
        <p>{invitationToken
          ? "Se este e-mail ainda não tinha cadastro, sua revenda foi ativada na rede do Master. Entre agora com seu e-mail e senha."
          : "Recebemos seu cadastro. Assim que a plataforma aprovar, você poderá utilizar o portal."}</p>
        <p className="muted">Se já tiver cadastro com esse e-mail, entre na conta existente ou use a recuperação de senha.</p>
        <button className="btn primary" style={{ width: "100%", marginTop: 12 }} onClick={onBack}>Ir para o login</button>
      </div>
    );
  }
  return (
    <div className="login card">
      <h2 style={{ marginBottom: 16 }}>Cadastro de revendedor</h2>
      {masterName&&<p style={{color:"var(--ok)"}}>Convite confirmado! Sua revenda será vinculada à rede de <strong>{masterName}</strong> e terá acesso imediato aos recursos básicos.</p>}
      {inviteError&&<p className="error" role="alert">{inviteError}. Solicite um novo convite ao Master. O cadastro normal continua disponível sem convite.</p>}
      <form onSubmit={submit}>
        <Field label="Seu nome" hint="Nome completo, como você é conhecido pelos seus clientes."><input value={f.contactName} onChange={set("contactName")} maxLength={160} autoComplete="name" required /></Field>
        <Field label="E-mail" hint="Será o seu login."><input type="email" value={f.email} onChange={set("email")} maxLength={200} autoComplete="username" required /></Field>
        <Field label="Telefone / WhatsApp"><input type="tel" value={f.phone} onChange={set("phone")} maxLength={40} autoComplete="tel" required /></Field>
        <Field label="Senha" hint="Mínimo de 12 caracteres."><PasswordInput value={f.password} onChange={set("password")} autoComplete="new-password" required /></Field>
        <Field label="Repita a senha"><PasswordInput value={f.confirm} onChange={set("confirm")} autoComplete="new-password" required /></Field>
        {mismatch && <p className="error">As senhas não são iguais.</p>}
        {/* Isca anti-robô: invisível para pessoas. Se preenchida, o servidor ignora o cadastro. */}
        <input name="website" value={f.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
        <button className="btn primary" style={{ width: "100%" }} disabled={busy || !valid || !!inviteError || (!!invitationToken && !masterName)}>{busy ? "Enviando…" : "Criar cadastro"}</button>
      </form>
      <p style={{ marginTop: 16, textAlign: "center" }}><button className="btn sm" onClick={onBack}>Já tenho conta</button></p>
    </div>
  );
}
