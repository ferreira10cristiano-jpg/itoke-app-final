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
- **30/03/2026**: Sistema Inteligente de Midias (IA para texto/imagem)
- **31/03/2026**: Gestao Dinamica de Pacotes de Tokens (Admin Financeiro)
- **31/03/2026**: BUGFIX CRITICO - Distribuicao de comissoes em cadeia (3 niveis)
- **31/03/2026**: BUGFIX - QR Code persistencia corrigida (Loading->Sucesso animado->QR persistente)

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Validacao 2 etapas (preview + confirmar recebimento)
- [x] Admin: 5 abas completas (Geral, Financeiro, Saques, Usuarios, Midias)
- [x] Aba Creditos: Hero + "Como ganhar creditos" + "Ganhe indicando" + Banco de Midia
- [x] Tabela Minha Rede: Indicados, Ativos, Creditos + Estabelecimentos
- [x] Admin Midias: CRUD + Geracao de Imagem/Texto com IA
- [x] ShareInviteModal: WhatsApp, E-mail, Instagram, Outras redes
- [x] Gestao Dinamica de Pacotes de Tokens (CRUD no Admin Financeiro)
- [x] Comissao fixa R$3 por venda (R$1/nivel, 3 niveis) com protecao auto-referencia
- [x] QR Code: Persistencia ate fechar manual + animacao sucesso + botao X vermelho

## Backlog
### P1
- [ ] Edicao de ofertas existentes
- [ ] Busca Digital no Media Hub

### P2
- [ ] Restaurar Google OAuth
- [ ] Filtro de ofertas por cidade/bairro
- [ ] Refatorar server.py em APIRouters (>3000 linhas)
- [ ] Historico completo de transacoes do cliente
