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
- **29/03/2026**: Admin Upgrade P1-P3
- **29/03/2026**: Final Polish
- **30/03/2026**: Redesign Premium Carteira + Mensagem dinamica
- **30/03/2026**: UPGRADE FINAL - Aba Creditos, Midia, Rede detalhada, Instagram
- **30/03/2026**: Sistema Inteligente de Midias (IA)
- **31/03/2026**: Gestao Dinamica de Pacotes de Tokens
- **31/03/2026**: BUGFIX - Comissoes em cadeia (3 niveis) + QR Code persistencia
- **31/03/2026**: Sistema de Midias v2 - Upload local, thumbnails, preview fullscreen, video player
- **31/03/2026**: Fix Instagram texto + midia (clipboard + passo intermediario)
- **31/03/2026**: Sistema Dinamico de Ajuda (FAQ) - Admin CRUD + Cliente acordeao + Contato email
- **01/04/2026**: Reestruturação Aba Ofertas - Filtros dinâmicos Cidade/Bairro (só com ofertas ativas), Carrossel categorias ordenado por contagem, CTA "Quer ofertas de graça?", Modal de incentivo à indicação

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Admin: 6 abas (Geral, Financeiro, Saques, Usuarios, Midias, FAQ)
- [x] Admin Midias: Upload local, URL, IA, thumbnails, preview fullscreen, video player
- [x] Admin FAQ: CRUD de topicos (titulo, conteudo, icone, ordem) + email de suporte
- [x] Cliente Ajuda: Acordeao dinamico da API + secao "Ainda precisa de ajuda?" com email
- [x] Compartilhamento: WhatsApp (midia+texto), Instagram (clipboard + passo), Email
- [x] Gestao Dinamica de Pacotes de Tokens
- [x] Comissao fixa R$3/venda com protecao auto-referencia
- [x] QR Code persistente com animacao de sucesso
- [x] Aba Ofertas reestruturada: Filtros pill Cidade/Bairro dinâmicos, categorias por contagem, CTA, modal incentivo

## Backlog
### P1
- [ ] Edicao de ofertas existentes
- [ ] Busca Digital no Media Hub

### P2
- [ ] Google OAuth
- [ ] Historico completo de transacoes do cliente
- [ ] Refatorar server.py em APIRouters (>3300 linhas)
