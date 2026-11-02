# Faixa de alerta de servidores

Componente `src/ServerHealthAlert.jsx` exibido no topo do portal (`src/Shell.jsx`).

- Alerta visível em todas as páginas quando o monitor reporta URLs lentas, instáveis ou indisponíveis.
- Exibe servidor, host, tempo de resposta e botão "Ver monitoramento".
- Usa `/partner/server-monitor/alerts` no backend atualizado.
- Atualiza ao receber `server-health` no WebSocket, ao voltar à aba e periodicamente a cada 60 s.
- Não executa testes de rede a partir do navegador nem faz requisições em segundo plano com a aba oculta.
- Não requer variável `.env` adicional além de `VITE_API_URL` já usada pelo painel.
