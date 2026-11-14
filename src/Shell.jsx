import TaskFinder from "@deltatv/ui/TaskFinder";
import { TASKS } from "./task-directory.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { logout } from "./api.js";
import { Icon, Mark } from "./icons.jsx";
import { PortalProvider, usePortal } from "./portal.jsx";
import Home from "./pages/Home.jsx";
import { OperationCenter, CENTER_CONFIG } from "./OperationCenter.jsx";
import { useSimpleMode } from "@deltatv/ui/useSimpleMode";
import { EasyPageGuide } from "@deltatv/ui/EasyStart";
import WhiteLabelApps from "./WhiteLabelApps.jsx";
import Clients from "./pages/Customers3.jsx";
import SupportCenter from "./SupportCenter.jsx";
import Devices from "./pages/Devices.jsx";
import { StockPortal } from "./pages/Stock.jsx";
import Licenses from "./pages/Licenses.jsx";
import Codes from "./pages/Codes.jsx";
import Servers from "./pages/Servers.jsx";
import ServerMonitor from "./pages/ServerMonitor.jsx";
import Billing from "./pages/Billing.jsx";
import FinanceiroMaster from "./pages/FinanceiroMaster.jsx";
import Credits from "./pages/Credits.jsx";
import Network from "./pages/Network.jsx";
import WebAccess from "./pages/WebAccess.jsx";
import Downloads from "./pages/Downloads.jsx";
import LoginHistory from "./pages/LoginHistory.jsx";
import Notifications from "./pages/Notifications.jsx";
import { api } from "./api.js";
import ProfilePage from "./ProfilePage.jsx";
import ServerHealthAlert from "./ServerHealthAlert.jsx";
import HelpExperience from "./HelpExperience.jsx";

// Cada item vira uma página. `reseller`: só aparece para quem revende licenças.
const NAV = [
  ...Object.entries(CENTER_CONFIG).map(([id,c])=>({id:`central-${id}`,label:c.title,icon:({pagamentos:"wallet",dispositivos:"tv",licenciamento:"ticket",ativacao:"key",conta:"user"})[id],page:OperationCenter,desc:c.intro,center:true})),
  { id: "inicio", label: "Início", icon: "home", page: Home, desc: "O que precisa da sua atenção hoje." },
  { id: "suporte", label: "Resolver problema da TV", icon: "help", page: SupportCenter, desc: "Diagnostique um cliente sem interpretar logs ou códigos técnicos." },
  { id: "clientes", label: "Clientes", icon: "users", page: Clients, reseller: true, desc: "Cadastre pessoas sem MAC, gerencie planos com várias TVs e consulte os cadastros antigos na mesma área." },
  { id: "dispositivos", label: "Dispositivos", icon: "tv", page: Devices, desc: "Busque uma TV pelo MAC, edite as listas dela e gerencie as ativações." },
  { id: "rede", label: "Minha rede de revendas", icon: "users", page: Network, reseller: true, desc: "Convide revendas, compre licenças do Master e gerencie sua rede." },
  { id: "estoque", label: "Estoque", icon: "box", page: StockPortal, reseller: true, desc: "Licenças disponíveis. Aplique ao MAC de um cliente (em Dispositivos) ou transfira para outro revendedor." },
  { id: "creditos", label: "Crédito", icon: "coin", page: Credits, reseller: true, desc: "Saldo pré-pago para comprar licenças. Recarregue por Pix e troque por licenças no estoque." },
  { id: "licencas", label: "Licenças", icon: "ticket", page: Licenses, reseller: true, desc: "As licenças do seu estoque em uso: veja o prazo de cada uma, renove, suspenda ou reative." },
  { id: "codigos", label: "Códigos", icon: "key", page: Codes, desc: "Códigos que o cliente digita na TV para ativar." },
  { id: "playerweb", label: "Player Web", icon: "tv", page: WebAccess, reseller: true, desc: "Códigos (2 letras + 6 números) para o cliente assistir no navegador, com licença e entrega próprias." },
  { id: "white-label", label: "Meus aplicativos", icon: "download", page: WhiteLabelApps, desc: "Aplicativos contratados, servidores e limites de ativação." },
  { id: "aplicativos", label: "Downloads e links", icon: "download", page: Downloads, reseller: true, desc: "Aplicativos para baixar e links úteis: copie o link ou o código do Downloader para passar ao seu cliente." },
  { id: "servidores", label: "Fontes de conteúdo", icon: "server", page: Servers, desc: "Links e qualidade HTTP na mesma área." },
  { id: "monitoramento", label: "Monitoramento", icon: "server", page: ServerMonitor, desc: "Acompanhe a disponibilidade e o tempo de resposta dos seus servidores." },
  { id: "notificacoes", label: "Notificações", icon: "bell", page: Notifications, desc: "Avisos e comunicados da Delta TV." },
  { id: "loginhistory", label: "Histórico de login", icon: "history", page: LoginHistory, desc: "Veja seus acessos, IPs e dispositivos." },
  { id: "financeiro", label: "Financeiro", icon: "wallet", page: Billing, desc: "Mensalidades da parceria e pagamentos por Pix." },
  { id: "pix-master", label: "Pix da minha rede", icon: "wallet", page: FinanceiroMaster, reseller: true, desc: "Vendas, compras Pix e recebimentos de licenças dos Masters." },
  { id: "conta", label: "Minha conta", icon: "user", page: ProfilePage, desc: "Dados pessoais, segurança, sessões, histórico e notificações." },
  { id: "ajuda", label: "Central de Ajuda", icon: "help", page: null, desc: "Guias e tutoriais interativos do painel." },
];
// Menu por área: o dia a dia (clientes e TVs), o que vende (licenças), a ativação (códigos e servidores) e a conta.
const SIMPLE_RESELLER = new Set(["central-ativacao", "inicio", "suporte", "clientes", "dispositivos", "estoque", "rede", "codigos", "servidores", "notificacoes", "ajuda", "conta"]);
const GROUPS = [
  { label: null, ids: ["inicio"] },
  { label: "Acesso rápido", ids: ["clientes", "dispositivos", "central-ativacao"] },
  { label: "Atendimento", ids: ["suporte"] },
  { label: "Comercial", ids: ["rede"] },
  { label: "Licenças e financeiro", ids: ["estoque", "creditos", "licencas", "financeiro", "pix-master"] },
  { label: "Aplicativos e servidores", ids: ["codigos", "playerweb", "servidores", "white-label", "aplicativos"] },
  { label: "Conta e suporte", ids: ["notificacoes", "loginhistory", "ajuda"] },
];
const ACCOUNT = [
  { id: "conta", label: "Minha conta", icon: "user", page: ProfilePage, desc: "Seu perfil e a segurança da conta." },
  { id: "ajuda", label: "Central de Ajuda", icon: "help", page: null, desc: "Tutoriais de ajuda." },
];
const readRoute = () => (location.hash.startsWith("#/") ? location.hash.slice(2) : "inicio");

/** Menu de perfil no cabeçalho, equivalente ao painel administrativo. */
function UserMenu({ user, name, avatar, onAccount }) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!expanded) return;
    const closeOutside = (event) => { if (ref.current && !ref.current.contains(event.target)) setExpanded(false); };
    const closeEscape = (event) => { if (event.key === "Escape") setExpanded(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [expanded]);
  const displayName = name || user.name || user.email || "Revendedor";
  const initial = String(displayName).trim().charAt(0).toUpperCase();
  return (
    <div className="usermenu" ref={ref}>
      <button type="button" className="usermenu-btn" aria-label={`Perfil: ${displayName}`} aria-haspopup="menu" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <span className="avatar" aria-hidden="true">{avatar ? <img src={avatar} alt="" className="profile-menu-avatar"/> : initial}</span>
        <span className="usermenu-name">{displayName}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {expanded && <div className="usermenu-pop" role="menu">
        <div className="who"><strong>{displayName}</strong><span>{user.email}</span></div>
        <button type="button" className="btn sm" role="menuitem" onClick={() => { setExpanded(false); onAccount(); }}><Icon name="user" /> Minha conta</button>
        <button type="button" className="btn sm" role="menuitem" onClick={logout}><Icon name="logout" /> Sair da conta</button>
      </div>}
    </div>
  );
}

function Layout({ user }) {
  const { me, isReseller, summary } = usePortal();
  const [route, setRoute] = useState(readRoute);
  const [open, setOpen] = useState(false);
  const [simpleMode, setSimpleMode] = useSimpleMode("revenda");
  // Permite que o tour mostre as opções que ficam na gaveta de navegação móvel.
  useEffect(() => { const openForHelp = () => setOpen(true); window.addEventListener("deltatv-help-open-menu", openForHelp); return () => window.removeEventListener("deltatv-help-open-menu", openForHelp); }, []);
  const [notificationCount, setNotificationCount] = useState(0);
  const [profileDetails, setProfileDetails] = useState(null);
  useEffect(() => {
    let live = true;
    api("/auth/profile").then(data => { if (live) setProfileDetails(data); }).catch(() => {});
    const changed = event => setProfileDetails(event.detail);
    window.addEventListener("profile-updated", changed);
    return () => { live = false; window.removeEventListener("profile-updated", changed); };
  }, [user.id]);
  const showBadge = profileDetails?.profile?.showNotificationBadge !== false;
  const showUnread = profileDetails?.profile?.showUnreadBanner !== false;
  // A gaveta não deve permitir scroll da página atrás dela; Escape também a fecha.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onEscape);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onEscape); };
  }, [open]);
  useEffect(() => {
    let active = true;
    const refresh = () => api("/partner/notifications", { query: { limit: 1 } }).then(v => { if (active) setNotificationCount(v.unread || 0); }).catch(() => {});
    refresh();
    const event = (e) => { if (e.type === "notification-updated" || e.type === "realtime-ready" || e.detail?.type === "notification") refresh(); };
    window.addEventListener("realtime-change", event); window.addEventListener("realtime-ready", event); window.addEventListener("notification-updated", event);
    return () => { active = false; window.removeEventListener("realtime-change", event); window.removeEventListener("realtime-ready", event); window.removeEventListener("notification-updated", event); };
  }, []);
  useEffect(() => {
    const h = () => setRoute(readRoute());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  const blocked = !!me && me.effectiveStatus !== "active"; // cadastro em análise, suspenso ou vencido: só o aviso
  const items = blocked ? ACCOUNT : NAV.filter((n) => !n.reseller || isReseller);
  const cur = items.find((n) => n.id === route) || items[0];
  const go = useCallback((id) => { location.hash = `/${id}`; setOpen(false); window.scrollTo(0, 0); }, []);
  const Page = cur.page;
  const centerAllowed = id => items.some(item => item.id === id);
  const title = cur.id === "inicio" ? `Olá, ${(user.name || "").split(" ")[0] || "revendedor"}` : cur.label;
  const badge = { clientes: summary?.overdue, notificacoes: notificationCount };

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand"><span className="brand-icon"><Mark size={38} /></span><div><strong>Delta<span>TV</span></strong><small>PAINEL DA REVENDA</small></div>
          <button className="icon sidebar-close" type="button" aria-label="Fechar menu" onClick={() => setOpen(false)}><Icon name="x" size={20}/></button>
        </div>
        <button type="button" className="easy-mode-button" aria-pressed={!simpleMode} onClick={() => setSimpleMode((v) => !v)}>{simpleMode ? "⚙ Mostrar todas as opções" : "✓ Usar menu simples"}</button>
        <div className="sidebar-context"><span className="sidebar-context-dot" /> <span>Área de trabalho</span><span className="sidebar-context-mark">Revenda</span></div>
        <nav aria-label="Principal">
          {GROUPS.map((g) => {
            const list = items.filter((n) => g.ids.includes(n.id) && (!simpleMode || SIMPLE_RESELLER.has(n.id) || n.id === cur.id));
            if (!list.length) return null;
            return (
              <div className="nav-group" key={g.label || "top"}>
                {g.label && <div className="nav-heading">{g.label}</div>}
                {list.map((n) => (
                  <button key={n.id} className={`nav ${(n.id === cur.id || (route === "monitoramento" && n.id === "servidores")) ? "active" : ""}`} aria-current={(n.id === cur.id || (route === "monitoramento" && n.id === "servidores")) ? "page" : undefined} data-help-target={({ inicio: "home", ajuda: "help", conta: "profile", servidores: "servers", codigos: "codes", dispositivos: "devices", licencas: "licenses", financeiro: "billing", "white-label": "apps", notificacoes: "notifications" })[n.id] || undefined} onClick={() => go(n.id)}>
                    <Icon name={n.icon} /><span>{n.label}</span>{showBadge && badge[n.id] > 0 && <b className="count">{badge[n.id]}</b>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <span className="sidebar-foot-icon"><Icon name="shield" size={16}/></span>
          <span><strong>Ambiente protegido</strong><small>Delta TV · Portal comercial</small></span>
        </div>
      </aside>
      {open && <button type="button" className="scrim" aria-label="Fechar navegação" onClick={() => setOpen(false)} />}
      <div className="main">
        <div className="topbar">
          <button type="button" className="icon menu-btn" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu" size={22} /></button>
          <div className="topbar-context"><span className="topbar-eyebrow">PAINEL DA REVENDA</span><strong className="topbar-title">{cur.label}</strong></div>
          <div className="topbar-tools">
            {!blocked && <button className="btn primary sm" type="button" onClick={()=>{sessionStorage.setItem("deltatv-quick-activate","1");go("clientes");window.dispatchEvent(new Event("deltatv-open-activation"));}}>Ativar TV</button>}
            <button type="button" className="easy-mode-button" aria-pressed={!simpleMode} onClick={() => setSimpleMode((v) => !v)}>{simpleMode ? "Modo simples · mostrar tudo" : "Modo completo · simplificar"}</button>
            <button type="button" className="btn sm" data-help-target="context-help" onClick={() => window.dispatchEvent(new CustomEvent("deltatv-help-context", { detail: { screen: cur.id } }))}>? Ajuda</button>
            {!blocked && <button type="button" className="topbar-notify" aria-label={notificationCount > 0 ? `${notificationCount} notificações não lidas` : "Abrir notificações"} title="Notificações" onClick={() => go("notificacoes")}>
              <Icon name="bell" size={19}/>{showBadge && notificationCount > 0 && <span className="topbar-notify-count">{notificationCount > 99 ? "99+" : notificationCount}</span>}
            </button>}
            <UserMenu user={user} name={user.name || me?.name} avatar={profileDetails?.profile?.avatarData} onAccount={() => go("conta")} />
          </div>
        </div>
        {!blocked && <ServerHealthAlert onOpenMonitor={() => go("monitoramento")} />}
        {showUnread && notificationCount > 0 && cur.id !== "notificacoes" && !blocked && <div role="status" className="unread-banner">
          <span className="unread-banner-symbol"><Icon name="bell" size={19}/></span>
          <div className="unread-banner-copy"><strong>{notificationCount === 1 ? "Você tem 1 mensagem não lida" : `Você tem ${notificationCount} mensagens não lidas`}</strong><span>Há comunicados da Delta TV aguardando sua leitura.</span></div>
          <button type="button" className="btn primary" onClick={() => go("notificacoes")}>Ler mensagens <Icon name="arrow-right" size={15}/></button>
        </div>}
        <main className="content">
          <TaskFinder tasks={TASKS.filter(task=>centerAllowed(task.route))} onNavigate={go} />
          <header className="page-title">
            <div className="page-title-copy"><span className="page-eyebrow">DELTA TV <span>/</span> {cur.label.toUpperCase()}</span><h1>{title}</h1>{cur.desc && <p className="muted">{cur.desc}</p>}</div>
          </header>
          {simpleMode && cur.id !== "inicio" && <EasyPageGuide role="reseller" page={cur.id} onBack={() => go("inicio")} />}
          <HelpExperience screen={cur.id} portal="reseller" userId={user.id} onNavigate={go}/>
          {Page && (cur.center ? <OperationCenter section={cur.id.replace("central-", "")} onNavigate={go} allowed={centerAllowed}/> : <Page go={go} user={user} />)}
        </main>
      </div>
    </div>
  );
}

export default function Shell({ user }) {
  return <PortalProvider><Layout user={user} /></PortalProvider>;
}
