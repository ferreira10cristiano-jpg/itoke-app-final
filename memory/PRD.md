# PRD - Plataforma de Ofertas de Estabelecimentos (iToke)

## Problem Statement
Plataforma de fidelidade e ofertas para estabelecimentos e clientes. Estabelecimentos criam ofertas com descontos, clientes geram QR Codes (vouchers) para resgatar ofertas, e o sistema rastreia vendas, creditos e comissoes de indicacao.

## Arquitetura
- Backend: FastAPI + MongoDB (Motor async)
- Frontend: Expo React Native Web
- Scanner: html5-qrcode
- Admin: 4 abas (Geral, Financeiro, Saques, Usuarios)

## Implementation Log
- **25-28/03/2026**: MVP completo
- **28-29/03/2026**: Refactors criticos (vouchers, scanner, DOM crash)
- **29/03/2026**: Admin Upgrade P1-P3 (dashboard, financeiro, saques, usuarios)
- **29/03/2026**: Final Polish (categorias, dias semana, QR persistente, referral)
- **30/03/2026**: Mensagem indicacao dinamica + Redesign Premium da Carteira

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Validacao 2 etapas (preview + confirmar recebimento)
- [x] html5-qrcode scanner para web
- [x] Admin: Dashboard completo com 4 abas
- [x] 14 categorias de ofertas
- [x] Mensagem referral dinamica com nome
- [x] Carteira: Redesign premium estilo banco digital
  - Hero com saldo grande + economia total
  - Tokens em card horizontal + botao outline Comprar
  - Ganhe Indicando com botoes lado a lado
  - Minha Rede em lista vertical limpa
  - Historico com cores verde/vermelho

## Backlog
### P1
- [ ] Edicao de ofertas existentes
- [ ] Busca Digital no Media Hub

### P2
- [ ] Restaurar Google OAuth
- [ ] Filtro de ofertas por cidade/bairro
- [ ] Refatorar server.py em APIRouters (>2700 linhas)
- [ ] Historico completo de transacoes do cliente
