import {useEffect,useState} from 'react';

// Mesma tela em revenda e parceiro. A API determina quem pode ser selecionado:
// o navegador nunca define titular, permissao ou escopo por conta propria.
export default function AdminPortalAccounts({api,acceptSession,getAuth,logout,portalName='portal',selectionOnly=false}) {
  const [accounts,setAccounts]=useState([]);
  const [query,setQuery]=useState('');
  const [page,setPage]=useState(1);
  const [meta,setMeta]=useState({totalPages:1,total:0});
  const [selected,setSelected]=useState(getAuth()?.user?.partnerId||'');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const accountId=getAuth()?.user?.partnerId;
  useEffect(()=>{
    let active=true;
    setLoading(true);
    api('/auth/portal-accounts',{query:{q:query||undefined,page}}).then(result=>{
      if(!active)return;
      const options=result.data||[];
      if(result.selectedPartner && !options.some(p=>p.id===result.selectedPartner.id)) options.unshift(result.selectedPartner);
      setAccounts(options);
      setMeta(result.meta||{totalPages:1,total:options.length});
      setSelected(v=>options.some(p=>p.id===v)?v:(result.selectedPartnerId||options[0]?.id||''));
      setError('');
    }).catch(err=>{if(active)setError(err.message)}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[api,accountId,query,page]);
  const change=async e=>{
    e.preventDefault();
    if(!selected)return;
    setBusy(true);setError('');
    try {
      const result=await api('/auth/portal-account/select',{method:'POST',body:{partnerId:selected}});
      acceptSession(result);
    } catch(err){setError(err.message)} finally{setBusy(false)}
  };
  const form=(
    <form onSubmit={change} style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
      {selectionOnly&&<input type="search" aria-label="Pesquisar conta" placeholder="Buscar parceiro ou revenda" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} style={{padding:8,borderRadius:8,border:'1px solid #aab3c2',minWidth:180}}/>}
      <label htmlFor="portal-admin-account" style={{fontWeight:600,fontSize:13}}>Conta da minha rede</label>
      <select id="portal-admin-account" aria-label="Conta operacional" value={selected} onChange={e=>setSelected(e.target.value)} disabled={loading||busy||accounts.length===0}
        style={{maxWidth:270,padding:'8px',borderRadius:8,border:'1px solid var(--border, #b6bdc9)',background:'var(--surface, #fff)',color:'var(--text, #222)'}}>
        {!accounts.length&&<option value="">Nenhuma conta ativa</option>}
        {accounts.map(account=><option key={account.id} value={account.id}>{account.name} ({account.kind==='both'?'Ambos':account.kind==='content'?'Parceiro':'Revenda'})</option>)}
      </select>
      <button type="submit" className="btn primary sm" disabled={loading||busy||!selected||(!selectionOnly&&selected===accountId)}>
        {busy?'Abrindo…':'Abrir conta'}
      </button>
      {meta.totalPages>1&&<span style={{display:'flex',gap:6,alignItems:'center'}}><button type="button" className="btn sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button><small>{page}/{meta.totalPages}</small><button type="button" className="btn sm" disabled={page>=meta.totalPages} onClick={()=>setPage(p=>p+1)}>Próxima</button></span>}
    </form>
  );
  if(selectionOnly) return <main style={{maxWidth:580,margin:'8vh auto',padding:'28px',borderRadius:16,background:'var(--surface, #fff)',color:'var(--text, #222)',boxShadow:'0 8px 32px #0002'}}>
    <h1 style={{fontSize:24,margin:'0 0 12px'}}>Acessar {portalName}</h1>
    <p>Você entrou com seu usuário e senha de Admin. Escolha uma conta ativa da sua rede para operar neste painel.</p>
    {loading?<p>Carregando contas…</p>:meta.total===0&&!query?<p>Nenhuma conta compatível está ativa na sua rede. Cadastre um parceiro ou revenda no Painel do Admin para começar.</p>:form}
    {error&&<p role="alert" style={{color:'#bd3131'}}>{error}</p>}
    <p style={{marginTop:22,display:'flex',gap:16,alignItems:'center'}}><a href="https://admin.deltatv.com.br" target="_blank" rel="noreferrer">Abrir Painel do Admin</a>{logout&&<button type="button" className="btn sm" onClick={()=>void logout()}>Sair da conta</button>}</p>
  </main>;
  return <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
    {form}{error&&<span role="alert" style={{fontSize:12,color:'#c72f2f'}}>{error}</span>}
  </div>;
}
