import { useEffect, useState } from "react";
import { api } from "../api.js";
import { usePortal } from "../portal.jsx";

const monthsLabel = n => `${n} ${n===1?"mês":"meses"}`;
const keyFor = id => `delta-master-issuance:${id}`;

/** Emissão sempre feita no contexto do estoque, nunca em uma tela financeira paralela. */
export default function MasterSelfIssuance({onIssued}) {
  const {me} = usePortal();
  const [authorization,setAuthorization]=useState(null);
  const [months,setMonths]=useState("12"),[quantity,setQuantity]=useState("1");
  const [pending,setPending]=useState(null),[verifiedAbsent,setVerifiedAbsent]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  useEffect(()=>{
    if(!me?.id)return;
    let alive=true;
    api("/partner/network/self-issuance").then(r=>{if(alive)setAuthorization(r);}).catch(e=>{if(alive)setError(e.message);});
    try{const saved=JSON.parse(sessionStorage.getItem(keyFor(me.id))||"null");if(alive)setPending(saved?.idempotencyKey?saved:null);}
    catch{sessionStorage.removeItem(keyFor(me.id));}
    return ()=>{alive=false;};
  },[me?.id]);
  if(!authorization?.eligible)return null;
  const priceFor = m => authorization?.prices?.find(p => p.months === Number(m))?.priceCredits ?? null;
  const quotedUnit = priceFor(pending?.months ?? months);
  const quotedTotal = quotedUnit == null ? null : quotedUnit * Number(pending?.quantity ?? quantity);
  const canCover = Number.isSafeInteger(quotedTotal) && quotedTotal > 0 && quotedTotal <= Number(authorization?.creditBalance ?? 0);
  const finish=()=>{sessionStorage.removeItem(keyFor(me.id));setPending(null);setVerifiedAbsent(false);};
  const emit=async(e)=>{
    e.preventDefault();if(busy||!authorization.enabled||(!pending&&!canCover))return;
    const record=pending||{months:Number(months),quantity:Number(quantity),idempotencyKey:crypto.randomUUID()};
    if(!pending){sessionStorage.setItem(keyFor(me.id),JSON.stringify(record));setPending(record);}
    setBusy(true);setError("");setNotice("");
    try{
      const result=await api("/partner/network/self-issuance",{method:"POST",body:record});
      finish();setNotice(result.alreadyProcessed?"Emissão anterior confirmada; nenhuma nova unidade foi criada.":`${record.quantity} licença(s) de ${monthsLabel(record.months)} adicionada(s) ao estoque por ${result.totalCredits} créditos.`);
      onIssued?.();
      api("/partner/network/self-issuance").then(setAuthorization).catch(()=>{});
    }catch(err){setError(`${err.message} A tentativa está preservada. Use Verificar para evitar emissão duplicada.`);}
    finally{setBusy(false);}
  };
  const verify=async()=>{
    if(!pending||busy)return;setBusy(true);setError("");setNotice("");
    try{const r=await api(`/partner/network/self-issuance/requests/${pending.idempotencyKey}`);
      if(r.request){finish();setNotice("Emissão confirmada no servidor; nenhuma unidade extra foi gerada.");onIssued?.();api("/partner/network/self-issuance").then(setAuthorization).catch(()=>{});}
      else{setVerifiedAbsent(true);setNotice("A emissão não foi encontrada. Você pode repetir a operação com a mesma identificação.");}
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  return <section className="card" aria-label="Emissão própria do Master">
    <div className="section-head"><h3>Emitir licenças para meu estoque</h3></div>
    {authorization.enabled?<>
      <p className="muted">Emissão com cobertura obrigatória: o valor é debitado da sua carteira de créditos na mesma transação que gera o estoque. Saldo atual: <strong>{authorization.creditBalance ?? 0} créditos</strong>. Sem saldo ou preço configurado, não é possível emitir.</p>
      <form className="row" style={{gap:12,alignItems:"end",flexWrap:"wrap"}} onSubmit={emit}>
        <label>Duração<select value={pending?.months??months} disabled={busy||!!pending} onChange={e=>setMonths(e.target.value)}>
          {[1,2,3,4,6,12,24,36].map(m=><option key={m} value={m}>{monthsLabel(m)}</option>)}
        </select></label>
        <label>Quantidade<input type="number" min="1" max="10000" required disabled={busy||!!pending} value={pending?.quantity??quantity} onChange={e=>setQuantity(e.target.value)}/></label>
        <button type="submit" className="btn primary" disabled={busy||(!pending&&(!canCover||!Number.isSafeInteger(Number(quantity))||Number(quantity)<1||Number(quantity)>10000))}>{pending?"Repetir emissão pendente":"Emitir licenças"}</button>
      </form>
      <p className="muted" role="status">{quotedUnit == null ? "Preço não configurado para esta duração." : `Preço: ${quotedUnit} crédito(s) por licença · Total: ${Number.isFinite(quotedTotal)?quotedTotal:"—"} crédito(s).`}{!canCover && !pending && quotedUnit != null ? " Saldo insuficiente." : ""}</p>
      <p className="muted" style={{fontSize:12}}>Máximo técnico de 10.000 unidades por operação, sem quota comercial acumulada imposta por este recurso.</p>
      {pending&&<div className="row" style={{gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <span>Tentativa pendente: {pending.quantity} × {monthsLabel(pending.months)}.</span>
        <button type="button" className="btn" disabled={busy} onClick={verify}>Verificar no servidor</button>
        {verifiedAbsent&&<button type="button" className="btn" disabled={busy} onClick={()=>{if(window.confirm("A última consulta não encontrou a emissão. Descartar a tentativa?")){finish();setNotice("");}}}>Descartar tentativa</button>}
      </div>}
    </>:<p className="muted">Emissão pré-paga desativada pelo DeltaTV. As licenças já existentes continuam disponíveis.</p>}
    {error&&<p role="alert" className="error">{error}</p>}
    {notice&&<p role="status" style={{color:"var(--ok)"}}>{notice}</p>}
  </section>;
}
