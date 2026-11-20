import {useEffect,useState} from 'react';
import {api} from '../api.js';
import {formatBRL} from '@deltatv/ui/money';

/** Cobranças da própria revenda, sempre identificada pelo token do portal. */
export default function NetworkCharges(){
 const [charges,setCharges]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const load=async()=>{
  setLoading(true);setError('');try{const response=await api('/partner/network-charges');setCharges(response.data||[])}
  catch(err){setError(err.message||'Não foi possível consultar os pagamentos.')}finally{setLoading(false)}
 };
 useEffect(()=>{void load()},[]);
 const copy=async value=>{try{await navigator.clipboard.writeText(value)}catch{setError('Não foi possível copiar. Selecione o texto na caixa.')}};
 return <section>
  <div className="section-head"><h3>Cobranças da minha rede</h3><button type="button" className="btn sm" onClick={load} disabled={loading}>Atualizar</button></div>
  {error&&<p className="notice" role="alert">{error}</p>}
  {charges.map(c=>{
   const payment=c.pixCode||c.checkoutUrl||'';
   return <div key={c.id} className="card" style={{padding:16,marginBottom:12}}>
    <strong>{c.kind==='one_off'?`Avulsa · ${c.description||'Serviço adicional'}`:c.kind==='renewal'?'Renovação':'Upgrade'}</strong>
    <p>{formatBRL(c.amountCents)} · {c.status==='paid'?'Pago':c.status==='needs_review'?'Em revisão':c.status}</p>
    {payment&&<><label>{c.pixCode?'Pix copia e cola':'Checkout do provedor'}</label>
     <textarea readOnly rows={3} value={payment} style={{width:'100%'}} aria-label="Dados para pagamento"/>
     <div className="row" style={{gap:8}}><button type="button" className="btn sm" onClick={()=>copy(payment)}>Copiar</button>
      {c.checkoutUrl&&<a className="btn sm" href={c.checkoutUrl} target="_blank" rel="noopener noreferrer">Abrir pagamento</a>}</div></>}
    {c.method==='manual'&&c.status==='pending'&&<small>Aguardando confirmação manual do administrador.</small>}
   </div>;
  })}
  {!loading&&!charges.length&&<p>Nenhuma cobrança encontrada.</p>}
 </section>;
}
