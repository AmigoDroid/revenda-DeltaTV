import { formatBRL } from "@deltatv/ui/money";
import { useEffect, useState } from 'react';
import './customers3.css';
import { api } from '../api.js';
import { toCents } from '@deltatv/ui/money';
import LegacyClients from './Clients.jsx';

const money = formatBRL;
const Message=({type='info',children})=><p role={type==='error'?'alert':'status'} className={`notice ${type==='error'?'error':''}`}>{children}</p>;
function RequestButton({busy,children,...props}) { return <button type="submit" disabled={busy||props.disabled} className="btn primary" {...props}>{busy?'Processando…':children}</button>; }

export default function Customers3({go}) {
  const [tab,setTab]=useState('clientes');
  const [list,setList]=useState([]),[plans,setPlans]=useState([]),[selected,setSelected]=useState(null);
  const [details,setDetails]=useState(null),[q,setQ]=useState('');
  const [form,setForm]=useState({name:'',email:'',phone:''}),[plan,setPlan]=useState({name:'',price:'',slots:'2',months:'1'});
  const [subscriptionPlan,setSubscriptionPlan]=useState('');
  const [notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const safe=async fn=>{setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError(e.message||'Não foi possível concluir.');}finally{setBusy(false);}};
  const refresh=()=>Promise.all([api('/partner/commerce/customers',{query:{q,page:1,pageSize:50}}),api('/partner/commerce/plans')])
    .then(([clients,p])=>{setList(clients.data||[]);setPlans(p.data||[]);}).catch(e=>setError(e.message));
  useEffect(()=>{refresh();},[q]);
  const showCustomer=async id=>{setSelected(id);const r=await api(`/partner/commerce/customers/${id}`);setDetails(r);};
  return <div className="delta3-hub">
    <header className="delta3-header">
      <div className="delta3-eyebrow">ATENDIMENTO E ATIVAÇÕES</div>
      <h2>Clientes e dispositivos</h2>
      <p className="muted">Gerencie os dados comerciais dos clientes. A licença e a ativação de cada TV ficam na área Ativar TV.</p>
      <nav className="delta3-tabs" aria-label="Gerenciamento de clientes">
        {[['clientes','Clientes'],['planos','Planos'],['antigos','Cadastros por MAC (antigos)']].map(([k,v])=><button type="button" className={`btn ${tab===k?'primary':''}`} key={k} onClick={()=>setTab(k)} aria-current={tab===k?'page':undefined}>{v}</button>)}
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
            <button type="button" className="btn" onClick={()=>go('ativar-tv')}>Ativar TV com licença</button>
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
    {tab==='antigos'&&<LegacyClients go={go}/>}
  </div>;
}
