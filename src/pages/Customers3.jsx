import { useEffect, useMemo, useState } from 'react';
import './customers3.css';
import { api } from '../api.js';
import { toCents } from '@deltatv/ui/money';
import LegacyClients from './Clients.jsx';

const normalizeMac = input => {
  const h=String(input||'').toUpperCase().replace(/[^0-9A-F]/g,'');
  return h.length===12?h.match(/.{2}/g).join(':'):null;
};
const money = formatBRL;
const Message=({type='info',children})=><p role={type==='error'?'alert':'status'} className={`notice ${type==='error'?'error':''}`}>{children}</p>;
function RequestButton({busy,children,...props}) { return <button type="submit" disabled={busy||props.disabled} className="btn primary" {...props}>{busy?'Processando…':children}</button>; }

export default function Customers3({go}) {
  const [tab,setTab]=useState(()=>{const quick=sessionStorage.getItem('deltatv-quick-activate');if(quick)sessionStorage.removeItem('deltatv-quick-activate');return quick?'ativacao':'clientes';});
  useEffect(()=>{const open=()=>setTab('ativacao');window.addEventListener('deltatv-open-activation',open);return()=>window.removeEventListener('deltatv-open-activation',open);},[]);
  const [list,setList]=useState([]),[plans,setPlans]=useState([]),[selected,setSelected]=useState(null);
  const [details,setDetails]=useState(null),[q,setQ]=useState('');
  const [form,setForm]=useState({name:'',email:'',phone:''}),[plan,setPlan]=useState({name:'',price:'',slots:'2',months:'1'});
  const [subscriptionPlan,setSubscriptionPlan]=useState(''),[activeSub,setActiveSub]=useState('');
  const [macInput,setMacInput]=useState(''),[macState,setMacState]=useState({status:'idle'});
  const [notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const mac=useMemo(()=>normalizeMac(macInput),[macInput]);
  const safe=async fn=>{setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError(e.message||'Não foi possível concluir.');}finally{setBusy(false);}};
  const refresh=()=>Promise.all([api('/partner/commerce/customers',{query:{q,page:1,pageSize:50}}),api('/partner/commerce/plans')])
    .then(([clients,p])=>{setList(clients.data||[]);setPlans(p.data||[]);}).catch(e=>setError(e.message));
  useEffect(()=>{refresh();},[q]);
  const showCustomer=async id=>{if(id!==selected)setActiveSub('');setSelected(id);const r=await api(`/partner/commerce/customers/${id}`);setDetails(r);};
  // WebSocket é um aviso para reconsultar o servidor. MAC sozinho não comprova posse nem ativa a TV.
  useEffect(()=>{
    if(!mac){setMacState({status:'idle'});return;}
    let disposed=false, timer, request=0;
    const check=async()=>{
      const n=++request;setMacState({status:'checking'});
      try{
        const data=await api('/partner/mac/lookup',{method:'POST',body:{mac}});
        if(!disposed&&n===request)setMacState({status:'found',data});
      }catch(e){if(!disposed&&n===request)setMacState({status:e.status===404?'missing':'error',message:e.message});}
    };
    timer=setTimeout(check,480);
    const event=e=>{
      if(e.type==='realtime-change'&&!['devices','activations','data','device-presence'].includes(e.detail?.topic))return;
      clearTimeout(timer);timer=setTimeout(check,350);
    };
    window.addEventListener('realtime-change',event);window.addEventListener('realtime-ready',event);
    // Consulta de fallback lenta somente enquanto a aba estiver visível; sem consultas por caractere.
    const poll=setInterval(()=>{if(document.visibilityState==='visible')event({type:'realtime-ready'});},30000);
    return ()=>{disposed=true;clearTimeout(timer);clearInterval(poll);window.removeEventListener('realtime-change',event);window.removeEventListener('realtime-ready',event);};
  },[mac]);
  const selectedSubscription=details?.subscriptions?.find(s=>s.id===activeSub);
  return <div className="delta3-hub">
    <header className="delta3-header">
      <div className="delta3-eyebrow">ATENDIMENTO E ATIVAÇÕES</div>
      <h2>Clientes e dispositivos</h2>
      <p className="muted">Cadastre a pessoa primeiro. Depois associe planos e TVs, sem precisar repetir os dados do cliente.</p>
      <nav className="delta3-tabs" aria-label="Gerenciamento de clientes">
        {[['clientes','Clientes'],['planos','Planos'],['ativacao','Ativar uma TV'],['antigos','Cadastros por MAC (antigos)']].map(([k,v])=><button type="button" className={`btn ${tab===k?'primary':''}`} key={k} onClick={()=>setTab(k)} aria-current={tab===k?'page':undefined}>{v}</button>)}
      </nav>
    </header>
    {error&&<Message type="error">{error}</Message>}{notice&&<Message>{notice}</Message>}
    {tab==='clientes'&&<div className="delta3-grid">
      <section className="card delta3-section">
        <h3>Novo cliente</h3><p className="muted">Nenhum MAC é obrigatório para cadastrar.</p>
        <form onSubmit={e=>{e.preventDefault();safe(async()=>{const c=await api('/partner/commerce/customers',{method:'POST',body:{...form,email:form.email||null,phone:form.phone||null}});setForm({name:'',email:'',phone:''});await refresh();await showCustomer(c.id);setNotice('Cliente cadastrado. Escolha um plano ou associe uma TV.');});}}>
          <label>Nome completo <input required minLength={2} maxLength={160} value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label>
          <label>E-mail (opcional) <input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label>
          <label>Telefone (opcional) <input value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label>
          <RequestButton busy={busy}>Cadastrar cliente</RequestButton>
        </form>
      </section>
      <section className="card delta3-section">
        <h3>Meus clientes</h3>
        <label>Pesquisar pelo nome, contato ou e-mail<input placeholder="Encontrar cliente…" value={q} onChange={e=>setQ(e.target.value)}/></label>
        {!list.length?<p className="muted">Nenhum cliente encontrado. Use o cadastro ao lado.</p>:<div className="delta3-client-list">
          {list.map(c=><button key={c.id} type="button" className={`btn delta3-client-row ${selected===c.id?"is-selected":""}`} onClick={()=>safe(()=>showCustomer(c.id))}>
            <strong>{c.name}</strong><span className="muted delta3-client-meta">{c.phone||c.email||'Sem contato'} · {c.linkedDevices} TV(s)</span>
          </button>)}
        </div>}
      </section>
      {details&&<section className="card delta3-section delta3-full">
        <h3>{details.customer.name}</h3><p className="muted">Assinaturas comerciais e dispositivos vinculados</p>
        <form onSubmit={e=>{e.preventDefault();safe(async()=>{await api(`/partner/commerce/customers/${selected}/subscriptions`,{method:'POST',body:{planId:subscriptionPlan}});await showCustomer(selected);setNotice('Plano adicionado como rascunho. Não libera automaticamente a licença da TV.');});}}>
          <label>Selecionar plano
            <select required value={subscriptionPlan} onChange={e=>setSubscriptionPlan(e.target.value)}><option value="">Selecione…</option>{plans.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name} — {money(p.priceCents)} / {p.includedSlots??'∞'} TVs</option>)}</select>
          </label>
          <RequestButton busy={busy} disabled={!subscriptionPlan}>Adicionar plano</RequestButton>
        </form>
        {!plans.length&&<p className="muted">Primeiro crie um plano na aba “Planos”.</p>}
        <div className="delta3-subscriptions">{details.subscriptions.map(s=><div key={s.id} className="delta3-subscription">
          <strong>{s.planName}</strong><p className="muted">Situação: {s.state} · {s.usedSlots} de {s.slots??'ilimitadas'} vagas vinculadas</p>
          <div className="delta3-actions">
            <button type="button" className="btn" onClick={()=>{setActiveSub(s.id);setTab('ativacao');}}>Gerenciar TVs</button>
            {s.state==='draft'&&<button className="btn" disabled={busy} type="button" onClick={()=>safe(async()=>{
              await api(`/partner/commerce/subscriptions/${s.id}/state`,{method:'POST',body:{state:'active',reason:'Confirmação comercial manual do responsável'}});
              await showCustomer(selected);setNotice('Cadastro comercial aprovado. As licenças dos aplicativos continuam sendo ativadas pelos fluxos existentes.');
            })}>Marcar plano comercial ativo</button>}
          </div>
        </div>)}</div>
      </section>}
    </div>}
    {tab==='planos'&&<section className="card delta3-section">
      <h3>Planos para seus clientes</h3><p className="muted">Crie planos de até quantas TVs quiser. Vagas ilimitadas podem ser configuradas posteriormente pela administração.</p>
      <form onSubmit={e=>{e.preventDefault();safe(async()=>{
        const cents=toCents(plan.price);if(cents===null)throw Error('Informe um valor válido em reais.');
        await api('/partner/commerce/plans',{method:'POST',body:{name:plan.name,priceCents:cents,periodMonths:Number(plan.months),includedSlots:Number(plan.slots),billingMode:'prepaid',allowExtra:false,allowResell:false,overageCents:null,graceDays:5}});
        setPlan({name:'',price:'',slots:'2',months:'1'});await refresh();setNotice('Plano criado. Agora selecione um cliente para associar.');
      });}}>
        <label>Nome do plano <input required value={plan.name} onChange={e=>setPlan(v=>({...v,name:e.target.value}))} placeholder="Ex.: Família"/></label>
        <label>Mensalidade (R$) <input required inputMode="decimal" placeholder="25,00" value={plan.price} onChange={e=>setPlan(v=>({...v,price:e.target.value}))}/></label>
        <label>Vagas de TVs <input required type="number" min="1" max="2147483647" value={plan.slots} onChange={e=>setPlan(v=>({...v,slots:e.target.value}))}/></label>
        <label>Duração (meses) <input required type="number" min="1" max="120" value={plan.months} onChange={e=>setPlan(v=>({...v,months:e.target.value}))}/></label>
        <RequestButton busy={busy}>Salvar plano</RequestButton>
      </form>
      <h4>Planos disponíveis</h4>{plans.map(p=><div key={p.id} className="delta3-subscription"><strong>{p.name}</strong><span className="muted"> · {money(p.priceCents)} · {p.includedSlots??'∞'} vagas</span></div>)}
    </section>}
    {tab==='ativacao'&&<section className="card delta3-section">
      <h3>Ativar ou vincular TV</h3><p className="muted">Digite o MAC. O painel consulta o servidor e atualiza o resultado quando houver novidades pelo WebSocket.</p>
      <label>MAC do dispositivo <input autoComplete="off" inputMode="text" placeholder="AA:BB:CC:DD:EE:FF" value={macInput} onChange={e=>setMacInput(e.target.value)} /></label>
      {macState.status==='idle'&&<Message>Digite o MAC completo para consultar.</Message>}
      {macState.status==='checking'&&<Message>Consultando o dispositivo…</Message>}
      {macState.status==='found'&&<Message>Dispositivo localizado. Verifique a licença e escolha a ação desejada.</Message>}
      {macState.status==='missing'&&<Message>Não foi localizado um dispositivo autorizado. Ligue a TV e conclua seu registro no aplicativo.</Message>}
      {macState.status==='error'&&<Message type="error">{macState.message||'Não foi possível consultar a TV.'}</Message>}
      <label>Plano comercial do cliente
        <select value={activeSub} onChange={e=>setActiveSub(e.target.value)}><option value="">Selecione o plano…</option>{details?.subscriptions?.map(s=><option key={s.id} value={s.id}>{s.planName} — {s.usedSlots}/{s.slots??'∞'} vagas ({s.state})</option>)}</select>
      </label>
      {activeSub&&<p className="muted">{selectedSubscription?`Plano: ${selectedSubscription.planName}.`:'Seleção atual de outra ficha.'} A associação não cria uma licença nem modifica o conteúdo da TV.</p>}
      <div className="delta3-actions">
        <button type="button" className="btn primary" disabled={busy||macState.status!=='found'||!activeSub||selectedSubscription?.state!=='active'} onClick={()=>safe(async()=>{
          await api(`/partner/commerce/subscriptions/${activeSub}/slots`,{method:'POST',body:{mac}});
          if(selected)await showCustomer(selected);
          setNotice('TV existente vinculada à vaga do cliente. A ativação original da TV não foi modificada.');
        })}>Vincular TV existente ao plano</button>
        <button type="button" className="btn" onClick={()=>go('dispositivos')}>Abrir ativação de licença e listas</button>
      </div>
      <p className="muted delta3-note">Para uma TV sem licença, utilize a ativação atual em Dispositivos. Depois volte e vincule a TV a uma vaga do plano.</p>
    </section>}
    {tab==='antigos'&&<LegacyClients go={go}/>}
  </div>;
}
