// Uma única área operacional para a rede comercial; não replica os serviços de venda/compra.
export const NETWORK_SECTIONS = [
  { id: "resumo", label: "Visão geral", icon: "home", description: "Indicadores e próximos passos", access: "all" },
  { id: "revendas", label: "Minhas revendas", icon: "users", description: "Contas, situação e equipe", access: "master" },
  { id: "convites", label: "Convites", icon: "plus", description: "Links de cadastro", access: "invite" },
  { id: "hierarquia", label: "Hierarquia", icon: "users", description: "Estrutura completa da rede", access: "invite" },
  { id: "permissoes", label: "Permissões", icon: "shield", description: "Recursos de cada revenda", access: "invite" },
  { id: "comissoes", label: "Comissões", icon: "coin", description: "Regras e créditos recebidos", access: "sell" },
  { id: "licencas", label: "Vender / comprar licenças", icon: "ticket", description: "Pix, créditos e entregas", access: "trade" },
  { id: "assinatura", label: "Minha assinatura", icon: "wallet", description: "Contrato e direitos de uso", access: "all" },
];


export function allowedNetworkSections(network) {
  if (!network) return [NETWORK_SECTIONS[0]];
  const master = network.account?.distributionRole === "master";
  return NETWORK_SECTIONS.filter(section => {
    if (section.access === "all") return true;
    if (section.access === "master") return master;
    if (section.access === "invite") return master && Boolean(network.policy?.canInvite);
    if (section.access === "sell") return master && Boolean(network.policy?.canSell);
    if (section.access === "trade") return (master && Boolean(network.policy?.canSell)) || Boolean(network.parent);
    return false;
  });
}

