# PRD - Plataforma de Ofertas de Estabelecimentos (iToke)

## Problem Statement
Plataforma de fidelidade e ofertas para estabelecimentos e clientes. Estabelecimentos criam ofertas com descontos, clientes geram QR Codes (vouchers) para resgatar ofertas, e o sistema rastreia vendas, créditos e comissões de indicação.

## Arquitetura

### Backend (FastAPI + MongoDB)
- **Collections**: `establishments`, `offers`, `users`, `sessions`, `qr_codes`, `vouchers`, `sales_history`, `financial_logs`, `client_tokens`, `client_credits`, `referral_network`, `transactions`
- **Endpoints Principais**:
  - `POST /api/auth/email-login` - Login via email (modo teste)
  - `POST/GET/PUT /api/establishments/{id}` - Gerenciamento do estabelecimento
  - `GET /api/establishments/me/financial` - Saldo para saque
  - `GET /api/establishments/me/sales-history` - Histórico de vendas
  - `POST/GET /api/offers` - Gerenciamento de ofertas
  - `POST /api/qr/generate` - Geração de voucher QR (deduz 1 token + créditos opcionais IMEDIATO)
  - `POST /api/qr/validate` - Validação via code_hash ou backup_code, transfere créditos ao estabelecimento
  - `GET /api/vouchers/my` - Vouchers do cliente com credits_used e final_price_to_pay
  - `POST /api/vouchers/{id}/cancel` - Cancela voucher ativo e DEVOLVE créditos ao cliente
  - `GET /api/referral/share-link` - Link dinâmico de indicação

### Frontend (Expo React Native Web)
- `/(tabs)/qr` - "Meus QR" com breakdown de preço (créditos usados, valor no balcão), botão cancelar
- `/qr-fullscreen` - QR Code scrollable com backup code + detalhes de preço
- `/offer/[id]` - QRModal scrollable com toggle de créditos
- `/establishment/validate` - Validação QR com câmera (expo-camera) + input manual

## Implementation Log
- **25/03/2026**: Implementação completa da refatoração inicial
- **26/03/2026**: Restauração do código do GitHub + Mock Auth
- **28/03/2026**: Bug Fix - Botão "Publicar Oferta", Código Identificador, Referral Links, Financial Dashboard
- **28/03/2026**: QR Code com Créditos - Fluxo Financeiro Completo
- **28/03/2026**: CRITICAL REFACTOR - Vouchers persistidos, backup codes (ITK-XXX), câmera scanner
- **28/03/2026**: FIX - MongoDB ObjectId serialization em /api/qr/validate
- **28/03/2026**: URGENT REFACTOR - Data persistence, credit deduction, scrollable UI, cancel/refund

## Core Requirements (Implementados)
- [x] MODO SIMULAÇÃO: Criação de ofertas sem verificação de tokens
- [x] CÓDIGO DA OFERTA: Formato OFF-XXXXXX para rastreamento
- [x] LINKS DE REFERÊNCIA DINÂMICOS
- [x] CRÉDITOS RECEBIDOS: Dashboard do estabelecimento
- [x] FLUXO DE CRÉDITOS COMPLETO:
  - [x] Dedução IMEDIATA de créditos do cliente na geração do QR
  - [x] Transferência de créditos ao estabelecimento na validação
  - [x] Devolução de créditos ao cancelar voucher
  - [x] Log de transações para histórico na carteira
- [x] VOUCHERS PERSISTIDOS: credits_used, final_price_to_pay, original_price salvo no DB
- [x] SALES HISTORY: Registro completo de vendas
- [x] VALIDAÇÃO QR: Suporte a code_hash e backup_code (ITK-XXX)
- [x] CÂMERA SCANNER: expo-camera na tela de validação
- [x] MEUS QR com breakdown de preço e botão cancelar
- [x] QR FULLSCREEN SCROLLABLE com backup code + detalhes financeiros
- [x] QR MODAL SCROLLABLE sem auto-close
- [x] LAYOUT RESPONSIVO: Textos sem corte em telas pequenas

## Tech Stack
- Backend: FastAPI, Motor (async MongoDB), Pydantic
- Frontend: Expo (React Native Web), Expo Router, Zustand, expo-camera
- AI: Gemini 3.1 Flash Image Preview (via Emergent LLM Key)

## Backlog

### P1 (Alta Prioridade)
- [ ] Edição de ofertas existentes
- [ ] Busca Digital no Media Hub

### P2 (Média Prioridade)
- [ ] Restaurar autenticação Google OAuth
- [ ] Filtro de ofertas por cidade/bairro
- [ ] Refatorar server.py (>2200 linhas) em FastAPI APIRouters
- [ ] Adicionar histórico completo de transações do cliente

## Next Tasks
1. Implementar edição de ofertas existentes
2. Refatorar server.py em módulos
3. Histórico de transações do cliente na carteira
