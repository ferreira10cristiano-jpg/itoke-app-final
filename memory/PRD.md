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
- **30/03/2026**: Redesign Premium Carteira + UPGRADE FINAL
- **30/03/2026**: Sistema Inteligente de Midias (IA)
- **31/03/2026**: Pacotes de Tokens + BUGFIX Comissões 3 níveis + QR Code
- **31/03/2026**: Mídias v2 + Instagram clipboard + FAQ Dinâmico
- **01/04/2026**: Reestruturação Aba Ofertas + ViaCEP + Validação Step 3
- **01/04/2026**: Dashboard flexível (skip) + Resgate PIX + Ícones categoria
- **02/04/2026**: Tela dedicada "Meu Perfil" (/establishment/profile) com edição completa (Nome, CNPJ, CEP/ViaCEP, Categoria, História, Instagram)

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Admin: 6 abas completas (Geral, Financeiro, Saques, Usuarios, Midias, FAQ)
- [x] Compartilhamento: WhatsApp, Instagram (clipboard), Email
- [x] Pacotes de Tokens dinâmicos + Comissão 3 níveis
- [x] QR Code persistente + Aba Ofertas (filtros, categorias, CTA, modal incentivo)
- [x] Sistema ViaCEP + Validação obrigatória (Step 3 bloqueado sem CEP)
- [x] Cadastro flexível: "Preencher depois" (cria com defaults)
- [x] Dashboard: Resgate PIX + Meu Perfil (tela dedicada com todos os campos)
- [x] Ícones categoria Ionicons corrigidos

## Backlog
### P1
- [ ] Edição de ofertas existentes
- [ ] Busca Digital no Media Hub

### P2
- [ ] Google OAuth
- [ ] Histórico completo de transações do cliente
- [ ] Refatorar server.py em APIRouters (>3500 linhas)
