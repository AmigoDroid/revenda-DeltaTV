import { useEffect, useState } from "react";
import { getAuth, login, logout } from "./api.js";
import { UiProvider, Field, useAction } from "./ui.jsx";
import PartnerPortal from "./pages/PartnerPortal.jsx";
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
      <h2 style={{ marginBottom: 16 }}>Portal do Revendedor</h2>
      <form onSubmit={submit}>
        <Field label="E-mail"><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Senha"><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <button className="btn primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
      <p style={{ marginTop: 16, textAlign: "center" }}><button className="btn sm" onClick={onRegister}>Quero me cadastrar</button></p>
    </div>
  );
}

function Shell({ user }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Portal do Revendedor</div>
        <button className="nav active">Minha conta</button>
        <div className="user">{user.name}<br />{user.email}<br /><button className="btn sm" style={{ marginTop: 8 }} onClick={logout}>Sair</button></div>
      </aside>
      <main className="content"><PartnerPortal /></main>
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
