# Delta TV — Design renovado do painel da Revenda

Base: `deltatv_revenda_auditoria_corrigido_20261102.zip`.

## Mudanças visuais

- Design consistente com o painel do Parceiro: azul profundo, cartões com superfícies discretas, hierarquia de títulos, navegação por áreas e menu de perfil no canto superior direito.
- Navegação lateral com estado selecionado, ícones e drawer em celular com fechamento por botão, toque fora e tecla Escape.
- Botão de notificações no cabeçalho, contador de não lidas e aviso responsivo no topo.
- Visão Geral com ações rápidas, métricas em cartões, lista de clientes vencidos e estoque organizado.
- Tabelas preservam as ações e se tornam cartões no celular. Menu `RowMenu` continua abrindo em uma folha fixa dentro da tela, inclusive em 320px.
- Componentes de formulários, botões, estados, modais e monitoramento recebem a mesma linguagem visual.

## Arquivos modificados

`index.html`, `src/main.jsx`, `src/Shell.jsx`, `src/icons.jsx`, `src/pages/Home.jsx`. Nova folha `src/design.css` (importada depois de `src/style.css`). Nenhuma rota de API ou configuração de backend foi alterada.

## Publicação

1. Preserve `.git`, `.env`, `.env.production` e outros arquivos de ambiente que não estejam no ZIP.
2. Substitua o frontend existente por este pacote; não apague `.git`.
3. Execute `npm ci` e `npm run build`, então publique `dist/` com o Nginx como de costume.
4. Verifique Login, Início, Clientes, Dispositivos, Códigos, Monitoramento, Notificações e todas as ações por menu em 320px e desktop.

## Validação e limite

- Código JSX analisado sintaticamente com o parser do TypeScript.
- Prévia de layout estática verificada em 320, 390, 768, 1024 e 1440px, sem transbordamento horizontal.
- Os fluxos de autenticação/API/WebSocket não foram alterados.
- A compilação Vite real não pôde ser executada nesta sessão: o cache npm não contém todas as dependências. Valide `npm run build` localmente antes da publicação.
