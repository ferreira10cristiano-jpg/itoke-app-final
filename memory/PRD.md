# PRD - Plataforma de Ofertas de Estabelecimentos (iToke)

## Problem Statement
Plataforma de fidelidade e ofertas para estabelecimentos e clientes. Estabelecimentos criam ofertas com descontos, clientes geram QR Codes (vouchers) para resgatar ofertas, e o sistema rastreia vendas, creditos e comissoes de indicacao.

## Arquitetura

### Backend (FastAPI + MongoDB)
- **Collections**: `establishments`, `offers`, `users`, `sessions`, `qr_codes`, `vouchers`, `sales_history`, `financial_logs`, `client_tokens`, `client_credits`, `referral_network`, `transactions`, `token_purchases`, `platform_settings`, `withdrawal_requests`
- **Endpoints Principais**:
  - Auth: `POST /api/auth/email-login`
  - QR: `POST /api/qr/generate`, `POST /api/qr/validate`, `POST /api/qr/confirm`
  - Vouchers: `GET /api/vouchers/my`, `POST /api/vouchers/{id}/cancel`
  - Categories: `GET /api/categories` (14 segmentos incluindo Pousada/Hotel/Petshop/Veterinario)
  - Admin Stats: `GET /api/admin/stats`, `GET /api/admin/search-voucher`
  - Admin Financial: `GET /api/admin/financial`, `GET /api/admin/settings`, `PUT /api/admin/settings`
  - Admin Withdrawals: `GET /api/admin/withdrawals`, `POST /api/admin/withdrawals/approve`
  - Admin Users: `GET /api/admin/users`, `PUT /api/admin/users/{user_id}/block`

### Frontend (Expo React Native Web)
- Admin Dashboard: 4 abas (Geral, Financeiro, Saques, Usuarios)
- QR Modal: displayMode state (generate/loading/result), QR persiste na tela, X → Meus QR
- Offer Creation: WEEKDAYS com nomes completos, MAX button abaixo do input

## Implementation Log
- **25-28/03/2026**: MVP completo com ofertas, QR codes, validacao
- **28/03/2026**: CRITICAL REFACTOR - Vouchers persistidos, backup codes, camera scanner
- **29/03/2026**: CRITICAL FIX - removeChild DOM crash, html5-qrcode scanner
- **29/03/2026**: ADMIN P1 - Fundo branco, dados reais, busca voucher com auditoria
- **29/03/2026**: ADMIN P2 - Aba Financeiro (receita bruta/liquida, saldo a liquidar, comissao global)
- **29/03/2026**: ADMIN P3 - Aba Saques (aprovacao com auditoria) + Aba Usuarios (tabela com bloquear/desbloquear)
- **29/03/2026**: FINAL POLISH - 6 melhorias: categorias, dias da semana, QR persistente, MAX btn, feedback compra, referral msg

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Validacao 2 etapas (preview + confirmar recebimento)
- [x] html5-qrcode scanner para web
- [x] Cancelamento de voucher com devolucao de creditos
- [x] Admin: Dashboard completo com 4 abas (Geral, Financeiro, Saques, Usuarios)
- [x] Admin: Busca por voucher, receita bruta/liquida, comissao global
- [x] Admin: Gestao de saques e usuarios com bloquear/desbloquear
- [x] Categorias: 14 segmentos (Pousada, Hotel, Petshop, Veterinario adicionados)
- [x] Dias da semana: Nomes completos (Segunda, Terca, Quarta, Quinta, Sexta, Sabado, Domingo)
- [x] QR Code: Persiste na tela apos geracao, X fecha e vai para Meus QR
- [x] MAX button: Reposicionado abaixo do campo de creditos
- [x] Feedback de compra: window.alert no web com "Compra realizada com sucesso!"
- [x] Mensagem de indicacao: Texto atualizado conforme solicitado

## Backlog
### P1
- [ ] Edicao de ofertas existentes
- [ ] Busca Digital no Media Hub

### P2
- [ ] Restaurar Google OAuth
- [ ] Filtro de ofertas por cidade/bairro
- [ ] Refatorar server.py em APIRouters (>2700 linhas)
- [ ] Historico completo de transacoes do cliente
