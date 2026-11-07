import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import "./help-experience.css";

const PAGES = {
  content: { home: "overview", help: "help", profile: "account", servers: "servers", codes: "codes", devices: "devices", licenses: "licenses", billing: "billing", studio: "studio", apps: "white-label", notifications: "notifications" },
  reseller: { home: "inicio", help: "ajuda", profile: "conta", servers: "servidores", codes: "codigos", devices: "dispositivos", licenses: "licencas", billing: "financeiro", studio: "white-label", apps: "white-label", notifications: "notificacoes" },
};
const friendly = { home: "Início", help: "Ajuda", profile: "Minha conta", servers: "Servidores", codes: "Códigos", devices: "Dispositivos", licenses: "Licenças", billing: "Financeiro", studio: "Estúdio Visual", apps: "Aplicativos", notifications: "Notificações", "add-server": "Adicionar servidor", "new-code": "Novo código", "search-device": "Buscar MAC" };
const shortText = (body) => String(body || "").split(/\n+/).filter(Boolean);
const progressPercent = (article, progress) => progress?.completedAt ? 100 : progress ? Math.round((Math.min((progress.stepIndex || 0), Math.max(0, (article.steps || []).length - 1)) / Math.max(1, article.steps?.length || 1)) * 100) : 0;

export default function HelpExperience({ screen, portal = "content", userId, onNavigate }) {
  const pages = PAGES[portal] || PAGES.content;
  const helpScreen = pages.help;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [welcome, setWelcome] = useState(false);
  const [tour, setTour] = useState(null);
  const [focusRect, setFocusRect] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const result = await api("/partner/help");
    setData(result);
    return result;
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setData(null); setTour(null); setSelected(null); setWelcome(false);
    api("/partner/help").then((result) => {
      if (!active) return;
      setData(result);
      const starter = result.data?.find((a) => a.isOnboarding && a.slug === "primeiros-passos") || result.data?.find((a) => a.isOnboarding);
      if (!result.welcomeSeenAt && starter) setWelcome(true);
    }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  const articles = data?.data || [];
  const progressMap = useMemo(() => Object.fromEntries((data?.progress || []).map(p => [p.articleId, p])), [data]);
  const selectedArticle = articles.find(a => a.id === selected);
  const categories = useMemo(() => ["Todos", ...new Set(articles.map(a => a.category))], [articles]);
  const filtered = articles.filter(a => (category === "Todos" || category === a.category) && `${a.title} ${a.summary} ${a.category} ${a.body}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const currentStep = tour?.article?.steps?.[tour.index] || null;

  const markWelcome = async () => {
    setWelcome(false);
    setData(d => d ? { ...d, welcomeSeenAt: d.welcomeSeenAt || new Date().toISOString() } : d);
    try { await api("/partner/help/welcome-seen", { method: "POST" }); }
    catch (e) { setError(`Não foi possível salvar a preferência de boas-vindas: ${e.message}`); }
  };
  const saveProgress = async (article, stepIndex, completed = false) => {
    try {
      const value = await api(`/partner/help/${article.id}/progress`, { method: "PUT", body: { stepIndex, completed } });
      setData(d => d ? { ...d, progress: [...(d.progress || []).filter(p => p.articleId !== article.id), value] } : d);
    } catch (e) { setError(`Falha ao registrar o progresso: ${e.message}`); }
  };
  const begin = async (article) => {
    if (!article) return;
    setError(""); setWelcome(false);
    const stored = progressMap[article.id];
    const index = stored?.completedAt ? 0 : Math.min(stored?.stepIndex || 0, Math.max(0, (article.steps || []).length - 1));
    if (article.steps?.length) {
      setTour({ article, index });
      void saveProgress(article, index, false);
    } else {
      await saveProgress(article, 0, true);
      setSelected(article.id);
      onNavigate(helpScreen);
    }
  };
  const advance = async (direction) => {
    if (!tour || busy) return;
    setBusy(true);
    try {
      const next = tour.index + direction;
      if (next >= tour.article.steps.length) {
        await saveProgress(tour.article, tour.article.steps.length - 1, true);
        setTour(null); setFocusRect(null);
      } else if (next >= 0) {
        setTour(t => ({ ...t, index: next }));
        void saveProgress(tour.article, next, false);
      }
    } finally { setBusy(false); }
  };
  const exitTour = () => { setTour(null); setFocusRect(null); };

  useEffect(() => {
    if (!currentStep) return undefined;
    const targetScreen = pages[currentStep.screen || currentStep.target];
    if (targetScreen && targetScreen !== screen) onNavigate(targetScreen);
    return undefined;
  }, [currentStep, screen, pages, onNavigate]);
  useEffect(() => {
    if (!currentStep) return undefined;
    let raf1, raf2;
    const place = () => {
      const target = currentStep.target ? document.querySelector(`[data-help-target="${currentStep.target}"]`) : null;
      if (!target) { setFocusRect(null); return; }
      const rect = target.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || rect.bottom < 0 || rect.top > window.innerHeight) { setFocusRect(null); return; }
      setFocusRect({ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10 });
    };
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(place); });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [currentStep, screen]);
  useEffect(() => {
    if (!tour && !welcome) return undefined;
    const esc = (e) => { if (e.key === "Escape") { if (tour) exitTour(); else void markWelcome(); } };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [tour, welcome]);
  useEffect(() => {
    const handler = (event) => {
      const logical = Object.entries(pages).find(([, route]) => route === event.detail?.screen)?.[0];
      const relevant = articles.find(a => a.steps?.some(step => step.screen === logical || step.target === logical));
      setCategory("Todos"); setSearch(""); setSelected(relevant?.id || null); onNavigate(helpScreen);
    };
    window.addEventListener("deltatv-help-context", handler);
    return () => window.removeEventListener("deltatv-help-context", handler);
  }, [helpScreen, onNavigate, articles, pages]);

  return <>
    {screen === helpScreen && <section className="help15-center" aria-label="Central de Ajuda">
      <div className="help15-hero"><span className="help15-overline">CENTRAL DE APRENDIZADO</span><h2>Como podemos ajudar?</h2><p>Aprenda a usar o painel com guias rápidos, tutoriais interativos e instruções por assunto.</p><div className="help15-search"><span aria-hidden="true">⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por assunto ou funcionalidade" aria-label="Buscar tutoriais" /></div></div>
      {error && <p role="alert" className="help15-error">{error} <button type="button" onClick={() => { setError(""); void reload().catch(e => setError(e.message)); }}>Tentar novamente</button></p>}
      {loading ? <p>Carregando tutoriais…</p> : !data ? <p>Não foi possível carregar a Central de Ajuda.</p> : <>
        <div className="help15-categories">{categories.map(c => <button key={c} type="button" className={category === c ? "active" : ""} onClick={() => { setCategory(c); setSelected(null); }}>{c}</button>)}</div>
        {selectedArticle && <article className="help15-reader" id="help15-reader"><div className="help15-reader-title"><div><span className="help15-overline">GUIA DE APRENDIZADO</span><h3>{selectedArticle.title}</h3></div><button type="button" onClick={() => setSelected(null)} aria-label="Fechar leitura">×</button></div>
          {selectedArticle.imageUrl && <img loading="lazy" alt={`Ilustração do guia ${selectedArticle.title}`} src={selectedArticle.imageUrl} />}
          {shortText(selectedArticle.body).map((p, i) => <p key={i}>{p}</p>)}
          {selectedArticle.videoUrl && <p><a href={selectedArticle.videoUrl} target="_blank" rel="noopener noreferrer">▶ Assistir ao vídeo do tutorial</a></p>}
          {selectedArticle.steps?.length > 0 && <button type="button" className="help15-primary" onClick={() => begin(selectedArticle)}>Iniciar passo a passo</button>}
        </article>}
        <div className="help15-grid">{filtered.map(article => { const progress = progressMap[article.id]; return <article key={article.id} className={`help15-card ${selected === article.id ? "help15-active" : ""}`}>
          <div className="help15-kicker"><span>{article.category}</span>{progress?.completedAt && <span className="help15-done">✓ Concluído</span>}</div>
          <h3>{article.title}</h3><p>{article.summary}</p>
          {progress && <div className="help15-progress" aria-label={`Progresso ${progressPercent(article, progress)}%`}><div style={{ width: `${progressPercent(article, progress)}%` }}/></div>}
          <div className="help15-actions"><button type="button" onClick={() => setSelected(s => s === article.id ? null : article.id)}>{selected === article.id ? "Fechar" : "Ler guia"}</button><button type="button" className="help15-primary" onClick={() => begin(article)}>{article.steps?.length ? (progress && !progress.completedAt ? "Continuar tutorial" : "Iniciar tutorial") : "Concluir leitura"}</button></div>
        </article>; })}</div>
        {!filtered.length && <div className="help15-empty">Nenhum guia encontrado com esses filtros.</div>}

      </>}
    </section>}
    {welcome && <div className="help15-modal-cover" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="help15-welcome-title" className="help15-welcome">
      <span className="help15-overline">BEM-VINDO AO DELTATV</span><div className="help15-welcome-icon" aria-hidden="true">?</div>
      <h2 id="help15-welcome-title">Conheça sua plataforma</h2><p>Um guia rápido vai mostrar onde estão as funções principais. Você pode pular agora e recomeçar quando quiser na Central de Ajuda.</p>
      <div className="help15-actions"><button type="button" onClick={() => void markWelcome()}>Agora não</button><button type="button" className="help15-primary" onClick={() => { const starter = articles.find(a => a.slug === "primeiros-passos") || articles.find(a => a.isOnboarding); void markWelcome(); void begin(starter); }}>Começar tour</button></div>
    </section></div>}
    {tour && currentStep && <div className="help15-tour" role="dialog" aria-modal="true" aria-label="Tutorial guiado">
      <div className="help15-tour-scrim" style={focusRect ? { background: "transparent" } : undefined}/>
      {focusRect && <div className="help15-highlight" style={focusRect} aria-hidden="true" />}
      <div className="help15-tour-popover"><div className="help15-tour-progress"><span>TUTORIAL · {tour.index + 1} / {tour.article.steps.length}</span><button type="button" onClick={exitTour} aria-label="Sair do tutorial">×</button></div>
        <h3>{currentStep.title}</h3><p>{currentStep.body}</p>
        {currentStep.target && <p className="help15-location">📍 {friendly[currentStep.target] || "Navegação"}</p>}
        <div className="help15-actions"><button type="button" onClick={exitTour}>Sair</button>{tour.index > 0 && <button type="button" onClick={() => void advance(-1)}>Anterior</button>}<button type="button" className="help15-primary" disabled={busy} onClick={() => void advance(1)}>{tour.index === tour.article.steps.length - 1 ? "Concluir" : "Próxima etapa"}</button></div>
      </div>
    </div>}
  </>;
}
