import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { toCents } from '@deltatv/ui/money';
import { qrMatrix } from '../qr.js';

const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents||0)/100);
const centsOf = input => toCents(input);
const statusLabel={creating:'Preparando cobrança',pending:'Aguardando Pix',paid:'Licenças entregues',review:'Pagamento em análise',expired:'Expirado',cancelled:'Cancelado',refunded:'Devolvido'};
function Qr({text}){
  const matrix=useMemo(()=>{try{return qrMatrix(text);}catch{return null;}},[text]);
  if(!matrix)return null;
  const parts=matrix.map((row,y)=>row.map((on,x)=>on?`M${x+4} ${y+4}h1v1h-1z`:'').join('')).join('');
  return <svg aria-label="QR Code Pix" role="img" width="220" height="220" viewBox={`0 0 ${matrix.length+8} ${matrix.length+8}`} shapeRendering="crispEdges" style={{background:'#fff',borderRadius:8}}><path d={parts} fill="#000"/></svg>;
}
const copy=async value=>{try{await navigator.clipboard.writeText(value);return true;}catch{window.prompt('Copie o código:',value);return false;}};

export default function MasterPix({account,policy,onChanged}){
  const master=account?.distributionRole==='master';
  const buyer=Boolean(account?.parentPartnerId);
  const [settings,setSettings]=useState(null),[prices,setPrices]=useState([]),[offers,setOffers]=useState([]),[seller,setSeller]=useState(null);
  const [sales,setSales]=useState([]),[report,setReport]=useState(null),[history,setHistory]=useState([]);
  const [token,setToken]=useState(''),[webhookSecret,setWebhookSecret]=useState(''),[currentPassword,setCurrentPassword]=useState('');
  const [priceForm,setPriceForm]=useState({months:'12',price:'10,00'});
  const [months,setMonths]=useState(''),[quantity,setQuantity]=useState('1'),[payerDoc,setPayerDoc]=useState('');
  const [order,setOrder]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const purchaseKey=account?.id?`delta-master-pix-order:${account.id}`:null;
  const load=useCallback(async()=>{
    const tasks=[];
    if(master && policy?.canSell){tasks.push(api('/partner/network/master-pix/settings').then(setSettings));
      tasks.push(api('/partner/network/master-pix/prices').then(d=>setPrices(d.data||[])));
      tasks.push(api('/partner/network/master-pix/sales').then(d=>setSales(d.data||[])));
      tasks.push(api('/partner/network/master-pix/network-sales').then(setReport));}
    if(buyer){tasks.push(api('/partner/network/master-pix/offers').then(d=>{setOffers(d.offers||[]);setSeller(d.seller||null);}));
      tasks.push(api('/partner/network/master-pix/orders').then(d=>setHistory(d.data||[])));}
    const results=await Promise.allSettled(tasks);
    const failure=results.find(r=>r.status==='rejected');
    if(failure)throw failure.reason;
  },[master,policy?.canSell,buyer]);
  useEffect(()=>{load().catch(e=>setError(e.message));},[load]);
  useEffect(()=>{
    if(!buyer || !purchaseKey)return;
    let prior;try{prior=JSON.parse(sessionStorage.getItem(purchaseKey)||'null');}catch{}
    if(prior?.orderId) api(`/partner/network/master-pix/orders/${prior.orderId}`).then(setOrder).catch(()=>{});
  },[buyer,purchaseKey]);
  useEffect(()=>{
    if(!order||!['pending','creating'].includes(order.status))return;
    let done=false;
    const t=setInterval(()=>{
      if(globalThis.document.hidden)return;
      api(`/partner/network/master-pix/orders/${order.id}`).then(r=>{
        if(done)return;
        setOrder(r);
        if(r.status==='paid'){
          sessionStorage.removeItem(purchaseKey);setMessage('Pix confirmado! As licenças já entraram no seu estoque.');
          load().catch(()=>{});onChanged?.();
        }
      }).catch(()=>{});
    },5000);
    return()=>{done=true;clearInterval(t);};
  },[order?.id,order?.status,purchaseKey,load,onChanged]);
  const action=async(fn,success)=>{
    if(busy)return;
    setBusy(true);setError('');setMessage('');
    try{const r=await fn();if(success)setMessage(success);await load();return r;}
    catch(e){setError(e.message||'Não foi possível completar a ação.');return null;}
    finally{setBusy(false);}
  };
  const saveSettings=async()=>{
    const r=await action(()=>api('/partner/network/master-pix/settings',{method:'PUT',body:{accessToken:token,webhookSecret,currentPassword,active:true}}),
      'Conta validada e recebimento Pix ativado.');
    if(r){setToken('');setWebhookSecret('');setCurrentPassword('');}
  };
  const savePrice=()=>{ if (!(centsOf(priceForm.price) > 0)) { setError('Informe um preço válido em reais. Ex.: 1.234,56.'); return; } return action(()=>api('/partner/network/master-pix/prices',{method:'PUT',body:{months:Number(priceForm.months),unitPriceCents:centsOf(priceForm.price),active:true}}),
    'Preço Pix publicado para suas revendas.'); };
  const offer=offers.find(p=>String(p.months)===months)||offers[0];
  const count=Number(quantity),total=Number(offer?.unitPriceCents||0)*count;
  const valid=Number.isSafeInteger(count)&&count>0&&Number.isSafeInteger(total)&&total>0;
  const beginOrder=async()=>{
    if(!valid||busy)return;
    let pending;try{pending=JSON.parse(sessionStorage.getItem(purchaseKey)||'null');}catch{}
    if(pending?.orderId){
      const existing=await action(()=>api(`/partner/network/master-pix/orders/${pending.orderId}`));
      if(existing)setOrder(existing);return;
    }
    const body=pending?.body||{months:Number(offer.months),quantity:count,expectedUnitPriceCents:Number(offer.unitPriceCents),idempotencyKey:crypto.randomUUID()};
    if(!pending)sessionStorage.setItem(purchaseKey,JSON.stringify({body}));
    const cleaned=payerDoc.replace(/\D/g,'');
    const result=await action(()=>api('/partner/network/master-pix/orders',{method:'POST',body:{...body,...(cleaned?{document:cleaned}:{})}}));
    if(result){sessionStorage.setItem(purchaseKey,JSON.stringify({body,orderId:result.id}));setOrder(result);setPayerDoc('');}
    else setMessage('A tentativa foi preservada. Use o mesmo botão para recuperar sem criar outra cobrança.');
  };
  const openOrder=async id=>{
    const data=await action(()=>api(`/partner/network/master-pix/orders/${id}`));
    if(data){setOrder(data);if(purchaseKey && ['pending','creating'].includes(data.status))sessionStorage.setItem(purchaseKey,JSON.stringify({orderId:id}));}
  };
  if(!master&&!buyer)return null;
  return <div className="card" style={{display:'grid',gap:14}}>
    <div><h2 style={{marginBottom:4}}>Vendas de licenças por Pix</h2><p className="muted">O pagamento vai diretamente para o Mercado Pago do Master. As licenças são entregues automaticamente após a confirmação.</p></div>
    {error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status" style={{color:'var(--ok)'}}>{message}</p>}
    {master&&policy?.canSell&&<>
      <div style={{border:'1px solid var(--border)',borderRadius:12,padding:14,display:'grid',gap:10}}>
        <h3>1. Minha conta de recebimento</h3>
        <p className="muted">{settings?.configured?(settings.enabled?'Recebimento ativado':'Recebimento pausado'):'Configure sua conta do Mercado Pago para receber Pix diretamente.'}</p>
        {settings?.configured&&<p className="muted">Conta Mercado Pago identificada: {settings.merchantId} · cobranças não concluídas: {settings.pendingPayments}</p>}
        <details><summary>{settings?.configured?'Trocar credenciais de recebimento':'Configurar Mercado Pago'}</summary>
          <p className="muted">Informe o Access Token de produção e a chave secreta dos Webhooks da sua integração Mercado Pago. Eles são criptografados no servidor e não ficam visíveis nesta tela após salvar.</p>
          <div style={{display:'grid',gap:10,marginTop:10}}>
            <label>Access Token <input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="APP_USR-..."/></label>
            <label>Chave secreta do Webhook <input type="password" autoComplete="off" value={webhookSecret} onChange={e=>setWebhookSecret(e.target.value)} placeholder="Chave secreta do Mercado Pago"/></label>
            <label>Confirme sua senha do DeltaTV<input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label>
            <button className="btn primary" disabled={busy||token.length<30||webhookSecret.length<16||currentPassword.length<8} onClick={saveSettings}>Validar e ativar recebimentos</button>
          </div>
        </details>
        {settings?.webhookUrl&&<label>URL das notificações do Pix<input readOnly value={settings.webhookUrl} onFocus={e=>e.target.select()}/><button className="btn sm" onClick={()=>copy(settings.webhookUrl)}>Copiar URL do Webhook</button></label>}
        {settings?.configured&&<button className="btn sm" disabled={busy} onClick={()=>action(()=>api('/partner/network/master-pix/settings',{method:'PATCH',body:{active:!settings.enabled}}),'Situação dos recebimentos alterada.')}>{settings.enabled?'Pausar novas vendas Pix':'Ativar vendas Pix'}</button>}
        <p className="muted">Configure a URL de notificação no Mercado Pago. Mesmo se uma notificação falhar, o DeltaTV tentará conciliar os pagamentos automaticamente.</p>
      </div>
      <div style={{border:'1px solid var(--border)',borderRadius:12,padding:14,display:'grid',gap:10}}>
        <h3>2. Preços em reais para minhas revendas</h3>
        <div className="row" style={{gap:10,alignItems:'end',flexWrap:'wrap'}}>
          <label>Duração (meses)<input type="number" min="1" max="120" value={priceForm.months} onChange={e=>setPriceForm(v=>({...v,months:e.target.value}))}/></label>
          <label>Preço por licença (R$)<input inputMode="decimal" value={priceForm.price} onChange={e=>setPriceForm(v=>({...v,price:e.target.value}))}/></label>
          <button className="btn primary" disabled={busy||!(centsOf(priceForm.price) > 0)} onClick={savePrice}>Salvar oferta Pix</button>
        </div>
        {prices.length>0&&<div className="table-wrap"><table><thead><tr><th>Duração</th><th>Preço Pix</th><th>Situação</th><th></th></tr></thead><tbody>{prices.map(p=><tr key={p.months}><td>{p.months} meses</td><td>{money(p.unitPriceCents)}</td><td>{p.active?'Ativo':'Pausado'}</td><td><button className="btn sm" disabled={busy} onClick={()=>action(()=>api('/partner/network/master-pix/prices',{method:'PUT',body:{months:p.months,unitPriceCents:Number(p.unitPriceCents),active:!p.active}}),'Oferta atualizada.')}>{p.active?'Pausar':'Ativar'}</button></td></tr>)}</tbody></table></div>}
      </div>
      {report&&<div className="row" style={{gap:16,flexWrap:'wrap'}}><strong>Vendas de toda a rede: {report.summary.completedSales}</strong><strong>Faturamento bruto registrado: {money(report.summary.grossCents)}</strong></div>}
      <details><summary>Vendas Pix na minha rede ({sales.length})</summary><div className="table-wrap"><table><thead><tr><th>Revenda</th><th>Quantidade</th><th>Valor</th><th>Situação</th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td>{s.counterpartyName}</td><td>{s.quantity} × {s.months} meses</td><td>{money(s.totalCents)}</td><td>{statusLabel[s.status]||s.status}</td></tr>)}</tbody></table></div></details>
      {report&&<details><summary>Vendas dos Submasters (visão hierárquica)</summary><div className="table-wrap"><table><thead><tr><th>Vendedor</th><th>Comprador</th><th>Licenças</th><th>Valor bruto</th><th>Estado</th></tr></thead><tbody>{report.data.map(v=><tr key={v.id}><td>{v.sellerName}</td><td>{v.buyerName}</td><td>{v.quantity} × {v.months} meses</td><td>{money(v.totalCents)}</td><td>{statusLabel[v.status]||v.status}</td></tr>)}</tbody></table></div></details>}
    </>}
    {buyer&&<div style={{border:'1px solid var(--border)',borderRadius:12,padding:14,display:'grid',gap:10}}>
      <h3>Comprar licenças por Pix</h3>
      <p className="muted">{seller?.name?`Você está comprando diretamente de ${seller.name}.`:'Seu Master ainda não habilitou o recebimento Pix.'} Não é necessário enviar comprovante.</p>
      {offers.length>0?<div className="row" style={{alignItems:'end',gap:10,flexWrap:'wrap'}}>
        <label>Duração<select value={offer?.months||''} onChange={e=>setMonths(e.target.value)}>{offers.map(p=><option key={p.months} value={p.months}>{p.months} meses — {money(p.unitPriceCents)} cada</option>)}</select></label>
        <label>Quantidade<input type="number" min="1" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
        <label>CPF/CNPJ do pagador (se necessário)<input inputMode="numeric" autoComplete="off" value={payerDoc} onChange={e=>setPayerDoc(e.target.value)} placeholder="Somente números"/></label>
        <b>Total: {money(total)}</b>
        <button className="btn primary" disabled={busy||!valid||(payerDoc.replace(/\D/g,'')&&!([11,14].includes(payerDoc.replace(/\D/g,'').length)))} onClick={beginOrder}>{order&&['pending','creating'].includes(order.status)?'Recuperar Pix':'Gerar Pix para pagar'}</button>
      </div>:<p className="muted">Nenhuma oferta Pix disponível. O Master precisa configurar o recebimento e os preços.</p>}
      {order&&<div style={{display:'grid',gap:8,justifyItems:'start',padding:12,background:'var(--panel-muted,transparent)',borderRadius:10}}>
        <strong>{statusLabel[order.status]||order.status} · {money(order.totalCents)}</strong>
        {order.status==='pending'&&order.qrCode&&<><Qr text={order.qrCode}/><label style={{width:'100%'}}>Pix copia e cola<textarea readOnly rows={3} value={order.qrCode} onFocus={e=>e.target.select()} style={{width:'100%',fontSize:12}}/></label><button className="btn primary" onClick={()=>copy(order.qrCode)}>Copiar código Pix</button></>}
        {order.status==='pending'&&<span className="muted">Pagamento pendente. O status será atualizado automaticamente.</span>}
        {order.status==='paid'&&<p role="status">Pagamento aprovado e licenças disponíveis no estoque.</p>}
        {order.status==='review'&&<p className="error">Pagamento em análise: {order.reviewReason||'Aguarde a conciliação financeira.'} O Master deve consultar o suporte.</p>}
        <button className="btn sm" disabled={busy} onClick={()=>openOrder(order.id)}>Verificar pagamento agora</button>
        {['paid','cancelled','expired','refunded'].includes(order.status)&&<button className="btn primary" disabled={busy} onClick={()=>{sessionStorage.removeItem(purchaseKey);setOrder(null);setMessage('Você pode iniciar outra compra.');}}>Fazer nova compra</button>}
      </div>}
      <details><summary>Minhas compras Pix anteriores ({history.length})</summary><div className="table-wrap"><table><thead><tr><th>Data</th><th>Licenças</th><th>Valor</th><th>Situação</th><th></th></tr></thead><tbody>{history.map(o=><tr key={o.id}><td>{new Date(o.createdAt).toLocaleString('pt-BR')}</td><td>{o.quantity} × {o.months} meses</td><td>{money(o.totalCents)}</td><td>{statusLabel[o.status]||o.status}</td><td><button className="btn sm" onClick={()=>openOrder(o.id)}>Abrir</button></td></tr>)}</tbody></table></div></details>
    </div>}
  </div>;
}
