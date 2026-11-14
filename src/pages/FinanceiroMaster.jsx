import { useEffect, useState } from 'react';
import { api } from '../api.js';
import MasterPix from './MasterPix.jsx';
/** Financeiro da rede sem acoplar o cadastro de Masters à cobrança Pix. */
export default function FinanceiroMaster() {
 const [network,setNetwork]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;api('/partner/network?page=1&pageSize=1').then(v=>{if(live)setNetwork(v);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
 if(error)return <section className="card" role="alert">{error}</section>;
 if(!network)return <section className="card" role="status">Carregando conta de recebimento...</section>;
 return <section><h2>Pagamentos Pix da minha rede</h2><p className="muted">Compre licenças do seu Master ou administre os recebimentos na sua própria conta Mercado Pago, conforme suas permissões.</p>
  <MasterPix account={network.account} policy={network.policy} onChanged={()=>window.dispatchEvent(new Event('stock-changed'))}/>
 </section>;
}
