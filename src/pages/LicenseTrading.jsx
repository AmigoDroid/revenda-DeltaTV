import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { usePortal } from '../portal.jsx';
import MasterPix from './MasterPix.jsx';
import './license-trading.css';

const monthsLabel = n => `${n} ${Number(n) === 1 ? 'mês' : 'meses'}`;
const number = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString('pt-BR') : '0';
const makeKey = () => crypto.randomUUID();
const store = (type,id) => `deltatv-license-trading:${type}:${id}`;
function parsePending(key) { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } }
const initialMonths = '12';

/** Uma única operação comercial para licenças; créditos e Pix são MEIOS DE PAGAMENTO. */
export default function LicenseTrading({go}) {
  const {me} = usePortal();
  const [network,setNetwork] = useState(null);
  const [balances,setBalances] = useState([]);
  const [prices,setPrices] = useState([]);
  const [childOptions,setChildOptions] = useState([]);
  const [childPage,setChildPage] = useState(1);
  const [sales,setSales] = useState([]);
  const [deliveries,setDeliveries] = useState([]);
  const [tab,setTab] = useState('vender');
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [offer,setOffer] = useState({months:initialMonths,priceCredits:'10'});
  const [delivery,setDelivery] = useState({buyerPartnerId:'',months:initialMonths,quantity:'1',purpose:'external_payment',note:'',accepted:false});
  const [order,setOrder] = useState({months:'',quantity:'1'});
  const [pendingDelivery,setPendingDelivery] = useState(null);
  const [pendingPurchase,setPendingPurchase] = useState(null);
  const myId = network?.account?.id || me?.id;
  const isMaster = network?.account?.distributionRole === 'master';
  const canSell = isMaster && network.policy?.canSell;
  const isBuyer = Boolean(network?.parent);

  const refresh = useCallback(async()=>{
    const overview = await api('/partner/network?page=1&pageSize=100');
    setNetwork(overview);
    setChildOptions(overview.children||[]);
    setChildPage(1);
    const isSeller = overview.account?.distributionRole === 'master' && overview.policy?.canSell;
    const requests = await Promise.allSettled([
      api('/partner/stock?page=1&pageSize=1'),
      isSeller ? api('/partner/network/prices') : Promise.resolve({data:[]}),
      isSeller ? api('/partner/network/sales') : Promise.resolve({data:[]}),
      isSeller ? api('/partner/network/license-deliveries') : Promise.resolve({data:[]}),
    ]);
    setBalances(requests[0].status==='fulfilled' ? (requests[0].value.balances || []) : overview.stock || []);
    setPrices(requests[1].status==='fulfilled' ? (requests[1].value.data||[]) : []);
    setSales(requests[2].status==='fulfilled' ? (requests[2].value.data||[]) : []);
    setDeliveries(requests[3].status==='fulfilled' ? (requests[3].value.data||[]) : []);
    const failed = requests.find(r=>r.status==='rejected' && r.reason?.status !== 403);
    if(failed) setError(`Alguns dados não carregaram: ${failed.reason.message}`);
  },[]);
  useEffect(()=>{let active=true;setLoading(true);refresh().catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[refresh]);
  useEffect(()=>{
    if(!myId)return;
    const deliveryKey=store('delivery',myId),purchaseKey=store('buy',myId);
    setPendingDelivery(parsePending(deliveryKey));
    const current=parsePending(purchaseKey);
    const legacy=parsePending(`delta-network-checkout:${myId}`);
    const migrated=!current&&legacy?.key?{idempotencyKey:legacy.key,months:legacy.months,
      quantity:legacy.quantity,expectedUnitPriceCredits:legacy.expectedUnitPriceCredits}:null;
    if(migrated)sessionStorage.setItem(purchaseKey,JSON.stringify(migrated));
    setPendingPurchase(current||migrated);
  },[myId]);
  const doAction = async(action,success)=>{
    if(busy)return null;
    setBusy(true);setError('');setNotice('');
    try {const r=await action();if(success)setNotice(success);await refresh();return r;}
    catch(e){setError(e.message || 'Não foi possível concluir a operação.');return null;}
    finally{setBusy(false);}
  };
  const activeOffer = useMemo(()=>(network?.offers||[]).find(p=>String(p.months)===order.months)||(network?.offers||[])[0],[network?.offers,order.months]);
  const quantity = Number(order.quantity);
  const totalCredits = Number(activeOffer?.priceCredits||0)*quantity;
  const creditValid=Number.isSafeInteger(quantity)&&quantity>0&&Number.isSafeInteger(totalCredits)&&totalCredits>0;
  const selectedMonths=balances.some(b=>String(b.months)===String(delivery.months))?String(delivery.months):String(balances[0]?.months||'');
  const available=balances.find(b=>String(b.months)===selectedMonths)?.quantity ?? 0;
  const deliveryQuantity=Number(delivery.quantity);
  const deliveryAllowed=Boolean(canSell && delivery.buyerPartnerId && delivery.accepted && Number.isSafeInteger(deliveryQuantity) && deliveryQuantity>0 && deliveryQuantity<=available && deliveryQuantity<=10000);
  const children=childOptions.filter(c=>c.status==='active');
  const loadMoreChildren=async()=>{if(busy)return;setBusy(true);setError('');try{const r=await api(`/partner/network?page=${childPage+1}&pageSize=100`);setChildOptions(v=>[...v,...(r.children||[]).filter(c=>!v.some(x=>x.id===c.id))]);setChildPage(p=>p+1);}catch(e){setError(e.message)}finally{setBusy(false);}};
  const clearDelivery = () => {if(myId)sessionStorage.removeItem(store('delivery',myId));setPendingDelivery(null);};
  const clearPurchase = () => {if(myId){sessionStorage.removeItem(store('buy',myId));sessionStorage.removeItem(`delta-network-checkout:${myId}`);}setPendingPurchase(null);};

  const submitDelivery = async e=>{
    e.preventDefault();if(!deliveryAllowed&&!pendingDelivery)return;
    const record=pendingDelivery || {buyerPartnerId:delivery.buyerPartnerId,months:Number(selectedMonths),quantity:deliveryQuantity,
      purpose:delivery.purpose,note:delivery.note.trim(),idempotencyKey:makeKey()};
    if(!pendingDelivery){sessionStorage.setItem(store('delivery',myId),JSON.stringify(record));setPendingDelivery(record);}
    const result=await doAction(()=>api('/partner/network/license-deliveries',{method:'POST',body:record}),
      'Licenças entregues à revenda. A entrega foi registrada; nenhum Pix ou crédito foi recebido automaticamente.');
    if(result){clearDelivery();setDelivery(s=>({...s,quantity:'1',note:'',accepted:false}));window.dispatchEvent(new Event('stock-changed'));}
  };
  const checkDelivery=async()=>{
    if(!pendingDelivery||busy)return;
    const result=await doAction(()=>api(`/partner/network/license-deliveries/by-key/${pendingDelivery.idempotencyKey}`));
    if(result?.delivery){clearDelivery();setNotice('Entrega já registrada no servidor. Não foi enviada outra licença.');window.dispatchEvent(new Event('stock-changed'));}
    else if(result)setNotice('Entrega ainda não localizada. Repita com a mesma identificação, sem criar outro pedido.');
  };
  const submitCreditPurchase = async()=>{
    if(!creditValid&&!pendingPurchase)return;
    const rec=pendingPurchase || {months:Number(activeOffer.months),quantity,expectedUnitPriceCredits:Number(activeOffer.priceCredits),idempotencyKey:makeKey()};
    if(!pendingPurchase){sessionStorage.setItem(store('buy',myId),JSON.stringify(rec));setPendingPurchase(rec);}
    const result=await doAction(()=>api('/partner/network/buy',{method:'POST',body:rec}),
      'Compra aprovada. As licenças foram transferidas para seu estoque, e os créditos debitados.');
    if(result){clearPurchase();window.dispatchEvent(new Event('stock-changed'));}
  };
  const checkCreditPurchase=async()=>{
    if(!pendingPurchase||busy)return;
    const result=await doAction(()=>api(`/partner/network/purchases/by-key/${pendingPurchase.idempotencyKey}`));
    if(result?.purchase){clearPurchase();setNotice('Compra já concluída, sem novo débito de créditos.');window.dispatchEvent(new Event('stock-changed'));}
    else if(result)setNotice('Compra ainda não localizada. Repita usando a mesma identificação.');
  };
  const saveCreditOffer=async e=>{
    e.preventDefault();const months=Number(offer.months),priceCredits=Number(offer.priceCredits);
    if(!Number.isSafeInteger(months)||months<1||months>120||!Number.isSafeInteger(priceCredits)||priceCredits<1){setError('Informe prazo e preço em créditos válidos.');return;}
    await doAction(()=>api('/partner/network/prices',{method:'PUT',body:{months,priceCredits,active:true}}),'Licenças publicadas para compra por créditos.');
  };
  if(loading)return <section className="card" role="status">Carregando vendas e estoque de licenças…</section>;
  if(!network)return <section className="card" role="alert">{error||'Não foi possível carregar as licenças.'}</section>;
  if(!isMaster&&!isBuyer)return <section className="card"><h2>Licenças</h2><p>Esta conta não está vinculada a uma rede comercial. Utilize seu estoque para ativar dispositivos.</p><button className="btn" onClick={()=>go?.('estoque')}>Abrir estoque</button></section>;
  const tabs=[...(isMaster?[{id:'vender',label:'Vender e entregar'},{id:'precos',label:'Preços e ofertas'}]:[]),...(isBuyer?[{id:'comprar',label:'Comprar licenças'}]:[]),{id:'pix',label:'Vendas por Pix'},{id:'historico',label:'Histórico'}];
  const currentTab=tabs.some(t=>t.id===tab)?tab:tabs[0].id;
  return <section className="license-commerce">
    <div className="card license-commerce-hero">
      <div><span className="license-commerce-eyebrow">CENTRAL DE LICENÇAS</span><h2>{isMaster?'Venda licenças diretamente para sua rede':'Compre licenças do seu Master'}</h2>
        <p>O produto vendido é sempre a <strong>licença</strong>. Pix e créditos são formas de pagamento; entrega manual é uma operação separada.</p></div>
      <div className="license-commerce-stats"><div><small>Licenças disponíveis</small><strong>{number(balances.reduce((n,b)=>n+Number(b.quantity||0),0))}</strong></div><div><small>Créditos</small><strong>{number(network.creditBalance)}</strong></div></div>
    </div>
    {error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status" className="license-commerce-ok">{notice}</p>}
    <div className="license-commerce-tabs" role="group" aria-label="Operações de licenças">{tabs.map(t=><button type="button" aria-pressed={currentTab===t.id} key={t.id} className={currentTab===t.id?'active':''} onClick={()=>setTab(t.id)}>{t.label}</button>)}</div>
    {currentTab==='vender'&&<div className="license-commerce-grid">
      <div className="card"><h3>Entregar licenças à revenda</h3><p className="muted">Para vendas recebidas fora do DeltaTV ou distribuições sem cobrança. Debita seu estoque e adiciona licenças ao estoque da revenda.</p>
        {!canSell?<p className="error">Você é Master, mas ainda não tem autorização para vender ou distribuir licenças. Peça ao Superadmin que habilite “Permitir vendas” na sua rede.</p>:<form className="license-commerce-form" onSubmit={submitDelivery}>
          <label>Revenda destinatária<select required disabled={busy||!!pendingDelivery} value={pendingDelivery?.buyerPartnerId??delivery.buyerPartnerId} onChange={e=>setDelivery(s=>({...s,buyerPartnerId:e.target.value}))}><option value="">Selecione a revenda</option>{children.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          {(network.childrenTotal||0)>childOptions.length&&<button type="button" className="btn" onClick={loadMoreChildren} disabled={busy}>Carregar mais revendas ({childOptions.length} de {network.childrenTotal})</button>}
          <div className="license-commerce-fields"><label>Duração<select disabled={busy||!!pendingDelivery} value={pendingDelivery?.months??selectedMonths} onChange={e=>setDelivery(s=>({...s,months:e.target.value}))}>{balances.map(b=><option key={b.months} value={b.months}>{monthsLabel(b.months)} · {b.quantity} disponíveis</option>)}</select></label>
          <label>Quantidade<input type="number" min="1" max={Math.min(10000,available)} required disabled={busy||!!pendingDelivery} value={pendingDelivery?.quantity??delivery.quantity} onChange={e=>setDelivery(s=>({...s,quantity:e.target.value}))}/></label></div>
          <label>Tipo de entrega<select disabled={busy||!!pendingDelivery} value={pendingDelivery?.purpose??delivery.purpose} onChange={e=>setDelivery(s=>({...s,purpose:e.target.value,accepted:false}))}><option value="external_payment">Venda paga fora da plataforma</option><option value="complimentary">Distribuição sem cobrança</option></select></label>
          <label>Observação (opcional)<input maxLength={200} disabled={busy||!!pendingDelivery} value={pendingDelivery?.note??delivery.note} onChange={e=>setDelivery(s=>({...s,note:e.target.value}))} placeholder="Referência do atendimento ou pedido"/></label>
          {!pendingDelivery&&<label className="license-commerce-confirm"><input type="checkbox" checked={delivery.accepted} onChange={e=>setDelivery(s=>({...s,accepted:e.target.checked}))}/><span>{delivery.purpose==='external_payment'?'Confirmo que recebi o pagamento fora do DeltaTV. Sei que o sistema não valida esse recebimento nem gera comissão automática.':'Confirmo que vou distribuir estas licenças sem cobrança.'}</span></label>}
          <button className="btn primary" type="submit" disabled={busy||(!pendingDelivery&&!deliveryAllowed)}>{pendingDelivery?'Repetir mesma entrega':'Entregar licenças'}</button>
          {pendingDelivery&&<div className="license-commerce-recovery" role="status"><span>Existe uma entrega com confirmação pendente. Não crie outra.</span><button type="button" className="btn" disabled={busy} onClick={checkDelivery}>Verificar no servidor</button></div>}
        </form>}
      </div>
      <div className="card"><h3>Como vender automaticamente</h3><p>Você configura o preço de cada licença e sua revenda faz a compra.</p>
        <div className="license-commerce-method"><strong>Pagamento Pix</strong><p>O dinheiro vai para a conta Mercado Pago do Master. Após a confirmação, as licenças são entregues automaticamente.</p><button type="button" className="btn" onClick={()=>setTab('pix')}>Configurar vendas Pix</button></div>
        <div className="license-commerce-method"><strong>Pagamento com créditos</strong><p>O sistema debita os créditos da revenda e transfere as licenças do seu estoque, numa única transação.</p><button type="button" className="btn" onClick={()=>setTab('precos')}>Definir preços em créditos</button></div>
        <div className="license-commerce-method"><strong>Precisa emitir licenças?</strong><p>Se você é Master principal e tem autorização, emita unidades antes de vendê-las.</p><button type="button" className="btn" onClick={()=>go?.('estoque')}>Abrir estoque e emissão</button></div>
      </div>
    </div>}
    {currentTab==='precos'&&<div className="card"><h3>Preços de venda de licenças por créditos</h3><p className="muted">Cada preço corresponde a uma licença da duração selecionada. Não se trata de vender créditos.</p>
      {!canSell?<p className="error">Sua conta não possui a permissão de venda de licenças.</p>:<>
        <form className="license-commerce-inline" onSubmit={saveCreditOffer}><label>Validade<select value={offer.months} onChange={e=>setOffer(s=>({...s,months:e.target.value}))}>{[1,2,3,4,6,12,24,36].map(m=><option key={m} value={m}>{monthsLabel(m)}</option>)}</select></label><label>Preço por licença (créditos)<input type="number" min="1" required value={offer.priceCredits} onChange={e=>setOffer(s=>({...s,priceCredits:e.target.value}))}/></label><button type="submit" className="btn primary" disabled={busy}>Publicar oferta</button></form>
        <div className="table-wrap"><table><thead><tr><th>Licença</th><th>Preço por unidade</th><th>Estado</th><th>Ação</th></tr></thead><tbody>{prices.map(p=><tr key={p.months}><td>{monthsLabel(p.months)}</td><td>{number(p.priceCredits)} créditos</td><td>{p.active?'À venda':'Pausada'}</td><td><button type="button" className="btn sm" disabled={busy} onClick={()=>doAction(()=>api('/partner/network/prices',{method:'PUT',body:{months:Number(p.months),priceCredits:Number(p.priceCredits),active:!p.active}}),'Oferta atualizada.')}>{p.active?'Pausar':'Reativar'}</button></td></tr>)}</tbody></table></div>
        {!prices.length&&<p className="muted">Nenhuma oferta cadastrada. Publique um preço para começar a vender.</p>}
      </>}
    </div>}
    {currentTab==='comprar'&&<div className="card"><h3>Comprar licenças do meu Master</h3><p>Escolha o prazo e a quantidade. O pagamento é em créditos, mas você receberá <strong>licenças reais no estoque</strong>.</p>
      {(network.offers||[]).length?<div className="license-commerce-form"><div className="license-commerce-fields"><label>Licença<select disabled={busy||!!pendingPurchase} value={activeOffer?.months||''} onChange={e=>setOrder(s=>({...s,months:e.target.value}))}>{network.offers.map(p=><option key={p.months} value={p.months}>{monthsLabel(p.months)} · {p.priceCredits} créditos/unidade</option>)}</select></label><label>Quantidade<input type="number" min="1" required disabled={busy||!!pendingPurchase} value={pendingPurchase?.quantity??order.quantity} onChange={e=>setOrder(s=>({...s,quantity:e.target.value}))}/></label></div>
        <p><strong>Total: {number(pendingPurchase?pendingPurchase.expectedUnitPriceCredits*pendingPurchase.quantity:totalCredits)} créditos</strong></p><button className="btn primary" type="button" disabled={busy||(!pendingPurchase&&(!creditValid||totalCredits>Number(network.creditBalance)))} onClick={submitCreditPurchase}>{pendingPurchase?'Repetir mesma compra':'Comprar licenças'}</button>
        {pendingPurchase&&<div className="license-commerce-recovery" role="status"><span>A compra anterior está sendo verificada. Não faça outra.</span><button type="button" className="btn" disabled={busy} onClick={checkCreditPurchase}>Verificar no servidor</button></div>}
      </div>:<p className="muted">Seu Master ainda não publicou preços por créditos. Você pode verificar a opção Pix abaixo.</p>}
      <button className="btn" type="button" onClick={()=>setTab('pix')}>Quero pagar licenças por Pix</button>
    </div>}
    {currentTab==='pix'&&<MasterPix account={network.account} policy={network.policy} onChanged={()=>{window.dispatchEvent(new Event('stock-changed'));refresh().catch(()=>{});}}/>}
    {currentTab==='historico'&&<div className="card"><h3>Histórico de licenças da rede</h3><p className="muted">Compras por créditos e entregas manuais possuem registros separados. O histórico Pix fica na aba Vendas por Pix.</p>
      <h4>Vendas por créditos</h4><div className="table-wrap"><table><thead><tr><th>Revenda</th><th>Licenças</th><th>Créditos recebidos</th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td>{s.counterpartyName}</td><td>{s.quantity} × {monthsLabel(s.months)}</td><td>{number(s.totalCredits)}</td></tr>)}</tbody></table></div>{!sales.length&&<p className="muted">Nenhuma venda por créditos registrada.</p>}
      <h4>Entregas manuais</h4><div className="table-wrap"><table><thead><tr><th>Data</th><th>Revenda</th><th>Licenças</th><th>Tipo</th></tr></thead><tbody>{deliveries.map(d=><tr key={d.id}><td>{new Date(d.createdAt).toLocaleString('pt-BR')}</td><td>{d.buyerName}</td><td>{d.quantity} × {monthsLabel(d.months)}</td><td>{d.purpose==='external_payment'?'Pagamento externo declarado':'Sem cobrança'}</td></tr>)}</tbody></table></div>{!deliveries.length&&<p className="muted">Nenhuma entrega manual registrada.</p>}
    </div>}
  </section>;
}
