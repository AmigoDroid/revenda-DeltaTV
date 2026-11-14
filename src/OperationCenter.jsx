import React from 'react';
import './operation-center.css';
export const CENTER_CONFIG = {
  pagamentos: {title:'Pagamentos',intro:'Tudo sobre Pix, saldo, faturas e compras na sua rede.', entries:[
    ['financeiro','Faturas e pagamentos','Pagamentos e histórico financeiro'],['creditos','Créditos e Pix','Recarregar saldo e consultar extrato'],['rede','Pix do Master e vendas','Comprar licenças via Pix e acompanhar a rede']]},
  dispositivos: {title:'Dispositivos',intro:'Encontre a TV, acompanhe o cliente e resolva problemas.',entries:[
    ['dispositivos','Minhas TVs','Consultar, editar e verificar dispositivos'],['clientes','Clientes','Dados e vencimentos'],['suporte','Resolver problema','Diagnóstico de conexão']]},
  licenciamento: {title:'Licenças',intro:'Controle o estoque e as licenças em uso.',entries:[
    ['estoque','Estoque disponível','Aplicar ou transferir licenças'],['licencas','Licenças em uso','Renovar, suspender e reativar'],['rede','Rede de revendas','Gerenciar os participantes da rede']]},
  ativacao: {title:'Ativar aplicativo',intro:'Escolha o procedimento de ativação do cliente.',entries:[
    ['dispositivos','Ativar uma TV','Vincular e gerenciar dispositivo'],['codigos','Códigos para TV','Criar ou consultar códigos'],['playerweb','Player Web','Acesso pelo navegador'],['aplicativos','Baixar aplicativo','Links e códigos de instalação'],['white-label','Meus aplicativos','Instâncias personalizadas'],['servidores','Servidores','Configuração da origem do conteúdo']]},
  conta: {title:'Minha conta',intro:'Edite o perfil e confira a segurança do acesso.',entries:[
    ['conta','Meu perfil','Dados e preferências'],['loginhistory','Histórico de login','Dispositivos e acessos'],['notificacoes','Notificações','Comunicados'],['ajuda','Central de Ajuda','Tutoriais de uso']]}
};
export function OperationCenter({section,onNavigate,allowed=()=>true}) {
 const config=CENTER_CONFIG[section];if(!config)return null;
 return <section className="operation-center" aria-label={config.title}>
  <header className="operation-center-heading"><span>Central de trabalho</span><h1>{config.title}</h1><p>{config.intro}</p></header>
  <div className="operation-center-grid">{config.entries.filter(([id])=>allowed(id)).map(([id,title,desc])=><button type="button" className="operation-center-action" key={id} onClick={()=>onNavigate(id)}><strong>{title}</strong><span>{desc}</span><b aria-hidden="true">›</b></button>)}</div>
 </section>;
}
