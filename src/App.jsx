import { connectRealtime } from "./realtime.js";
import { useEffect, useState } from "react";
import { getAuth, login } from "./api.js";
import { UiProvider, Field, useAction } from "./ui.jsx";
import Shell from "./Shell.jsx";
import { Mark, Bars } from "./icons.jsx";
import Register from "./pages/Register.jsx";
import { ForgotPassword } from "./PasswordReset.jsx";
import "@deltatv/ui/password-reset.css";

function Login({ onRegister, onForgotPassword }) {
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
      <button type="button" className="reset-login-link" onClick={() => onForgotPassword(email)}>Esqueci minha senha</button>
      <p style={{ marginTop: 16, textAlign: "center" }}><button type="button" className="btn sm" onClick={onRegister}>Quero me cadastrar</button></p>
    </div>
  );
}

export default function App() {
  useEffect(() => connectRealtime(), []);
  const [auth, setAuth] = useState(getAuth());
  useEffect(() => {
    const h = () => setAuth(getAuth());
    window.addEventListener("auth-changed", h);
    return () => window.removeEventListener("auth-changed", h);
  }, []);
  // Preserva os links de cadastro e recuperação mesmo após recarregar a tela.
  const currentView = () => location.hash.startsWith("#cadastro") ? "register" : location.hash === "#esqueci-senha" ? "forgot" : "login";
  const [view, setView] = useState(currentView);
  const [forgotEmail, setForgotEmail] = useState("");
  useEffect(() => {
    const syncView = () => setView(currentView());
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, []);
  const show = (next) => {
    const hash = next === "register" ? (location.hash.startsWith("#cadastro?convite=") ? location.hash : "#cadastro") : next === "forgot" ? "#esqueci-senha" : "";
    if (location.hash !== hash) history.pushState(null, "", location.pathname + location.search + hash);
    setView(next);
  };
  // Só contas de revendedor/parceiro usam este portal (o servidor também recusa as demais).
  const user = auth?.user?.role === "partner" ? auth.user : null;
  return (
    <UiProvider>
      {user ? <Shell user={user} /> : view === "register"
        ? <Register onBack={() => show("login")} />
        : view === "forgot"
          ? <ForgotPassword initialEmail={forgotEmail} onBack={() => show("login")} />
          : <Login onRegister={() => show("register")} onForgotPassword={(email) => { setForgotEmail(email); show("forgot"); }} />}
    </UiProvider>
  );
}
