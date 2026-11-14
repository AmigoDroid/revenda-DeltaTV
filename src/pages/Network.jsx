import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { usePortal } from "../portal.jsx";
import MasterPix from "./MasterPix.jsx";

const prettyMonths = (m) => `${m} ${m===1?"mês":"meses"}`;
const resourceLabels={servers:"Servidores IPTV",codes:"Códigos de ativação",devices:"Gerenciar TVs",clients:"Clientes",stock:"Estoque de licenças",credits:"Créditos e compras",web:"Player Web",white_label:"Aplicativos personalizados",remote:"Controle remoto"};
const makeKey=()=>crypto.randomUUID();
const waInvite=(url,name)=>`https://wa.me/?text=${encodeURIComponent(`Olá! Cadastre sua revenda DeltaTV na rede de ${name}: ${url}`)}`;
const optionalNumber=value=>value===""?null:Number(value);
const inviteDescription=i=>`${i.uses}/${i.maxUses==null?"sem limite":i.maxUses} cadastros · ${i.expiresAt?`vence ${new Date(i.expiresAt).toLocaleDateString("pt-BR")}`:"sem vencimento"}`;
export default function Network() {
  const {me}=usePortal();
  const [network,setNetwork]=useState(null),[prices,setPrices]=useState([]),[invites,setInvites]=useState([]),[sales,setSales]=useState([]),[resources,setResources]=useState(null),[tree,setTree]=useState([]),[summary,setSummary]=useState(null);
  const [errors,setErrors]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[newLink,setNewLink]=useState("");
  const [inviteUses,setInviteUses]=useState(""),[inviteDays,setInviteDays]=useState("");
  const [newOffer,setNewOffer]=useState({months:"12",priceCredits:"10"});
  const [order,setOrder]=useState({months:"",quantity:"1"});
  const [childId,setChildId]=useState(null),[childResources,setChildResources]=useState(null);
  const [childPage,setChildPage]=useState(1),[treePage,setTreePage]=useState(1),[treeTotal,setTreeTotal]=useState(0);
  // An uncertain checkout remains attached to its original UUID, even after page reload.
  const [pendingPurchase,setPendingPurchase]=useState(null),[purchaseCheckedEmpty,setPurchaseCheckedEmpty]=useState(false);
  const purchaseInFlight=useRef(false);
  const purchaseStorageKey=network?.account?.id?`delta-network-checkout:${network.account.id}`:null;
  const clearPurchase=()=>{if(purchaseStorageKey)sessionStorage.removeItem(purchaseStorageKey);setPendingPurchase(null);setPurchaseCheckedEmpty(false);};
  const reload=useCallback(async()=>{
    const [n,rs]=await Promise.all([api(`/partner/network?page=${childPage}&pageSize=50`),api("/partner/network/resources")]);
    setNetwork(n);setResources(rs);
    const key=`delta-network-checkout:${n.account.id}`;
    try {const cached=JSON.parse(sessionStorage.getItem(key)||"null");setPendingPurchase(cached?.key?cached:null);} catch {sessionStorage.removeItem(key);}
    if(n.account?.distributionRole==="master") {
      const requests={
        prices:n.policy.canSell?api("/partner/network/prices"):Promise.resolve({data:[]}),
        invites:n.policy.canInvite?api("/partner/network/invites"):Promise.resolve({data:[]}),
        sales:n.policy.canSell?api("/partner/network/sales"):Promise.resolve({data:[]}),
        tree:n.policy.canInvite?api(`/partner/network/tree?page=${treePage}&pageSize=100`):Promise.resolve({data:[],total:0}),
        summary:n.policy.canInvite?api("/partner/network/summary"):Promise.resolve(null),
      };
      const results=await Promise.allSettled(Object.values(requests));
      const value=(i,fallback)=>results[i].status==="fulfilled"?results[i].value:fallback;
      setPrices(value(0,{data:[]}).data||[]);setInvites(value(1,{data:[]}).data||[]);
      setSales(value(2,{data:[]}).data||[]);
      const treeResult=value(3,{data:[],total:0});setTree(treeResult.data||[]);setTreeTotal(treeResult.total||0);
      setSummary(value(4,null));
      const unexpected=results.find(r=>r.status==="rejected"&&r.reason?.status!==403);
      if(unexpected)setErrors(unexpected.reason?.message||"Não foi possível carregar parte da rede.");
    } else {setPrices([]);setInvites([]);setSales([]);setTree([]);setSummary(null);setTreeTotal(0);}
  },[childPage,treePage]);
  useEffect(()=>{reload().catch(e=>setErrors(e.message));},[reload]);
  useEffect(()=>{
    if(!childId||!network?.policy.canInvite) {setChildResources(null);return;}
    api(`/partner/network/children/${childId}/resources`).then(setChildResources).catch(e=>setErrors(e.message));
  },[childId,network?.policy.canInvite]);
  const run=async(fn,ok)=>{
    if(busy)return;
    setBusy(true);setErrors("");setMessage("");
    try { const result=await fn(); if(ok)setMessage(ok);await reload();return result; }
    catch(e){setErrors(e.message||"Não foi possível concluir.");return null;}
    finally{setBusy(false);}
  };
  if(!network)return <section className="card">{errors||"Carregando sua rede…"}</section>;
  const master=network.account.distributionRole==="master";
  const price=network.offers.find(p=>String(p.months)===String(order.months))||network.offers[0];
  const quantity=Number(order.quantity),total=(price?.priceCredits||0)*quantity;
  const creditOk=quantity>0&&Number.isSafeInteger(quantity)&&Number.isSafeInteger(total)&&total<=Number(network.creditBalance);
  const savePrice=()=>run(()=>api("/partner/network/prices",{method:"PUT",body:{months:Number(newOffer.months),priceCredits:Number(newOffer.priceCredits),active:true}}),"Preço salvo para as suas revendas.");
  const buy=async()=>{
    if(busy||purchaseInFlight.current)return;
    purchaseInFlight.current=true;
    const checkout=pendingPurchase||{key:makeKey(),months:Number(order.months||price?.months),quantity,
      expectedUnitPriceCredits:Number(price?.priceCredits)};
    if(!pendingPurchase){
      if(!Number.isSafeInteger(checkout.expectedUnitPriceCredits)||!checkout.expectedUnitPriceCredits){purchaseInFlight.current=false;return;}
      sessionStorage.setItem(purchaseStorageKey,JSON.stringify(checkout));setPendingPurchase(checkout);
    }
    setBusy(true);setErrors("");setMessage("");setPurchaseCheckedEmpty(false);
    try{
      await api("/partner/network/buy",{method:"POST",body:{months:checkout.months,
        quantity:checkout.quantity,expectedUnitPriceCredits:checkout.expectedUnitPriceCredits,idempotencyKey:checkout.key}});
      clearPurchase();setMessage("Compra confirmada. Créditos e estoque atualizados.");await reload();
    }catch(e){setErrors(`${e.message} A tentativa foi preservada; verifique antes de criar outra compra.`);}
    finally{purchaseInFlight.current=false;setBusy(false);}
  };
  const checkPurchase=async()=>{
    if(!pendingPurchase||busy)return;
    setBusy(true);setErrors("");
    try{
      const result=await api(`/partner/network/purchases/by-key/${pendingPurchase.key}`);
      if(result.purchase){clearPurchase();setMessage("Compra localizada no servidor: já foi concluída. Nenhum novo débito realizado.");await reload();}
      else{setPurchaseCheckedEmpty(true);setMessage("Compra ainda não localizada. Você pode repetir com a mesma identificação.");}
    }catch(e){setErrors(e.message);}
    finally{setBusy(false);}
  };
  const invite=async()=>{
    const r=await run(()=>api("/partner/network/invites",{method:"POST",body:{daysValid:optionalNumber(inviteDays),maxUses:optionalNumber(inviteUses)}}),"Link criado. Compartilhe com seus revendedores.");
    if(r)setNewLink(r.url);
  };
  const copyInvite=async()=>{
    try{await navigator.clipboard.writeText(newLink);setMessage("Link copiado. Agora envie para a pessoa que deseja cadastrar.");}
    catch{window.prompt("Copie o link para enviar:",newLink);}
  };
  const updateChild=async(id,verb)=>run(()=>api(`/partner/network/children/${id}/${verb}`,{method:"POST",body:{}}),verb==="approve"?"Cadastro aprovado.":"Revenda suspensa.");
  const promoteChild=async(id)=>{
    if(!window.confirm("Promover esta revenda a Submaster? Ela poderá criar uma rede subordinada dentro dos seus limites."))return;
    const p=network.policy;
    await run(()=>api(`/partner/network/children/${id}/promote`,{method:"POST",body:{policy:{
      canInvite:p.canInvite,canSell:p.canSell,canPromote:false,maxChildren:p.maxChildren,maxDepth:p.maxDepth,
    }}}),"Revenda promovida a Submaster.");
  };
  const updateResource=async(resource,enabled,limit)=>{
    const updated=await run(()=>api(`/partner/network/children/${childId}/resources`,{method:"PUT",body:{resource,enabled,limit}}),"Permissão atualizada.");
    if(updated)setChildResources(await api(`/partner/network/children/${childId}/resources`));
  };
  return <section style={{display:"grid",gap:16}}>
    <div className="card">
      <h2 style={{marginTop:0}}>Minha rede de revendas</h2>
      <p className="muted">{master?"Você pode convidar revendas, definir valores e acompanhar as vendas.":network.parent?`Sua revenda pertence à rede de ${network.parent.name}. Consulte as ofertas disponíveis abaixo.`:"Sua conta é uma revenda independente. Somente o Superadmin pode habilitar o modo Master."}</p>
      <div className="row" style={{gap:20,flexWrap:"wrap"}}><strong>{network.account.role}</strong><span>Créditos: <b>{network.creditBalance}</b></span><span>Licenças em estoque: <b>{network.stock.reduce((n,s)=>n+Number(s.quantity),0)}</b></span>{master&&<span>Revendas diretas: <b>{network.childrenTotal??network.children.length}</b></span>}</div>
      {errors&&<p role="alert" className="error">{errors}</p>}{message&&<p role="status" style={{color:"var(--ok)"}}>{message}</p>}
    </div>
    <MasterPix account={network.account} policy={network.policy} onChanged={()=>{reload().catch(()=>{});window.dispatchEvent(new Event("stock-changed"));}}/>
    {network.parent&&<div className="card">
      <h3>Comprar com créditos (opcional)</h3>
      <p className="muted">Esta é a modalidade antiga com créditos. Para pagar diretamente ao Master em reais, use a seção Pix acima.</p>
      {network.offers.length?<div className="row" style={{gap:12,alignItems:"end",flexWrap:"wrap"}}>
        <label>Duração<select disabled={!!pendingPurchase||busy} value={price?.months||""} onChange={e=>setOrder(v=>({...v,months:e.target.value}))}>{network.offers.map(p=><option key={p.months} value={p.months}>{prettyMonths(p.months)} — {p.priceCredits} créditos</option>)}</select></label>
        <label>Quantidade<input disabled={!!pendingPurchase||busy} type="number" min="1" value={order.quantity} onChange={e=>setOrder(v=>({...v,quantity:e.target.value}))}/></label>
        <strong>Total: {total} créditos</strong>
        <button className="btn primary" disabled={busy||(!pendingPurchase&&!creditOk)} onClick={()=>{if(pendingPurchase||window.confirm(`Comprar ${quantity} licença(s) por ${total} créditos?`))buy();}}>{pendingPurchase?"Repetir compra pendente":"Comprar licenças"}</button>
        {pendingPurchase&&<div role="status" style={{width:"100%",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span>Compra pendente: {pendingPurchase.quantity} × {prettyMonths(pendingPurchase.months)} por {pendingPurchase.expectedUnitPriceCredits} créditos cada.</span>
          <button className="btn" disabled={busy} onClick={checkPurchase}>Verificar no servidor</button>
          {purchaseCheckedEmpty&&<button className="btn" disabled={busy} onClick={()=>{if(window.confirm("A compra ainda não apareceu no servidor. Descartar esta tentativa pode permitir uma nova compra. Confirma?"))clearPurchase();}}>Descartar tentativa</button>}
        </div>}
        {!creditOk&&!pendingPurchase&&<span className="muted">Confira a quantidade e seu saldo.</span>}
      </div>:<p className="muted">Seu Master ainda não colocou licenças à venda.</p>}
    </div>}
    {master&&<>
      {summary&&<div className="card"><h3>Minha rede completa</h3><div className="row" style={{gap:18,flexWrap:"wrap"}}><span><b>{summary.resellers}</b> revendas na rede</span><span><b>{summary.submasters}</b> Submasters</span><span><b>{summary.activeActivations}</b> ativações</span><span><b>{summary.stockUnits}</b> licenças em estoque na rede</span></div>
       <details style={{marginTop:12}}><summary>Visualizar a hierarquia completa</summary><ul>{tree.map(t=><li key={t.id} style={{paddingLeft:Math.min(t.depth,10)*16}}>{t.distributionRole==="master"?"★ ":"• "}{t.name} — {t.status}</li>)}</ul>
         {treeTotal>100&&<div className="row" style={{gap:8}}><button className="btn sm" disabled={treePage<=1} onClick={()=>setTreePage(p=>p-1)}>Anterior</button><span>{treePage} / {Math.ceil(treeTotal/100)}</span><button className="btn sm" disabled={treePage*100>=treeTotal} onClick={()=>setTreePage(p=>p+1)}>Próxima</button></div>}
       </details>
      </div>}
      {master&&!network.policy.canInvite&&<div className="card"><h3>Convites não habilitados</h3><p className="muted">Sua conta é Master, mas o Superadmin ainda não ativou a permissão de convidar revendas. Peça para habilitar “Criar convites e aprovar revendas” em Rede de distribuição.</p></div>}
      {network.policy.canInvite&&<div className="card"><h3>Convidar revendedor</h3>
        <p className="muted">1. Gere seu convite. 2. Compartilhe pelo WhatsApp. 3. A pessoa faz o cadastro e entra automaticamente na sua rede com recursos básicos. Não precisa aprovar manualmente.</p>
        <div className="row" style={{gap:12,alignItems:"end",flexWrap:"wrap"}}>
          <label>Quantos cadastros (opcional)<input type="number" min="1" placeholder="Sem limite" value={inviteUses} onChange={e=>setInviteUses(e.target.value)}/></label>
          <label>Validade em dias (opcional)<input type="number" min="1" placeholder="Sem vencimento" value={inviteDays} onChange={e=>setInviteDays(e.target.value)}/></label>
          <button className="btn primary" disabled={busy||!network.policy.canInvite} onClick={invite}>Gerar link de convite</button>
        </div>
        {newLink&&<div style={{marginTop:12,display:"grid",gap:8}}>
          <label>Seu link de convite<input readOnly aria-label="Link para convidar revendas" value={newLink} onFocus={e=>e.target.select()} style={{width:"100%"}}/></label>
          <div className="row" style={{gap:8,flexWrap:"wrap"}}><button className="btn primary" onClick={copyInvite}>Copiar link</button>
          <a className="btn" href={waInvite(newLink,network.account.name)} target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a></div>
        </div>}
        <p className="muted" style={{marginTop:10}}>Por segurança, o link completo só aparece na criação. Para convidar outra pessoa depois, gere um novo link.</p>
        {invites.length>0&&<details style={{marginTop:12}}><summary>Convites recentes ({invites.length})</summary><ul>{invites.map(i=><li key={i.id}>{inviteDescription(i)} {i.revokedAt?"— revogado":<button className="btn sm" disabled={busy} onClick={()=>run(()=>api(`/partner/network/invites/${i.id}/revoke`,{method:"POST"}),"Convite revogado.")}>Revogar</button>}</li>)}</ul></details>}
      </div>}
      {network.policy.canSell&&<div className="card"><h3>Preços para as minhas revendas</h3><p className="muted">Defina o preço em créditos de cada duração. A venda sai do seu estoque e os créditos entram na sua carteira.</p>
        <div className="row" style={{gap:12,alignItems:"end",flexWrap:"wrap"}}><label>Meses<input type="number" min="1" max="120" value={newOffer.months} onChange={e=>setNewOffer(v=>({...v,months:e.target.value}))}/></label><label>Preço em créditos<input type="number" min="1" value={newOffer.priceCredits} onChange={e=>setNewOffer(v=>({...v,priceCredits:e.target.value}))}/></label><button className="btn primary" disabled={busy||!network.policy.canSell} onClick={savePrice}>Salvar preço</button></div>
        {prices.length>0&&<table style={{width:"100%",marginTop:12}}><thead><tr><th>Duração</th><th>Preço</th><th>Estado</th><th></th></tr></thead><tbody>{prices.map(p=><tr key={p.months}><td>{prettyMonths(p.months)}</td><td>{p.priceCredits} créditos</td><td>{p.active?"Ativo":"Pausado"}</td><td><button className="btn sm" disabled={busy} onClick={()=>run(()=>api("/partner/network/prices",{method:"PUT",body:{months:p.months,priceCredits:p.priceCredits,active:!p.active}}),"Oferta atualizada.")}>{p.active?"Pausar":"Ativar"}</button></td></tr>)}</tbody></table>}
      </div>}
      {network.policy.canInvite&&<div className="card"><h3>Revendas da minha rede</h3>
        {network.children.length?<div className="table-wrap"><table><thead><tr><th>Nome</th><th>Situação</th><th>Equipe</th><th>Ações</th></tr></thead><tbody>{network.children.map(c=><tr key={c.id}><td>{c.name}<div className="muted">{c.contact_email}</div></td><td>{c.status}</td><td>{c.distribution_role==="master"?"Submaster":"Revenda"} · {c.children_count} abaixo</td><td><button className="btn sm" onClick={()=>setChildId(c.id)}>Recursos</button>{c.distribution_role!=="master"&&network.policy.canPromote&&<button className="btn sm" disabled={busy||c.status!=="active"} onClick={()=>promoteChild(c.id)}>Promover a Submaster</button>}{c.status==="suspended"&&c.status_reason==="Aguardando aprovação do cadastro"&&<button className="btn sm" disabled={busy} onClick={()=>window.confirm("Recusar o cadastro e liberar a vaga desta revenda? A conta não será apagada.")&&updateChild(c.id,"reject")}>Recusar</button>}{c.status==="suspended"?<button className="btn sm" disabled={busy} onClick={()=>updateChild(c.id,"approve")}>Aprovar</button>:<button className="btn sm" disabled={busy} onClick={()=>updateChild(c.id,"suspend")}>Suspender</button>}</td></tr>)}</tbody></table></div>:<p className="muted">Nenhuma revenda vinculada. Compartilhe seu convite.</p>}
        {(network.childrenTotal||0)>network.childrenPageSize&&<div className="row" style={{gap:8,marginTop:10}}>
          <button className="btn sm" disabled={childPage<=1} onClick={()=>setChildPage(p=>p-1)}>Anterior</button>
          <span>Página {childPage} de {Math.ceil(network.childrenTotal/network.childrenPageSize)}</span>
          <button className="btn sm" disabled={childPage*network.childrenPageSize>=network.childrenTotal} onClick={()=>setChildPage(p=>p+1)}>Próxima</button>
        </div>}
      </div>}
      {network.policy.canInvite&&childResources&&<div className="card"><h3>Recursos da revenda selecionada</h3><p className="muted">Você só pode conceder recursos disponíveis na sua própria conta.</p>{Object.entries(resourceLabels).map(([key,label])=><div key={key} className="row" style={{alignItems:"center",justifyContent:"space-between",marginBottom:8}}><span>{label}</span><label><input type="checkbox" checked={childResources.direct[key]?.enabled!==false} disabled={busy||resources?.effective[key]?.enabled===false} onChange={e=>updateResource(key,e.target.checked,childResources.direct[key]?.limit??null)}/> Habilitado</label></div>)}<button className="btn sm" onClick={()=>{setChildId(null);setChildResources(null);}}>Fechar</button></div>}
      {network.policy.canSell&&<div className="card"><h3>Vendas recentes</h3>{sales.length?<div className="table-wrap"><table><thead><tr><th>Revenda</th><th>Licenças</th><th>Créditos recebidos</th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td>{s.counterpartyName}</td><td>{s.quantity} × {prettyMonths(s.months)}</td><td>{s.totalCredits}</td></tr>)}</tbody></table></div>:<p className="muted">Ainda não há vendas nesta rede.</p>}</div>}
    </>}
  </section>;
}
