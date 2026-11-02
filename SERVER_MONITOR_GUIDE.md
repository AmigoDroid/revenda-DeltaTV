# DeltaTV — Monitoramento (Revenda)

Nova tela **Ativação → Monitoramento**. Consome `/api/v1/partner/server-monitor` e mostra apenas servidores da própria conta, definidos pelo backend a partir do JWT. Possui busca, filtro de status, paginação, versão móvel em cartões e atualização por WebSocket com sincronização periódica.

Usar `VITE_API_URL=https://api.deltatv.com.br` no `.env.production` para compilar na VPS.
