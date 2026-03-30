# PRD - Plataforma de Ofertas de Estabelecimentos (iToke)

## Problem Statement
Plataforma de fidelidade e ofertas para estabelecimentos e clientes com sistema de creditos, tokens, QR codes e comissoes por indicacao multinivel.

## Arquitetura
- Backend: FastAPI + MongoDB (Motor async)
- Frontend: Expo React Native Web
- Scanner: html5-qrcode
- Admin: 5 abas (Geral, Financeiro, Saques, Usuarios, Midias)

## Implementation Log
- **25-28/03/2026**: MVP completo
- **28-29/03/2026**: Refactors criticos (vouchers, scanner, DOM crash)
- **29/03/2026**: Admin Upgrade P1-P3
- **29/03/2026**: Final Polish (categorias, dias semana, QR persistente)
- **30/03/2026**: Redesign Premium Carteira + Mensagem dinamica
- **30/03/2026**: UPGRADE FINAL - Aba Creditos, Midia, Rede detalhada, Instagram

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Validacao 2 etapas (preview + confirmar recebimento)
- [x] Admin: 5 abas completas (Geral, Financeiro, Saques, Usuarios, Midias)
- [x] Aba Creditos: Hero com saldo + frase impacto + "Como ganhar creditos"
- [x] Aba Creditos: "Ganhe creditos indicando" com Instagram + Banco de Midia
- [x] Tabela Minha Rede: Indicados, Ativos, Creditos + Estabelecimentos
- [x] Admin Midias: CRUD (adicionar URL/titulo/tipo, excluir)
- [x] ShareInviteModal: WhatsApp, E-mail, Instagram, Outras redes
- [x] Network API: network_stats com totais/ativos/creditos por nivel

## Backlog
### P1
- [ ] Edicao de ofertas existentes
- [ ] Busca Digital no Media Hub

### P2
- [ ] Restaurar Google OAuth
- [ ] Filtro de ofertas por cidade/bairro
- [ ] Refatorar server.py em APIRouters (>2800 linhas)
- [ ] Historico completo de transacoes do cliente
