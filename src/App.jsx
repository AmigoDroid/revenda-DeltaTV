import { useEffect, useState } from "react";
import { getAuth, login } from "./api.js";
import { UiProvider, Field, useAction } from "./ui.jsx";
import Shell from "./Shell.jsx";
import { Mark, Bars } from "./icons.jsx";
import Register from "./pages/Register.jsx";

function Login({ onRegister }) {
  const run = useAction();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await run(() => login(email, password));
    setBusy(false);
  };
  return (
    <div className="login card">
      <Bars />
      <div className="login-brand"><Mark size={36} /><div><h2>DeltaTV</h2><span className="muted">Portal do revendedor</span></div></div>
      <form onSubmit={submit}>
        <Field label="E-mail"><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Senha"><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <button className="btn primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
      <p style={{ marginTop: 16, textAlign: "center" }}><button className="btn sm" onClick={onRegister}>Quero me cadastrar</button></p>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(getAuth());
  useEffect(() => {
    const h = () => setAuth(getAuth());
    window.addEventListener("auth-changed", h);
    return () => window.removeEventListener("auth-changed", h);
  }, []);
  // Tela de cadastro em #cadastro (link que o revendedor pode receber).
  const [registering, setRegistering] = useState(() => location.hash === "#cadastro");
  const toRegister = (on) => { setRegistering(on); location.hash = on ? "cadastro" : ""; };
  // Só contas de revendedor/parceiro usam este portal (o servidor também recusa as demais).
  const user = auth?.user?.role === "partner" ? auth.user : null;
  return (
    <UiProvider>
      {user ? <Shell user={user} /> : registering ? <Register onBack={() => toRegister(false)} /> : <Login onRegister={() => toRegister(true)} />}
    </UiProvider>
  );
}
