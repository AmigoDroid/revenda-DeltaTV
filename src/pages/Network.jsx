import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { usePortal } from "../portal.jsx";

const resourceLabels={servers:"Servidores IPTV",codes:"Códigos de ativação",devices:"Gerenciar TVs",clients:"Clientes",stock:"Estoque de licenças",credits:"Créditos e compras",web:"Player Web",white_label:"Aplicativos personalizados",remote:"Controle remoto"};
const waInvite=(url,name)=>`https://wa.me/?text=${encodeURIComponent(`Olá! Cadastre sua revenda DeltaTV na rede de ${name}: ${url}`)}`;
const optionalNumber=value=>value===""?null:Number(value);
const inviteDescription=i=>`${i.uses}/${i.maxUses==null?"sem limite":i.maxUses} cadastros · ${i.expiresAt?`vence ${new Date(i.expiresAt).toLocaleDateString("pt-BR")}`:"sem vencimento"}`;
export default function Network({go}) {
  const {me}=usePortal();
  const [commissionRate,setCommissionRate]=useState("0"),[commissionChild,setCommissionChild]=useState("");
  const [myCommissions,setMyCommissions]=useState([]),[mySaas,setMySaas]=useState([]);
  const [network,setNetwork]=useState(null),[invites,setInvites]=useState([]),[resources,setResources]=useState(null),[tree,setTree]=useState([]),[summary,setSummary]=useState(null);
  const [errors,setErrors]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[newLink,setNewLink]=useState("");
  const [inviteUses,setInviteUses]=useState(""),[inviteDays,setInviteDays]=useState("");
  const [childId,setChildId]=useState(null),[childResources,setChildResources]=useState(null);
  const [childPage,setChildPage]=useState(1),[treePage,setTreePage]=useState(1),[treeTotal,setTreeTotal]=useState(0);
  const reload=useCallback(async()=>{
    const [n,rs]=await Promise.all([api(`/partner/network?page=${childPage}&pageSize=50`),api("/partner/network/resources")]);
    setNetwork(n);setResources(rs);
    Promise.allSettled([api("/partner/commerce/commissions"),api("/partner/commerce/master-contract")]).then(r=>{
      if(r[0].status==="fulfilled")setMyCommissions(r[0].value.data||[]);
      if(r[1].status==="fulfilled")setMySaas(r[1].value.data||[]);
    });
    if(n.account?.distributionRole==="master") {
      const requests={
        invites:n.policy.canInvite?api("/partner/network/invites"):Promise.resolve({data:[]}),
        tree:n.policy.canInvite?api(`/partner/network/tree?page=${treePage}&pageSize=100`):Promise.resolve({data:[],total:0}),
        summary:n.policy.canInvite?api("/partner/network/summary"):Promise.resolve(null),
      };
      const results=await Promise.allSettled(Object.values(requests));
      const value=(i,fallback)=>results[i].status==="fulfilled"?results[i].value:fallback;
      setInvites(value(0,{data:[]}).data||[]);
      const treeResult=value(1,{data:[],total:0});setTree(treeResult.data||[]);setTreeTotal(treeResult.total||0);
      setSummary(value(2,null));
      const unexpected=results.find(r=>r.status==="rejected"&&r.reason?.status!==403);
      if(unexpected)setErrors(unexpected.reason?.message||"Não foi possível carregar parte da rede.");
    } else {setInvites([]);setTree([]);setSummary(null);setTreeTotal(0);}
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
      <p className="muted">{master?"Você pode convidar revendas e administrar a hierarquia. Vendas e preços ficam na central de Licenças.":network.parent?`Sua revenda pertence à rede de ${network.parent.name}. As compras de licenças ficam na central comercial.`:"Sua conta é uma revenda independente. Somente o Superadmin pode habilitar o modo Master."}</p>
      <div className="row" style={{gap:20,flexWrap:"wrap"}}><strong>{network.account.role}</strong><span>Créditos: <b>{network.creditBalance}</b></span><span>Licenças em estoque: <b>{network.stock.reduce((n,s)=>n+Number(s.quantity),0)}</b></span>{master&&<span>Revendas diretas: <b>{network.childrenTotal??network.children.length}</b></span>}</div>
      {errors&&<p role="alert" className="error">{errors}</p>}{message&&<p role="status" style={{color:"var(--ok)"}}>{message}</p>}
    </div>
    <div className="card"><h3>Assinatura de acesso ao DeltaTV</h3>
      {mySaas.length?<><strong>{mySaas[0].planName}</strong><p className="muted">Modelo: {mySaas[0].billingMode} · Estado comercial: {mySaas[0].state} · Ativações incluídas: {mySaas[0].includedSlots??"Sem limite"}.</p></>:
       <p className="muted">Nenhum novo contrato comercial DeltaTV 3.0 cadastrado. Seu plano anterior permanece válido.</p>}
      <p className="muted" style={{fontSize:12}}>Os contratos comerciais desta versão não modificam automaticamente seu acesso ou as licenças já ativas.</p>
    </div>
    {master&&!network.account.parentPartnerId&&<div className="card">
      <h3>Emissão própria de licenças</h3>
      <p className="muted">O Master principal autorizado pelo Superadmin pode emitir licenças no seu estoque. A emissão e o histórico ficam concentrados em Licenças → Estoque.</p>
      <button type="button" className="btn primary" onClick={()=>go?.("estoque")}>Abrir estoque e emissão</button>
    </div>}
    {master&&network.policy.canSell&&<div className="card"><h3>Comissões da minha rede</h3>
      <p className="muted">Configure o percentual em créditos de uma venda realizada por uma revenda direta. O Superadmin determina o teto máximo e a comissão é financiada pelos créditos da venda confirmada.</p>
      <form onSubmit={e=>{e.preventDefault();run(()=>api(`/partner/commerce/commissions/children/${commissionChild}`,{
        method:"PUT",body:{basisPoints:Math.round(Number(commissionRate)*100)}
      }),"Percentual de comissão configurado.");}} className="row" style={{gap:10,alignItems:"end",flexWrap:"wrap"}}>
        <label>Revenda direta<select required value={commissionChild} onChange={e=>setCommissionChild(e.target.value)}><option value="">Selecione…</option>
          {network.children.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select></label>
        <label>Minha comissão (%)<input required type="number" min="0" max="100" step="0.01" value={commissionRate} onChange={e=>setCommissionRate(e.target.value)}/></label>
        <button type="submit" className="btn primary" disabled={busy||!commissionChild}>Salvar percentual</button>
      </form>
      <h4>Comissões recebidas</h4>{myCommissions.length?<div className="table-wrap"><table><thead><tr><th>Venda</th><th>Créditos</th><th>Percentual</th></tr></thead><tbody>
        {myCommissions.map(c=><tr key={c.id}><td>{String(c.saleId).slice(0,8)}…</td><td>{c.credits}</td><td>{(c.basisPoints/100).toFixed(2)}%</td></tr>)}
      </tbody></table></div>:<p className="muted">Nenhuma comissão liquidada ainda.</p>}
    </div>}
    {(master || network.parent) && <div className="card"><h3>Vender e comprar licenças</h3>
      <p className="muted">Licenças são o produto. Pix ou créditos são meios de pagamento. Configure ofertas, consulte vendas e entregue licenças no mesmo lugar.</p>
      <button type="button" className="btn primary" onClick={()=>go?.('vender-licencas')}>{master?'Abrir vendas de licenças':'Comprar licenças do Master'}</button>
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
      {network.policy.canInvite&&<div className="card"><h3>Revendas da minha rede</h3>
        {network.children.length?<div className="table-wrap"><table><thead><tr><th>Nome</th><th>Situação</th><th>Equipe</th><th>Ações</th></tr></thead><tbody>{network.children.map(c=><tr key={c.id}><td>{c.name}<div className="muted">{c.contact_email}</div></td><td>{c.status}</td><td>{c.distribution_role==="master"?"Submaster":"Revenda"} · {c.children_count} abaixo</td><td><button className="btn sm" onClick={()=>setChildId(c.id)}>Recursos</button>{c.distribution_role!=="master"&&network.policy.canPromote&&<button className="btn sm" disabled={busy||c.status!=="active"} onClick={()=>promoteChild(c.id)}>Promover a Submaster</button>}{c.status==="suspended"&&c.status_reason==="Aguardando aprovação do cadastro"&&<button className="btn sm" disabled={busy} onClick={()=>window.confirm("Recusar o cadastro e liberar a vaga desta revenda? A conta não será apagada.")&&updateChild(c.id,"reject")}>Recusar</button>}{c.status==="suspended"?<button className="btn sm" disabled={busy} onClick={()=>updateChild(c.id,"approve")}>Aprovar</button>:<button className="btn sm" disabled={busy} onClick={()=>updateChild(c.id,"suspend")}>Suspender</button>}</td></tr>)}</tbody></table></div>:<p className="muted">Nenhuma revenda vinculada. Compartilhe seu convite.</p>}
        {(network.childrenTotal||0)>network.childrenPageSize&&<div className="row" style={{gap:8,marginTop:10}}>
          <button className="btn sm" disabled={childPage<=1} onClick={()=>setChildPage(p=>p-1)}>Anterior</button>
          <span>Página {childPage} de {Math.ceil(network.childrenTotal/network.childrenPageSize)}</span>
          <button className="btn sm" disabled={childPage*network.childrenPageSize>=network.childrenTotal} onClick={()=>setChildPage(p=>p+1)}>Próxima</button>
        </div>}
      </div>}
      {network.policy.canInvite&&childResources&&<div className="card"><h3>Recursos da revenda selecionada</h3><p className="muted">Você só pode conceder recursos disponíveis na sua própria conta.</p>{Object.entries(resourceLabels).map(([key,label])=><div key={key} className="row" style={{alignItems:"center",justifyContent:"space-between",marginBottom:8}}><span>{label}</span><label><input type="checkbox" checked={childResources.direct[key]?.enabled!==false} disabled={busy||resources?.effective[key]?.enabled===false} onChange={e=>updateResource(key,e.target.checked,childResources.direct[key]?.limit??null)}/> Habilitado</label></div>)}<button className="btn sm" onClick={()=>{setChildId(null);setChildResources(null);}}>Fechar</button></div>}
    </>}
  </section>;
}
