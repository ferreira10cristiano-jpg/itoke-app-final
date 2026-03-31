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
- **28-29/03/2026**: Refactors criticos
- **29/03/2026**: Admin Upgrade P1-P3
- **29/03/2026**: Final Polish
- **30/03/2026**: Redesign Premium Carteira + Mensagem dinamica
- **30/03/2026**: UPGRADE FINAL - Aba Creditos, Midia, Rede detalhada, Instagram
- **30/03/2026**: Sistema Inteligente de Midias (IA)
- **31/03/2026**: Gestao Dinamica de Pacotes de Tokens
- **31/03/2026**: BUGFIX - Comissoes em cadeia (3 niveis) + QR Code persistencia
- **31/03/2026**: Sistema de Midias v2 - Upload local, thumbnails, preview fullscreen
- **31/03/2026**: Fix - Video player real no admin, Instagram envia texto+midia com clipboard

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Admin: 5 abas completas
- [x] Admin Midias: Upload local, URL, IA, thumbnails, preview fullscreen com video player
- [x] Cliente: Galeria de midias + viewer fullscreen + Postar/Indicar
- [x] Compartilhamento: WhatsApp (midia+texto), Instagram (midia+texto via clipboard), Email
- [x] Aviso "texto copiado automaticamente" para Instagram
- [x] Gestao Dinamica de Pacotes de Tokens
- [x] Comissao fixa R$3/venda com protecao auto-referencia
- [x] QR Code persistente com animacao de sucesso

## Backlog
### P1
- [ ] Edicao de ofertas existentes
- [ ] Busca Digital no Media Hub

### P2
- [ ] Google OAuth
- [ ] Filtro de ofertas por cidade/bairro
- [ ] Refatorar server.py em APIRouters
- [ ] Historico completo de transacoes do cliente
