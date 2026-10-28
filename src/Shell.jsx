import { useEffect, useState } from "react";
import { logout } from "./api.js";
import { Icon, Mark } from "./icons.jsx";
import { PortalProvider, usePortal } from "./portal.jsx";
import Home from "./pages/Home.jsx";
import Clients from "./pages/Clients.jsx";
import Devices from "./pages/Devices.jsx";
import { StockPortal } from "./pages/Stock.jsx";
import Licenses from "./pages/Licenses.jsx";
import Codes from "./pages/Codes.jsx";
import Servers from "./pages/Servers.jsx";
import Billing, { Blocked } from "./pages/Billing.jsx";

// Cada item vira uma página. `reseller`: só aparece para quem revende licenças.
const NAV = [
  { id: "inicio", label: "Início", icon: "home", page: Home, desc: "O que precisa da sua atenção hoje." },
  { id: "clientes", label: "Clientes", icon: "users", page: Clients, reseller: true, desc: "Nome, contato, valor e vencimento de cada TV. Cadastre um MAC antes de ativar ou complete os dados de uma TV já ativada." },
  { id: "dispositivos", label: "Dispositivos", icon: "tv", page: Devices, desc: "Busque uma TV pelo MAC, edite as listas dela e gerencie as ativações." },
  { id: "estoque", label: "Estoque", icon: "box", page: StockPortal, reseller: true, desc: "Licenças disponíveis. Aplique ao MAC de um cliente (em Dispositivos) ou transfira para outro revendedor." },
  { id: "licencas", label: "Licenças", icon: "ticket", page: Licenses, reseller: true, desc: "As licenças do seu estoque em uso: veja o prazo de cada uma, renove, suspenda ou reative." },
  { id: "codigos", label: "Códigos", icon: "key", page: Codes, gap: true, desc: "Códigos que o cliente digita na TV para ativar." },
  { id: "servidores", label: "Servidores", icon: "server", page: Servers, desc: "Os painéis IPTV usados pelos seus códigos." },
  { id: "financeiro", label: "Financeiro", icon: "wallet", page: Billing, desc: "Mensalidades da parceria e pagamentos por Pix." },
];
const ACCOUNT = [{ id: "conta", label: "Minha conta", icon: "wallet", page: Blocked, desc: "" }];
const readRoute = () => (location.hash.startsWith("#/") ? location.hash.slice(2) : "inicio");

function Layout({ user }) {
  const { me, isReseller, summary } = usePortal();
  const [route, setRoute] = useState(readRoute);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setRoute(readRoute());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  const blocked = !!me && me.effectiveStatus !== "active"; // cadastro em análise, suspenso ou vencido: só o aviso
  const items = blocked ? ACCOUNT : NAV.filter((n) => !n.reseller || isReseller);
  const cur = items.find((n) => n.id === route) || items[0];
  const go = (id) => { location.hash = `/${id}`; setOpen(false); window.scrollTo(0, 0); };
  const Page = cur.page;
  const title = cur.id === "inicio" ? `Olá, ${(user.name || "").split(" ")[0] || "revendedor"}` : cur.label;
  const badge = { clientes: summary?.overdue };

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand"><Mark /><div><strong>DeltaTV</strong><span>Portal do revendedor</span></div></div>
        <nav aria-label="Principal">
          {items.map((n) => (
            <button key={n.id} className={`nav ${n.id === cur.id ? "active" : ""} ${n.gap ? "gap" : ""}`} aria-current={n.id === cur.id ? "page" : undefined} onClick={() => go(n.id)}>
              <Icon name={n.icon} /><span>{n.label}</span>{badge[n.id] > 0 && <b className="count">{badge[n.id]}</b>}
            </button>
          ))}
        </nav>
        <div className="user">
          <span className="avatar">{(user.name || user.email || "?")[0].toUpperCase()}</span>
          <div><strong>{me?.name || user.name}</strong><small>{user.email}</small></div>
          <button className="icon" title="Sair" aria-label="Sair" onClick={logout}><Icon name="logout" /></button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <div className="topbar"><button className="icon" aria-label="Abrir menu" onClick={() => setOpen(true)}><Icon name="menu" size={22} /></button><strong>{cur.label}</strong></div>
        <main className="content" key={cur.id}>
          <header className="page-title">
            <div><h1>{title}</h1>{cur.desc && <p className="muted">{cur.desc}</p>}</div>
          </header>
          <Page go={go} user={user} />
        </main>
      </div>
    </div>
  );
}

export default function Shell({ user }) {
  return <PortalProvider><Layout user={user} /></PortalProvider>;
}
