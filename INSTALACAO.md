# DeltaTV — Dashboard separado da Rede de Revendas

## O que foi implementado

No painel Revenda/Master, o menu **Minha rede de revendas** agora abre um dashboard independente, substituindo a barra lateral principal por um menu exclusivo da rede. A navegação é profunda e compatível com o botão voltar:

- `#/rede` — Visão geral, indicadores, contrato e acessos rápidos
- `#/rede/revendas` — Revendas diretas, status, aprovação, suspensão e promoção autorizada
- `#/rede/convites` — Gerar, compartilhar e revogar convites
- `#/rede/hierarquia` — Árvore completa, paginação e indicadores
- `#/rede/permissoes` — Recursos e permissões das revendas diretas
- `#/rede/comissoes` — Configuração e histórico de comissões
- `#/rede/licencas` — Vendas, Pix, créditos, entrega manual, preços e histórico (reutiliza a única implementação `LicenseTrading.jsx`)
- `#/rede/assinatura` — Contrato, plano e direitos comerciais

O menu só mostra seções permitidas para o perfil. Revendas comuns não veem as ferramentas de Master. O backend continua validando TODAS as operações.

## Correções e compatibilidade

- Mantém as rotas REST anteriores, autorização, inventário, Pix e contabilidade financeira: nenhuma migração necessária.
- Remove a tela antiga onde todas as tarefas eram exibidas uma embaixo da outra.
- O link antigo `#/rede` continua funcionando. Para retornar ao painel principal, clique em **Voltar ao painel principal** ou **Sair da rede**.
- A busca pode abrir diretamente os novos destinos, como `#/rede/convites`.
- A tela comercial reutiliza `LicenseTrading.jsx` — **não foi criada uma segunda lógica de venda**.
- A API continua sendo a fonte dos dados; não existem valores simulados na tela.
- Não existe mudança de Nginx ou de backend nesta entrega.

## Instalar o hotfix sem sobrescrever o restante do projeto

1. Faça backup da pasta atual. Exemplo:

   ```bash
   cp -a /var/www/revenda-DeltaTV /var/www/revenda-DeltaTV.backup-$(date +%Y%m%d-%H%M%S)
   ```

2. Envie `DeltaTV-rede-dashboard-hotfix.zip` para `/var/www/revenda-DeltaTV`.
3. Extraia na raiz do projeto:

   ```bash
   cd /var/www/revenda-DeltaTV
   unzip -o DeltaTV-rede-dashboard-hotfix.zip
   ```

4. Confirme a API de produção no `.env.production`, conforme sua instalação atual. Não sobrescreva o arquivo `.env.production` do servidor.
5. Execute:

   ```bash
   npm run build
   npm test
   ```

6. Confira os arquivos compilados no diretório `dist/` e valide o fluxo em navegador com conta Master e conta Revenda, antes de disponibilizar a nova interface.

O pacote `DeltaTV-rede-dashboard-standalone.zip` contém uma cópia do projeto da Revenda completo (com `vendor/deltatv-ui`) e é apropriado para teste em pasta separada. O hotfix é recomendado para uma VPS com o painel já funcionando.

## Testes locais executados

- `node --test tests/*.test.js`: 32 testes aprovados (inclui 8 testes novos da navegação por perfil).
- Parsing dos arquivos JSX/JS pelo parser TypeScript: sem erro nos arquivos alterados.
- Verificação dos imports relativos: sem arquivos ausentes.
- Parsing CSS pelo PostCSS: sem erro.

**Limitação:** o `npm ci` não concluiu no ambiente de desenvolvimento (acesso ao registro de pacotes indisponível/timeout). A compilação Vite completa, navegação visual e integração real com backend precisam ser verificadas em homologação. Não altere a VPS de produção sem backup.

## Arquivos alterados / acrescentados

- `src/Shell.jsx`: entrada para o dashboard exclusivo.
- `src/pages/Network.jsx`: nova interface, ações preservadas.
- `src/pages/network-navigation.js`: catálogo e filtro de acesso reutilizáveis.
- `src/pages/network-dashboard.css`: estilo profissional com responsividade e temas atuais.
- `src/task-directory.js`: novas rotas e pesquisa por tarefas.
- `tests/network-dashboard.test.js`: testes novos.

### APIs reaproveitadas

`/partner/network`, `/partner/network/resources`, `/partner/network/invites`, `/partner/network/tree`, `/partner/network/summary`, `/partner/network/children/:id/*`, `/partner/commerce/commissions`, `/partner/commerce/master-contract` e APIs existentes de venda por Pix/créditos/entrega direta usadas pelo componente `LicenseTrading`.
