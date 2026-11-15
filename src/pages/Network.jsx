import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { Icon, Mark } from "../icons.jsx";
import LicenseTrading from "./LicenseTrading.jsx";
import "./network-dashboard.css";

import { allowedNetworkSections } from "./network-navigation.js";

const RESOURCE_LABELS = {
  servers: "Servidores IPTV", codes: "Códigos de ativação", devices: "Gerenciar TVs", clients: "Clientes",
  stock: "Estoque de licenças", credits: "Créditos e compras", web: "Player Web",
  white_label: "Aplicativos personalizados", remote: "Controle remoto",
};
const optionalNumber = value => value === "" ? null : Number(value);
const formatAmount = value => Number(value || 0).toLocaleString("pt-BR");
const formatDate = value => value ? new Date(value).toLocaleDateString("pt-BR") : "Sem vencimento";
const waInvite = (url, name) => `https://wa.me/?text=${encodeURIComponent(`Olá! Cadastre sua revenda DeltaTV na rede de ${name}: ${url}`)}`;
const describeInvite = invite => `${invite.uses}/${invite.maxUses == null ? "sem limite" : invite.maxUses} cadastros · ${formatDate(invite.expiresAt)}`;

function SectionHeading({ eyebrow, title, description, action }) {
  return <header className="network-section-heading">
    <div><span className="network-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
    {action && <div className="network-section-action">{action}</div>}
  </header>;
}
function EmptyState({ icon = "users", title, description, action }) {
  return <div className="network-empty" role="status"><span className="network-empty-symbol"><Icon name={icon} size={23} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
function Stat({ icon, label, value, detail }) {
  return <div className="network-stat"><span className="network-stat-symbol"><Icon name={icon} size={18}/></span><small>{label}</small><strong>{value}</strong>{detail && <span>{detail}</span>}</div>;
}

/** Dashboard independente: o Shell principal é substituído enquanto /rede/* estiver ativo. */
export default function Network({ go, section = "resumo", user }) {
  const [network, setNetwork] = useState(null);
  const [resources, setResources] = useState(null);
  const [summary, setSummary] = useState(null);
  const [invites, setInvites] = useState([]);
  const [tree, setTree] = useState([]);
  const [treeTotal, setTreeTotal] = useState(0);
  const [mySaas, setMySaas] = useState([]);
  const [myCommissions, setMyCommissions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches);
  const sidebarRef = useRef(null);
  const openMenuRef = useRef(null);
  const previousSection = useRef(section);
  const [inviteUses, setInviteUses] = useState("");
  const [inviteDays, setInviteDays] = useState("");
  const [newLink, setNewLink] = useState("");
  const [childPage, setChildPage] = useState(1);
  const [treePage, setTreePage] = useState(1);
  const [childQuery, setChildQuery] = useState("");
  const [childId, setChildId] = useState("");
  const [childResources, setChildResources] = useState(null);
  const [commissionChild, setCommissionChild] = useState("");
  const [commissionRate, setCommissionRate] = useState("0");

  const reload = useCallback(async () => {
    const [n, rs] = await Promise.all([
      api(`/partner/network?page=${childPage}&pageSize=50`),
      api("/partner/network/resources"),
    ]);
    setNetwork(n);
    setResources(rs);
    const master = n.account?.distributionRole === "master";
    const pending = [
      api("/partner/commerce/commissions"),
      api("/partner/commerce/master-contract"),
      master && n.policy?.canInvite ? api("/partner/network/invites") : Promise.resolve({ data: [] }),
      master && n.policy?.canInvite ? api(`/partner/network/tree?page=${treePage}&pageSize=100`) : Promise.resolve({ data: [], total: 0 }),
      master && n.policy?.canInvite ? api("/partner/network/summary") : Promise.resolve(null),
    ];
    const values = await Promise.allSettled(pending);
    const result = (index, fallback) => values[index].status === "fulfilled" ? values[index].value : fallback;
    setMyCommissions(result(0, { data: [] })?.data || []);
    setMySaas(result(1, { data: [] })?.data || []);
    setInvites(result(2, { data: [] })?.data || []);
    const hierarchy = result(3, { data: [], total: 0 });
    setTree(hierarchy?.data || []);
    setTreeTotal(hierarchy?.total || 0);
    setSummary(result(4, null));
    const failed = values.find(value => value.status === "rejected" && value.reason?.status !== 403);
    if (failed) setError("Parte das informações não pôde ser carregada. Você pode tentar atualizar a página.");
  }, [childPage, treePage]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload().catch(err => { if (!cancelled) setError(err.message || "Falha ao carregar a rede."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);
  useEffect(() => {
    if (!childId || !network?.policy?.canInvite) { setChildResources(null); return; }
    let active = true;
    api(`/partner/network/children/${childId}/resources`).then(data => { if (active) setChildResources(data); })
      .catch(err => { if (active) setError(err.message || "Não foi possível carregar as permissões."); });
    return () => { active = false; };
  }, [childId, network?.policy?.canInvite]);
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
    if (previousSection.current !== section && compact) {
      requestAnimationFrame(() => document.getElementById("network-main")?.focus());
    }
    previousSection.current = section;
  }, [section]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 860px)");
    const changed = event => setCompact(event.matches);
    setCompact(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = event => {
      if (event.key === "Escape") { setMenuOpen(false); openMenuRef.current?.focus(); }
      if (event.key === "Tab" && compact && sidebarRef.current) {
        const buttons = [...sidebarRef.current.querySelectorAll('button:not(:disabled)')];
        if (!buttons.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", close);
    const previousOverflow = document.body.style.overflow;
    if (compact) { document.body.style.overflow = "hidden"; sidebarRef.current?.querySelector("button")?.focus(); }
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previousOverflow; };
  }, [menuOpen, compact]);

  const execute = async (operation, success) => {
    if (busy) return null;
    setBusy(true); setError(""); setNotice("");
    try { const result = await operation(); if (success) setNotice(success); await reload(); return result; }
    catch (err) { setError(err.message || "Não foi possível concluir esta operação."); return null; }
    finally { setBusy(false); }
  };
  const changeSection = id => go(`rede/${id === "resumo" ? "" : id}`.replace(/\/$/, ""));
  const sections = useMemo(() => allowedNetworkSections(network), [network]);
  const current = sections.find(entry => entry.id === section) || sections[0];
  const active = current?.id || "resumo";
  const master = network?.account?.distributionRole === "master";
  const canInvite = master && Boolean(network?.policy?.canInvite);
  const canSell = master && Boolean(network?.policy?.canSell);
  const directChildren = network?.children || [];
  const filteredChildren = directChildren.filter(child => `${child.name} ${child.contact_email || ""}`.toLocaleLowerCase("pt-BR").includes(childQuery.toLocaleLowerCase("pt-BR")));
  const stockTotal = (network?.stock || []).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  const contract = mySaas[0];
  const selectedChild = directChildren.find(child => String(child.id) === String(childId));

  const createInvite = async event => {
    event.preventDefault();
    const result = await execute(() => api("/partner/network/invites", {
      method: "POST", body: { daysValid: optionalNumber(inviteDays), maxUses: optionalNumber(inviteUses) },
    }), "Convite criado. Compartilhe o link abaixo.");
    if (result?.url) setNewLink(result.url);
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(newLink); setNotice("Link copiado. Agora você pode compartilhá-lo."); }
    catch { window.prompt("Copie o link de convite:", newLink); }
  };
  const changeChild = (id, action) => execute(
    () => api(`/partner/network/children/${id}/${action}`, { method: "POST", body: {} }),
    action === "approve" ? "Revenda aprovada." : action === "reject" ? "Cadastro recusado." : "Revenda suspensa.",
  );
  const promote = async child => {
    if (!window.confirm(`Promover ${child.name} a Submaster? Ele poderá criar sua rede conforme as permissões concedidas.`)) return;
    const policy = network.policy;
    await execute(() => api(`/partner/network/children/${child.id}/promote`, {
      method: "POST", body: { policy: { canInvite: policy.canInvite, canSell: policy.canSell,
        canPromote: false, maxChildren: policy.maxChildren, maxDepth: policy.maxDepth } },
    }), "Revenda promovida a Submaster.");
  };
  const updateResource = async (resource, enabled, limit) => {
    const result = await execute(() => api(`/partner/network/children/${childId}/resources`, {
      method: "PUT", body: { resource, enabled, limit },
    }), "Permissão atualizada.");
    if (result) setChildResources(await api(`/partner/network/children/${childId}/resources`));
  };
  const updateCommission = async event => {
    event.preventDefault();
    if (!commissionChild || !Number.isFinite(Number(commissionRate)) || Number(commissionRate) < 0 || Number(commissionRate) > 100) return;
    await execute(() => api(`/partner/commerce/commissions/children/${commissionChild}`, {
      method: "PUT", body: { basisPoints: Math.round(Number(commissionRate) * 100) },
    }), "Percentual de comissão atualizado.");
  };

  const title = current.label;
  const description = current.description;
  return <div className="network-dashboard" data-dashboard="rede-v3" data-dashboard-version="2026-11-14.2">
    {menuOpen && <button className="network-backdrop" type="button" aria-label="Fechar menu da rede" onClick={() => setMenuOpen(false)} />}
    <aside ref={sidebarRef} className={`network-sidebar ${menuOpen ? "network-sidebar-open" : ""}`} aria-label="Navegação da rede" aria-hidden={compact && !menuOpen ? "true" : undefined} inert={compact && !menuOpen ? "" : undefined}>
      <div className="network-sidebar-brand"><span className="network-logo"><Mark size={34}/></span>
        <div><strong>Delta<span>TV</span></strong><small>GESTÃO DA REDE</small></div>
      </div>
      <button type="button" className="network-back-button" onClick={() => go("inicio")}>← <span>Voltar ao painel principal</span></button>
      <div className="network-sidebar-group">DASHBOARD EXCLUSIVO · REDE DE REVENDA</div>
      <nav className="network-sidebar-nav" aria-label="Seções da rede de revendas">
        {sections.map(item => <button key={item.id} type="button" className={`network-nav-item ${active === item.id ? "network-nav-active" : ""}`}
          aria-current={active === item.id ? "page" : undefined} onClick={() => changeSection(item.id)}>
          <Icon name={item.icon} size={19}/><span>{item.label}</span>{active === item.id && <span className="network-nav-indicator"/>}
        </button>)}
      </nav>
      <div className="network-sidebar-footer"><span className="network-account-dot"/>
        <div><strong>{network?.account?.name || user?.name || "Minha rede"}</strong><small>{master ? "Conta Master" : network?.parent ? "Revenda vinculada" : "Revenda independente"}</small></div>
      </div>
    </aside>
    <div className="network-main">
      <header className="network-topbar">
        <div className="network-topbar-start">
          <button ref={openMenuRef} type="button" className="network-mobile-menu" aria-label="Abrir menu da rede" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Icon name="menu" size={21}/></button>
          <div className="network-breadcrumb"><button type="button" onClick={() => go("inicio")}>Painel principal</button><span>/</span><button type="button" onClick={() => changeSection("resumo")}>Minha rede</button><span>/</span><strong>{title}</strong></div>
        </div>
        <div className="network-topbar-actions">
          <button className="network-refresh" type="button" disabled={busy || loading} onClick={() => { setError(""); reload().catch(err => setError(err.message)); }}>Atualizar dados</button>
          <button className="network-topbar-exit" type="button" onClick={() => go("inicio")}>Sair da rede <span aria-hidden="true">↗</span></button>
        </div>
      </header>
      <main className="network-content" id="network-main" tabIndex={-1}>
        <div className="network-page-heading"><span className="network-eyebrow">DELTA TV / REDE COMERCIAL</span><h1>{title}</h1><p>{description}</p></div>
        {error && <div className="network-alert network-alert-error" role="alert"><span>{error}</span><button type="button" onClick={() => { setError(""); reload().catch(err => setError(err.message)); }}>Tentar novamente</button></div>}
        {notice && <div className="network-alert network-alert-success" role="status">{notice}</div>}
        {loading && !network ? <div className="network-loading" role="status">Carregando informações da rede…</div> : null}
        {network && <>
          {active === "resumo" && <div className="network-section-body">
            <section className="network-hero">
              <div className="network-hero-copy"><span className="network-hero-tag">SUA OPERAÇÃO COMERCIAL</span><h2>{master ? "Sua rede, em um só lugar." : "Acompanhe sua participação na rede."}</h2>
                <p>{master ? "Organize as revendas, acompanhe a hierarquia e gerencie convites, comissões e licenças em áreas separadas." : network.parent ? `Você participa da rede de ${network.parent.name}. Consulte seu contrato e compre licenças sem procurar em outras telas.` : "Sua conta não pertence a uma rede Master. O Superadmin pode habilitar esse recurso."}</p>
                <div className="network-hero-actions">{canInvite && <button className="btn primary" onClick={() => changeSection("convites")}><Icon name="plus" size={17}/> Convidar revenda</button>}
                  {sections.some(item => item.id === "licencas") && <button className="btn" onClick={() => changeSection("licencas")}>Abrir licenças <Icon name="arrow-right" size={15}/></button>}</div></div>
              <div className="network-hero-emblem" aria-hidden="true"><Icon name="users" size={56}/></div>
            </section>
            <section className="network-stats" aria-label="Indicadores da rede">
              <Stat icon="users" label="Revendas diretas" value={formatAmount(network.childrenTotal ?? directChildren.length)} detail="Sob sua gestão"/>
              <Stat icon="ticket" label="Licenças em estoque" value={formatAmount(stockTotal)} detail="Disponíveis nesta conta"/>
              <Stat icon="coin" label="Créditos comerciais" value={formatAmount(network.creditBalance)} detail="Saldo em unidades de crédito"/>
              <Stat icon="tv" label="Ativações na rede" value={summary ? formatAmount(summary.activeActivations) : "—"} detail={summary ? "Na hierarquia" : "Dado indisponível"}/>
            </section>
            <section className="network-main-cards"><div className="network-panel">
              <SectionHeading eyebrow="PRÓXIMOS PASSOS" title="O que você quer fazer?" description="Escolha uma tarefa. Cada assunto tem uma área própria."/>
              <div className="network-shortcuts">{sections.filter(item => !["resumo", "assinatura"].includes(item.id)).slice(0, 6).map(item =>
                <button type="button" className="network-shortcut" key={item.id} onClick={() => changeSection(item.id)}><span className="network-shortcut-icon"><Icon name={item.icon} size={20}/></span><span><strong>{item.label}</strong><small>{item.description}</small></span><Icon name="arrow-right" size={17}/></button>)}</div>
            </div><div className="network-panel network-subscription-card">
              <SectionHeading eyebrow="SEU ACESSO" title="Assinatura DeltaTV" description="Condições comerciais da sua conta."/>
              {contract ? <><span className="network-label">PLANO CONTRATADO</span><strong className="network-plan-name">{contract.planName}</strong><p>Modelo: {contract.billingMode} · Situação: {contract.state}</p><p>Ativações incluídas: {contract.includedSlots ?? "Sem limite comercial"}</p></> : <p>Nenhum contrato comercial DeltaTV 3.0 cadastrado. Seu plano anterior permanece válido.</p>}
              <button type="button" className="network-text-link" onClick={() => changeSection("assinatura")}>Ver detalhes da assinatura <Icon name="arrow-right" size={16}/></button>
            </div></section>
          </div>}

          {active === "revendas" && <section className="network-section-body">
            <SectionHeading eyebrow="GESTÃO DE PESSOAS" title="Revendas vinculadas" description="Localize, aprove, suspenda ou configure os integrantes diretamente vinculados à sua conta."
              action={canInvite ? <button className="btn primary" onClick={() => changeSection("convites")}>+ Novo convite</button> : null}/>
            <div className="network-panel"><div className="network-table-toolbar"><label className="network-search-label">Buscar revenda<input type="search" value={childQuery} onChange={event => setChildQuery(event.target.value)} placeholder="Nome ou e-mail"/></label><span>{formatAmount(network.childrenTotal ?? directChildren.length)} revendas no total</span></div>
              {filteredChildren.length ? <div className="network-table-scroll"><table className="network-table"><thead><tr><th>Revenda</th><th>Situação</th><th>Tipo</th><th>Equipe</th><th>Ações</th></tr></thead><tbody>
                {filteredChildren.map(child => <tr key={child.id}><td data-label="Revenda"><strong>{child.name}</strong><small>{child.contact_email}</small></td><td data-label="Situação"><span className={`network-status ${child.status === "active" ? "is-active" : "is-inactive"}`}>{child.status === "active" ? "Ativo" : child.status === "suspended" ? "Suspenso" : child.status}</span></td>
                  <td data-label="Tipo">{child.distribution_role === "master" ? "Submaster" : "Revenda"}</td><td data-label="Equipe">{formatAmount(child.children_count || 0)}</td>
                  <td data-label="Ações"><div className="network-row-actions">{canInvite && <button type="button" className="btn sm" onClick={() => { setChildId(child.id); changeSection("permissoes"); }}>Recursos</button>}
                    {canInvite && child.distribution_role !== "master" && network.policy?.canPromote && <button type="button" className="btn sm" disabled={busy || child.status !== "active"} onClick={() => promote(child)}>Promover</button>}
                    {canInvite && child.status === "suspended" && child.status_reason === "Aguardando aprovação do cadastro" && <button type="button" className="btn sm" disabled={busy} onClick={() => window.confirm(`Recusar o cadastro de ${child.name}? A conta será preservada.`) && changeChild(child.id, "reject")}>Recusar</button>}
                    {canInvite && (child.status === "suspended" ? <button type="button" className="btn sm" disabled={busy} onClick={() => changeChild(child.id, "approve")}>Aprovar</button> : <button type="button" className="btn sm" disabled={busy} onClick={() => window.confirm(`Suspender ${child.name}?`) && changeChild(child.id, "suspend")}>Suspender</button>)}</div></td></tr>)}
              </tbody></table></div> : <EmptyState title="Nenhuma revenda encontrada" description={directChildren.length ? "Tente pesquisar por outro nome ou e-mail." : "Crie um convite para começar sua rede."} action={canInvite ? <button className="btn primary" onClick={() => changeSection("convites")}>Criar convite</button> : null}/>}
              {(network.childrenTotal || 0) > (network.childrenPageSize || 50) && <div className="network-pagination"><button className="btn sm" disabled={childPage <= 1} onClick={() => setChildPage(p => p - 1)}>Anterior</button><span>Página {childPage} de {Math.ceil(network.childrenTotal / (network.childrenPageSize || 50))}</span><button className="btn sm" disabled={childPage * (network.childrenPageSize || 50) >= network.childrenTotal} onClick={() => setChildPage(p => p + 1)}>Próxima</button></div>}
            </div>
          </section>}

          {active === "convites" && <section className="network-section-body">
            <SectionHeading eyebrow="CRESCIMENTO DA REDE" title="Convidar revendas" description="Envie um link para que a pessoa faça o próprio cadastro e seja vinculada à sua rede."/>
            <div className="network-grid-two"><div className="network-panel"><h3>Gerar convite</h3><p className="network-description">Campos vazios significam sem limite comercial ou sem vencimento.</p>
              <form className="network-form" onSubmit={createInvite}><label>Número máximo de cadastros (opcional)<input type="number" min="1" value={inviteUses} onChange={event => setInviteUses(event.target.value)} placeholder="Sem limite"/></label><label>Validade em dias (opcional)<input type="number" min="1" value={inviteDays} onChange={event => setInviteDays(event.target.value)} placeholder="Sem vencimento"/></label><button className="btn primary" type="submit" disabled={busy}>Gerar link de convite</button></form>
              {newLink && <div className="network-invite-result"><strong>Convite criado!</strong><label>Link para compartilhar<input readOnly value={newLink} onFocus={event => event.target.select()}/></label><div className="network-inline-actions"><button className="btn primary" type="button" onClick={copyLink}>Copiar link</button><a className="btn" href={waInvite(newLink, network.account?.name)} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a></div><small>Por segurança, o link completo só aparece durante a criação.</small></div>}
            </div><div className="network-panel"><h3>Como funciona?</h3><ol className="network-steps"><li><strong>Crie o convite.</strong><span>Defina as restrições apenas se desejar.</span></li><li><strong>Compartilhe o link.</strong><span>Envie pelo WhatsApp ou outro canal seguro.</span></li><li><strong>Revenda cadastrada.</strong><span>A conta aparece na sua rede, seguindo as regras de autorização.</span></li></ol></div></div>
            <div className="network-panel"><h3>Convites recentes</h3>{invites.length ? <div className="network-invite-list">{invites.map(invite => <div key={invite.id} className="network-invite-row"><div><strong>{invite.revokedAt ? "Revogado" : "Ativo"}</strong><small>{describeInvite(invite)}</small></div>{!invite.revokedAt && <button type="button" className="btn sm" disabled={busy} onClick={() => window.confirm("Revogar este convite? Ele deixará de aceitar novos cadastros.") && execute(() => api(`/partner/network/invites/${invite.id}/revoke`, { method: "POST" }), "Convite revogado.")}>Revogar</button>}</div>)}</div> : <EmptyState icon="plus" title="Nenhum convite recente" description="Os convites criados aparecerão aqui."/>}</div>
          </section>}

          {active === "hierarquia" && <section className="network-section-body">
            <SectionHeading eyebrow="ESTRUTURA COMERCIAL" title="Hierarquia da rede" description="Veja Masters, Submasters e revendas por nível de relacionamento."/>
            <section className="network-stats"><Stat icon="users" label="Revendas totais" value={summary ? formatAmount(summary.resellers) : "—"}/><Stat icon="shield" label="Submasters" value={summary ? formatAmount(summary.submasters) : "—"}/><Stat icon="tv" label="Ativações na rede" value={summary ? formatAmount(summary.activeActivations) : "—"}/><Stat icon="box" label="Estoque na rede" value={summary ? formatAmount(summary.stockUnits) : "—"}/></section>
            <div className="network-panel"><h3>Árvore da rede</h3><p className="network-description">Participantes abaixo da sua conta. O recuo representa a profundidade.</p>
              {tree.length ? <ul className="network-tree">{tree.map(entry => <li key={entry.id} style={{"--network-depth":Math.min(Number(entry.depth) || 0, 7)}}><span className="network-tree-icon"><Icon name={entry.distributionRole === "master" ? "shield" : "users"} size={17}/></span><span><strong>{entry.name}</strong><small>{entry.distributionRole === "master" ? "Submaster" : "Revenda"}</small></span><span className={`network-status ${entry.status === "active" ? "is-active" : "is-inactive"}`}>{entry.status}</span></li>)}</ul> : <EmptyState title="Nenhum participante encontrado" description="A hierarquia será exibida quando houver revendas na sua rede."/>}
              {treeTotal > 100 && <div className="network-pagination"><button className="btn sm" disabled={treePage <= 1} onClick={() => setTreePage(p => p - 1)}>Anterior</button><span>Página {treePage} de {Math.ceil(treeTotal / 100)}</span><button className="btn sm" disabled={treePage * 100 >= treeTotal} onClick={() => setTreePage(p => p + 1)}>Próxima</button></div>}
            </div>
          </section>}

          {active === "permissoes" && <section className="network-section-body">
            <SectionHeading eyebrow="CONTROLE DE ACESSO" title="Recursos das revendas" description="Defina quais módulos as revendas diretas podem utilizar, sem ultrapassar os direitos da sua própria conta."/>
            <div className="network-panel"><label className="network-select-label">Selecione a revenda<select value={childId} onChange={event => setChildId(event.target.value)}><option value="">Escolha uma revenda</option>{directChildren.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>
              {!childId ? <EmptyState icon="shield" title="Escolha uma revenda" description="Selecione uma conta para consultar e modificar seus recursos."/> : !childResources ? <div role="status" className="network-loading">Carregando permissões…</div> : <div className="network-resources"><div className="network-resource-title"><h3>{selectedChild?.name || "Revenda selecionada"}</h3><p>As opções indisponíveis são controladas pelo seu contrato ou pelo Superadmin.</p></div>
                {Object.entries(RESOURCE_LABELS).map(([key, label]) => <label className="network-resource" key={key}><span>{label}</span><span className="network-switch"><input type="checkbox" disabled={busy || resources?.effective?.[key]?.enabled === false} checked={childResources.direct?.[key]?.enabled !== false} onChange={event => updateResource(key, event.target.checked, childResources.direct?.[key]?.limit ?? null)}/><span>Habilitado</span></span></label>)}</div>}
            </div>
          </section>}

          {active === "comissoes" && <section className="network-section-body">
            <SectionHeading eyebrow="RESULTADOS DA REDE" title="Comissões" description="Configure percentuais autorizados e consulte os créditos recebidos por vendas confirmadas."/>
            <div className="network-grid-two"><div className="network-panel"><h3>Configurar percentual</h3><p className="network-description">O Superadmin determina o teto máximo e o financiamento da comissão.</p>
              <form className="network-form" onSubmit={updateCommission}><label>Revenda direta<select required value={commissionChild} onChange={event => setCommissionChild(event.target.value)}><option value="">Selecione a revenda</option>{directChildren.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label><label>Comissão (%)<input required type="number" min="0" max="100" step="0.01" value={commissionRate} onChange={event => setCommissionRate(event.target.value)}/></label><button className="btn primary" type="submit" disabled={busy || !commissionChild}>Salvar comissão</button></form>
            </div><div className="network-panel"><h3>Resumo de comissões</h3><div className="network-big-number">{formatAmount(myCommissions.reduce((sum, item) => sum + Number(item.credits || 0), 0))}</div><p>Créditos listados como comissões recebidas.</p><small>A geração depende de vendas elegíveis e políticas previamente configuradas.</small></div></div>
            <div className="network-panel"><h3>Histórico de comissões</h3>{myCommissions.length ? <div className="network-table-scroll"><table className="network-table"><thead><tr><th>Venda</th><th>Créditos</th><th>Percentual</th></tr></thead><tbody>{myCommissions.map(item => <tr key={item.id}><td data-label="Venda">{String(item.saleId).slice(0, 12)}…</td><td data-label="Créditos">{formatAmount(item.credits)}</td><td data-label="Percentual">{(Number(item.basisPoints || 0) / 100).toFixed(2)}%</td></tr>)}</tbody></table></div> : <EmptyState icon="coin" title="Nenhuma comissão recebida" description="As comissões confirmadas aparecerão aqui quando houver vendas elegíveis."/>}</div>
          </section>}

          {active === "licencas" && <section className="network-section-body">
            <SectionHeading eyebrow="OPERAÇÕES COMERCIAIS" title="Licenças da rede" description="Uma única central para vender, comprar por Pix ou créditos e registrar entregas autorizadas."/>
            <LicenseTrading go={go}/>
            {/* A mesma implementação pode ser aberta também pela área principal de Licenças. */}
            <button type="button" className="network-text-link" onClick={() => go?.('vender-licencas')}>Abrir a central de licenças no painel principal <Icon name="arrow-right" size={16}/></button>
          </section>}

          {active === "assinatura" && <section className="network-section-body">
            <SectionHeading eyebrow="SUA CONTA COMERCIAL" title="Assinatura de acesso" description="Consulte seu contrato comercial DeltaTV e os recursos vinculados à sua conta."/>
            <div className="network-grid-two"><div className="network-panel"><h3>Contrato atual</h3>{contract ? <dl className="network-details"><div><dt>Plano</dt><dd>{contract.planName}</dd></div><div><dt>Modalidade</dt><dd>{contract.billingMode}</dd></div><div><dt>Situação</dt><dd>{contract.state}</dd></div><div><dt>Ativações incluídas</dt><dd>{contract.includedSlots ?? "Sem limite comercial"}</dd></div></dl> : <EmptyState icon="wallet" title="Contrato DeltaTV 3.0 não encontrado" description="Sua configuração comercial anterior continua válida."/>}</div>
              <div className="network-panel"><h3>Regras de operação</h3><p>As condições comerciais são definidas pelo Superadmin e pelo contrato em vigor. Este painel mostra informações da assinatura, mas não modifica automaticamente suas licenças existentes.</p>
                <p>Se você precisa consultar cobranças ou pagamentos, utilize a central Financeira do painel principal.</p><button type="button" className="btn" onClick={() => go("financeiro")}>Abrir Financeiro</button></div></div>
            {master && !network.account?.parentPartnerId && <div className="network-panel"><h3>Emissão própria de licenças</h3><p>Se autorizada pelo Superadmin, a emissão exige créditos suficientes e fica em Licenças → Estoque. Essa permissão não é concedida a Submasters.</p><button type="button" className="btn" onClick={() => go("estoque")}>Consultar estoque e emissão</button></div>}
          </section>}
        </>}
      </main>
    </div>
  </div>;
}
