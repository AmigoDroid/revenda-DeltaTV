import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const BASE = '/partner/network/master-pix';
const copy = async (value) => { try { await navigator.clipboard.writeText(value); } catch { window.prompt('Copie o texto:', value); } };
const KEY_TYPES = [['cpf_cnpj', 'CPF ou CNPJ'], ['email', 'E-mail'], ['phone', 'Telefone'], ['random', 'Chave aleatória']];
const box = { border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'grid', gap: 10 };

function Status({ gateway }) {
  if (!gateway?.configured) return <span className="muted">Não configurado</span>;
  return <span style={{ color: gateway.enabled ? 'var(--ok)' : undefined }}>{gateway.enabled ? 'Ativo' : 'Pausado'}{gateway.pendingPayments ? ` · ${gateway.pendingPayments} cobrança(s) em aberto` : ''}</span>;
}

/** Cada vendedor da rede configura seus próprios recebimentos. O dinheiro cai direto na conta dele; credenciais não voltam para a tela. */
export default function PaymentGateways({ onChanged }) {
  const [gateways, setGateways] = useState([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [mp, setMp] = useState({ accessToken: '', webhookSecret: '', currentPassword: '' });
  const [ip, setIp] = useState({ handle: '', apiKey: '', currentPassword: '' });
  const [px, setPx] = useState({ keyType: 'cpf_cnpj', key: '', receiverName: '', receiverCity: '', currentPassword: '' });
  const load = useCallback(async () => { setGateways((await api(`${BASE}/gateways`)).data || []); }, []);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);
  const by = (provider) => gateways.find((g) => g.provider === provider);
  const run = async (fn, success) => {
    if (busy) return false;
    setBusy(true); setError(''); setMessage('');
    try { await fn(); setMessage(success); await load(); onChanged?.(); return true; }
    catch (e) { setError(e.message || 'Não foi possível salvar.'); return false; }
    finally { setBusy(false); }
  };
  const toggle = (g) => run(() => api(`${BASE}/gateways/${g.provider}`, { method: 'PATCH', body: { active: !g.enabled } }), 'Situação do recebimento alterada.');
  const saveMp = async () => { if (await run(() => api(`${BASE}/settings`, { method: 'PUT', body: { ...mp, active: true } }), 'Mercado Pago validado e ativado.')) setMp({ accessToken: '', webhookSecret: '', currentPassword: '' }); };
  const saveIp = async () => {
    const body = { handle: ip.handle, currentPassword: ip.currentPassword, active: true, ...(ip.apiKey ? { apiKey: ip.apiKey } : {}) };
    if (await run(() => api(`${BASE}/gateways/infinitepay`, { method: 'PUT', body }), 'InfinitePay salvo e ativado.')) setIp({ handle: '', apiKey: '', currentPassword: '' });
  };
  const savePx = async () => { if (await run(() => api(`${BASE}/gateways/manual_pix`, { method: 'PUT', body: { ...px, active: true } }), 'Pix com sua chave salvo e ativado.')) setPx((v) => ({ ...v, key: '', currentPassword: '' })); };
  const g = { mp: by('mercadopago'), ip: by('infinitepay'), px: by('manual_pix') };
  return <div style={{ display: 'grid', gap: 12 }}>
    <h3>1. Como eu recebo dos meus compradores</h3>
    <p className="muted">Configure um ou mais meios. Quem compra de você escolhe entre os que estiverem ativos. O dinheiro vai direto para a sua conta; a plataforma não toca nele.</p>
    {error && <p className="error" role="alert">{error}</p>}{message && <p role="status" style={{ color: 'var(--ok)' }}>{message}</p>}

    <div style={box}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><strong>Mercado Pago</strong><Status gateway={g.mp} /></div>
      <p className="muted">Pix automático: o QR Code é gerado e a entrega acontece sozinha quando o pagamento é confirmado.</p>
      {g.mp?.configured && <p className="muted">Conta identificada: {g.mp.accountRef}</p>}
      <details><summary>{g.mp?.configured ? 'Trocar credenciais' : 'Configurar Mercado Pago'}</summary>
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          <label>Access Token de produção<input type="password" autoComplete="off" value={mp.accessToken} onChange={(e) => setMp((v) => ({ ...v, accessToken: e.target.value }))} placeholder="APP_USR-..." /></label>
          <label>Chave secreta do Webhook<input type="password" autoComplete="off" value={mp.webhookSecret} onChange={(e) => setMp((v) => ({ ...v, webhookSecret: e.target.value }))} /></label>
          <label>Confirme sua senha do DeltaTV<input type="password" autoComplete="current-password" value={mp.currentPassword} onChange={(e) => setMp((v) => ({ ...v, currentPassword: e.target.value }))} /></label>
          <button className="btn primary" disabled={busy || mp.accessToken.length < 30 || mp.webhookSecret.length < 16 || mp.currentPassword.length < 8} onClick={saveMp}>Validar e ativar</button>
        </div>
      </details>
      {g.mp?.webhookUrl && <label>URL de notificação (cole no Mercado Pago)<input readOnly value={g.mp.webhookUrl} onFocus={(e) => e.target.select()} /><button className="btn sm" onClick={() => copy(g.mp.webhookUrl)}>Copiar URL</button></label>}
      {g.mp?.configured && <button className="btn sm" disabled={busy} onClick={() => toggle(g.mp)}>{g.mp.enabled ? 'Pausar vendas' : 'Ativar vendas'}</button>}
    </div>

    <div style={box}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><strong>InfinitePay</strong><Status gateway={g.ip} /></div>
      <p className="muted">Link de pagamento da InfinitePay (Pix ou cartão). A entrega é automática depois que a InfinitePay confirma. Ative o <em>Checkout Integrado</em> nas configurações da sua conta InfinitePay.</p>
      {g.ip?.configured && <p className="muted">InfiniteTag: {g.ip.accountRef}{g.ip.hasApiKey ? ' · chave de API cadastrada' : ' · sem chave de API (links não expiram sozinhos)'}</p>}
      <details><summary>{g.ip?.configured ? 'Trocar dados' : 'Configurar InfinitePay'}</summary>
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          <label>Sua InfiniteTag (sem o $)<input autoComplete="off" value={ip.handle} onChange={(e) => setIp((v) => ({ ...v, handle: e.target.value }))} placeholder="minha-loja" /></label>
          <label>Chave de API (opcional, começa com inchk_)<input type="password" autoComplete="off" value={ip.apiKey} onChange={(e) => setIp((v) => ({ ...v, apiKey: e.target.value }))} /></label>
          <label>Confirme sua senha do DeltaTV<input type="password" autoComplete="current-password" value={ip.currentPassword} onChange={(e) => setIp((v) => ({ ...v, currentPassword: e.target.value }))} /></label>
          <button className="btn primary" disabled={busy || ip.handle.trim().length < 2 || ip.currentPassword.length < 8} onClick={saveIp}>Salvar e ativar</button>
        </div>
      </details>
      {g.ip?.configured && <button className="btn sm" disabled={busy} onClick={() => toggle(g.ip)}>{g.ip.enabled ? 'Pausar vendas' : 'Ativar vendas'}</button>}
    </div>

    <div style={box}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><strong>Pix com a minha chave</strong><Status gateway={g.px} /></div>
      <p className="muted">Sem integração: o comprador paga o Pix copia e cola na sua chave e avisa. Você confere no seu banco e clica em <em>Confirmar recebimento</em> para liberar as licenças.</p>
      {g.px?.configured && <p className="muted">Chave: {g.px.accountRef} · recebedor: {g.px.receiverName} ({g.px.receiverCity})</p>}
      <details><summary>{g.px?.configured ? 'Trocar chave' : 'Cadastrar chave Pix'}</summary>
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          <label>Tipo da chave<select value={px.keyType} onChange={(e) => setPx((v) => ({ ...v, keyType: e.target.value }))}>{KEY_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>Chave Pix<input autoComplete="off" value={px.key} onChange={(e) => setPx((v) => ({ ...v, key: e.target.value }))} /></label>
          <label>Nome do recebedor (como no banco)<input maxLength={25} value={px.receiverName} onChange={(e) => setPx((v) => ({ ...v, receiverName: e.target.value }))} /></label>
          <label>Cidade<input maxLength={15} value={px.receiverCity} onChange={(e) => setPx((v) => ({ ...v, receiverCity: e.target.value }))} /></label>
          <label>Confirme sua senha do DeltaTV<input type="password" autoComplete="current-password" value={px.currentPassword} onChange={(e) => setPx((v) => ({ ...v, currentPassword: e.target.value }))} /></label>
          <button className="btn primary" disabled={busy || px.key.trim().length < 3 || px.receiverName.trim().length < 2 || px.receiverCity.trim().length < 2 || px.currentPassword.length < 8} onClick={savePx}>Salvar e ativar</button>
        </div>
      </details>
      {g.px?.configured && <button className="btn sm" disabled={busy} onClick={() => toggle(g.px)}>{g.px.enabled ? 'Pausar vendas' : 'Ativar vendas'}</button>}
    </div>
  </div>;
}
