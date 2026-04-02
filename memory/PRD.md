# PRD - Plataforma de Ofertas de Estabelecimentos (iToke)

## Problem Statement
Plataforma de fidelidade e ofertas para estabelecimentos e clientes com sistema de creditos, tokens, QR codes e comissoes por indicacao multinivel.

## Arquitetura
- Backend: FastAPI + MongoDB (Motor async)
- Frontend: Expo React Native Web
- Scanner: html5-qrcode
- Admin: 6 abas (Geral, Financeiro, Saques, Usuarios, Midias, FAQ)

## Implementation Log
- **25-28/03/2026**: MVP completo
- **28-29/03/2026**: Refactors criticos
- **29/03/2026**: Admin Upgrade P1-P3 + Final Polish
- **30/03/2026**: Redesign Premium Carteira + UPGRADE FINAL + Midias IA
- **31/03/2026**: Pacotes Tokens + Comissões 3 níveis + QR Code + Mídias v2 + Instagram + FAQ
- **01/04/2026**: Reestruturação Ofertas + ViaCEP + Validação Step 3 + Dashboard flexível + Resgate PIX
- **02/04/2026**: Tela Meu Perfil + Fix Skip + Ícones Ionicons
- **02/04/2026**: Sistema de Equipe de Validação (Garçons/Caixa) — Rota pública /v/[id], registro de colaborador, scanner QR, Finalizar/Pendente, painel Equipe no Dashboard com bloqueio

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Admin: 6 abas completas
- [x] Compartilhamento: WhatsApp, Instagram (clipboard), Email
- [x] Pacotes de Tokens + Comissão 3 níveis
- [x] QR Code persistente + Aba Ofertas (filtros, categorias, CTA)
- [x] ViaCEP + Validação obrigatória (Step 3)
- [x] Cadastro flexível: "Preencher depois"
- [x] Dashboard: Resgate PIX + Meu Perfil + Equipe/Validadores
- [x] Sistema de Equipe: Rota /v/[id] (público), registro colaborador, scanner, Finalizar/Pendente, bloqueio
- [x] Histórico: vendas com "Validado por: [Nome]"

## Backlog
### P1
- [ ] Edição de ofertas existentes
- [ ] Busca Digital no Media Hub

### P2
- [ ] Google OAuth
- [ ] Histórico completo de transações do cliente
- [ ] Refatorar server.py em APIRouters (>3800 linhas)
