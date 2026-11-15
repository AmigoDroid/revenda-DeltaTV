/** Menus internos dos ambientes de trabalho; páginas e regras permanecem nos módulos originais. */
export const WORK_AREAS = {
  'area/clientes': {id:'area/clientes',label:'Clientes e TVs',icon:'users',description:'Acompanhe clientes, dispositivos, planos comerciais e atendimento sem voltar ao menu principal.',items:[
    {id:'clientes',page:'clientes',tab:'clientes',label:'Meus clientes',description:'Cadastrar e consultar pessoas sem exigir MAC',icon:'users'},
    {id:'area/clientes/planos',page:'clientes',tab:'planos',label:'Planos de clientes',description:'Criar e gerenciar planos comerciais',icon:'ticket'},
    {id:'area/clientes/antigos',page:'clientes',tab:'antigos',label:'Cadastros por MAC (legado)',description:'Consultar registros anteriores à ficha única',icon:'history'},
    {id:'dispositivos',page:'dispositivos',label:'Dispositivos',description:'Configurar e consultar as TVs',icon:'tv'},
    {id:'suporte',page:'suporte',label:'Diagnosticar TV',description:'Resolver problemas de conexão',icon:'pulse'},
    {id:'tvmessages',page:'tvmessages',label:'Mensagens para TVs',description:'Enviar avisos aos dispositivos',icon:'bell'},
  ]},
  'area/licencas': {id:'area/licencas',label:'Licenças e ativações',icon:'ticket',description:'Aplicar licenças por MAC, consultar estoque e vender licenças da rede.',items:[
    {id:'ativar-tv',page:'ativar-tv',label:'Ativar TV com licença',description:'Aplicar licença ao MAC ou emitir diretamente, quando autorizado',icon:'key'},
    {id:'estoque',page:'estoque',label:'Estoque de licenças',description:'Consultar e administrar unidades disponíveis',icon:'box'},
    {id:'licencas',page:'licencas',label:'Licenças em uso',description:'Consultar prazos e renovações',icon:'ticket'},
    {id:'vender-licencas',page:'vender-licencas',label:'Vender e comprar licenças',description:'Pix, créditos, venda e entrega de unidades',icon:'coin'},
  ]},
  'area/financeiro': {id:'area/financeiro',label:'Financeiro',icon:'wallet',description:'Pagamentos, créditos e cobranças da revenda em uma central.',items:[
    {id:'financeiro',page:'financeiro',label:'Faturas e pagamentos',description:'Consultar mensalidades e pagamentos',icon:'wallet'},
    {id:'creditos',page:'creditos',label:'Créditos comerciais',description:'Saldo e recarga via Pix',icon:'coin'},
    {id:'pix-master',page:'pix-master',label:'Pix da minha rede',description:'Vendas e recebimentos do Master',icon:'wallet'},
  ]},
  'area/aplicativos': {id:'area/aplicativos',label:'Aplicativos e acessos',icon:'download',description:'Códigos, Player Web e instalações dos aplicativos em um só lugar.',items:[
    {id:'codigos',page:'codigos',label:'Códigos para TV',description:'Criar e consultar códigos de ativação',icon:'key'},
    {id:'playerweb',page:'playerweb',label:'Player Web',description:'Acessos no navegador',icon:'tv'},
    {id:'white-label',page:'white-label',label:'Meus aplicativos',description:'Personalização e aplicativos contratados',icon:'download'},
    {id:'aplicativos',page:'aplicativos',label:'Downloads e instalação',description:'Links e instruções para o cliente',icon:'download'},
  ]},
  'area/servidores': {id:'area/servidores',label:'Fontes e servidores',icon:'server',description:'Gerencie seus links e acompanhe a qualidade dos servidores.',items:[
    {id:'servidores',page:'servidores',label:'Fontes de conteúdo',description:'Links, prioridade e qualidade HTTP',icon:'server'},
    {id:'monitoramento',page:'monitoramento',label:'Monitoramento detalhado',description:'Saúde e histórico das origens',icon:'pulse'},
  ]},
  'area/conta': {id:'area/conta',label:'Conta e suporte',icon:'user',description:'Seu perfil, segurança, notificações e ajuda no mesmo ambiente.',items:[
    {id:'conta',page:'conta',label:'Minha conta',description:'Dados pessoais e segurança',icon:'user'},
    {id:'notificacoes',page:'notificacoes',label:'Notificações',description:'Avisos recebidos',icon:'bell'},
    {id:'loginhistory',page:'loginhistory',label:'Histórico de login',description:'Acessos e sessões anteriores',icon:'history'},
    {id:'ajuda',page:'ajuda',label:'Central de ajuda',description:'Tutoriais e instruções',icon:'help'},
  ]},
};
export const LEGACY_CENTERS={'central-pagamentos':'area/financeiro','central-dispositivos':'area/clientes','central-licenciamento':'area/licencas','central-ativacao':'area/licencas','central-conta':'area/conta'};
/** URLs novas dos dashboards. Rotas originais (ex.: #/clientes ou #clients)
 * continuam abrindo exatamente as páginas legadas e não são interceptadas. */
export function workAreaPath(area, item) {
  return `${area.id}/secao/${encodeURIComponent(item.id)}`;
}
export function findWorkArea(route) {
  return Object.values(WORK_AREAS).find(area =>
    route === area.id || area.items.some(item => workAreaPath(area, item) === route || (item.id.startsWith('area/') && item.id === route))
  ) || null;
}

/** Os verificadores de autorização de App/Shell recebem o objeto completo
 * ({ id, page, label, tab }), nunca apenas uma string com o ID da página.
 * A mesma função é usada no menu lateral, cards e testes de regressão. */
export function visibleWorkAreaItems(area, allowed) {
  if (!Array.isArray(area?.items) || typeof allowed !== 'function') return [];
  return area.items.filter(item => allowed(item));
}

/** Retorna a seção somente se a conta tiver acesso à página real.
 * A URL da visão geral não identifica uma seção. */
export function visibleWorkAreaSection(area, route, allowed) {
  return visibleWorkAreaItems(area, allowed).find(item =>
    workAreaPath(area, item) === route || (item.id.startsWith('area/') && item.id === route)
  ) || null;
}
