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
  - Admin Stats: `GET /api/admin/stats`, `GET /api/admin/search-voucher`
  - Admin Financial: `GET /api/admin/financial`, `GET /api/admin/settings`, `PUT /api/admin/settings`
  - Admin Withdrawals: `GET /api/admin/withdrawals`, `POST /api/admin/withdrawals/approve`
  - Admin Users: `GET /api/admin/users`, `PUT /api/admin/users/{user_id}/block`
  - Admin Transactions: `GET /api/admin/transactions`

### Frontend (Expo React Native Web)
- Admin Dashboard: 4 abas (Geral, Financeiro, Saques, Usuarios)

## Implementation Log
- **25-28/03/2026**: MVP completo com ofertas, QR codes, validacao
- **28/03/2026**: CRITICAL REFACTOR - Vouchers persistidos, backup codes, camera scanner
- **29/03/2026**: CRITICAL FIX - removeChild DOM crash, html5-qrcode scanner
- **29/03/2026**: ADMIN P1 - Fundo branco, dados reais, busca voucher com auditoria
- **29/03/2026**: ADMIN P2 - Aba Financeiro (receita bruta/liquida, saldo a liquidar, comissao global)
- **29/03/2026**: ADMIN P3 - Aba Saques (aprovacao com auditoria) + Aba Usuarios (tabela com bloquear/desbloquear)

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Validacao 2 etapas (preview + confirmar recebimento)
- [x] html5-qrcode scanner para web
- [x] Cancelamento de voucher com devolucao de creditos
- [x] Admin: Fundo branco, cards com dados reais MongoDB
- [x] Admin: Top 5 Estabelecimentos por vendas
- [x] Admin: Busca por codigo de voucher com modal de auditoria
- [x] Admin: Receita Bruta / Liquida / Saldo a Liquidar
- [x] Admin: Configuracao de Comissao Global (%) salva no MongoDB
- [x] Admin: Aba Saques - Lista estabelecimentos com saldo, PIX, botao Aprovar
- [x] Admin: Aprovacao de saque deduz saldo, cria registro, log de auditoria
- [x] Admin: Aba Usuarios - Tabela com Nome, Email, Tipo, Status, Bloquear/Desbloquear

## Backlog
### P1
- [ ] Edicao de ofertas existentes
- [ ] Busca Digital no Media Hub

### P2
- [ ] Restaurar Google OAuth
- [ ] Filtro de ofertas por cidade/bairro
- [ ] Refatorar server.py em APIRouters (>2600 linhas)
- [ ] Historico completo de transacoes do cliente
