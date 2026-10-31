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
import Credits from "./pages/Credits.jsx";
import WebAccess from "./pages/WebAccess.jsx";
import Downloads from "./pages/Downloads.jsx";

// Cada item vira uma página. `reseller`: só aparece para quem revende licenças.
const NAV = [
  { id: "inicio", label: "Início", icon: "home", page: Home, desc: "O que precisa da sua atenção hoje." },
  { id: "clientes", label: "Clientes", icon: "users", page: Clients, reseller: true, desc: "Nome, contato, valor e vencimento de cada TV. Cadastre um MAC antes de ativar ou complete os dados de uma TV já ativada." },
  { id: "dispositivos", label: "Dispositivos", icon: "tv", page: Devices, desc: "Busque uma TV pelo MAC, edite as listas dela e gerencie as ativações." },
  { id: "estoque", label: "Estoque", icon: "box", page: StockPortal, reseller: true, desc: "Licenças disponíveis. Aplique ao MAC de um cliente (em Dispositivos) ou transfira para outro revendedor." },
  { id: "creditos", label: "Crédito", icon: "coin", page: Credits, reseller: true, desc: "Saldo pré-pago para comprar licenças. Recarregue por Pix e troque por licenças no estoque." },
  { id: "licencas", label: "Licenças", icon: "ticket", page: Licenses, reseller: true, desc: "As licenças do seu estoque em uso: veja o prazo de cada uma, renove, suspenda ou reative." },
  { id: "codigos", label: "Códigos", icon: "key", page: Codes, desc: "Códigos que o cliente digita na TV para ativar." },
  { id: "playerweb", label: "Player Web", icon: "tv", page: WebAccess, reseller: true, desc: "Códigos (2 letras + 6 números) para o cliente assistir no navegador, com licença e entrega próprias." },
  { id: "aplicativos", label: "Downloads e links", icon: "download", page: Downloads, reseller: true, desc: "Aplicativos para baixar e links úteis: copie o link ou o código do Downloader para passar ao seu cliente." },
  { id: "servidores", label: "Servidores", icon: "server", page: Servers, desc: "Os painéis IPTV usados pelos seus códigos." },
  { id: "financeiro", label: "Financeiro", icon: "wallet", page: Billing, desc: "Mensalidades da parceria e pagamentos por Pix." },
];
// Menu por área: o dia a dia (clientes e TVs), o que vende (licenças), a ativação (códigos e servidores) e a conta.
const GROUPS = [
  { label: null, ids: ["inicio"] },
  { label: "Atendimento", ids: ["clientes", "dispositivos"] },
  { label: "Licenças", ids: ["estoque", "creditos", "licencas"] },
  { label: "Ativação", ids: ["codigos", "playerweb", "servidores", "aplicativos"] },
  { label: "Conta", ids: ["financeiro", "conta"] },
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
          {GROUPS.map((g) => {
            const list = items.filter((n) => g.ids.includes(n.id));
            if (!list.length) return null;
            return (
              <div className="nav-group" key={g.label || "top"}>
                {g.label && <div className="nav-heading">{g.label}</div>}
                {list.map((n) => (
                  <button key={n.id} className={`nav ${n.id === cur.id ? "active" : ""}`} aria-current={n.id === cur.id ? "page" : undefined} onClick={() => go(n.id)}>
                    <Icon name={n.icon} /><span>{n.label}</span>{badge[n.id] > 0 && <b className="count">{badge[n.id]}</b>}
                  </button>
                ))}
              </div>
            );
          })}
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
