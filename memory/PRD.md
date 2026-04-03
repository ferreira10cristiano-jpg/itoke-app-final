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
- **31/03/2026**: Pacotes Tokens + Comissoes 3 niveis + QR Code + Midias v2 + Instagram + FAQ
- **01/04/2026**: Reestruturacao Ofertas + ViaCEP + Validacao Step 3 + Dashboard flexivel + Resgate PIX
- **02/04/2026**: Tela Meu Perfil + Fix Skip + Icones Ionicons
- **02/04/2026**: Sistema de Equipe de Validacao (Garcons/Caixa)
- **02/04/2026**: Refinamento Equipe: botao em Acoes Rapidas, WhatsApp invite, delete/reenviar, fix scanner QR
- **02/04/2026**: Relatorio Financeiro (4 abas: Creditos, QR Codes, Top Ofertas, Resumo) + Reordenacao Acoes Rapidas
- **03/04/2026**: Cadastro simplificado (Nome, CNPJ, CEP), Marca Admin, CNPJ unico, Perfil obrigatorio
- **03/04/2026**: Sistema de Tokens Core: Alocacao backend, Dashboard Token Card, Offer token allocation + consumption + refund
- **03/04/2026**: Tela Comprar Tokens redesenhada (tema escuro, web-compatible, quantidade customizada 10-1000)
- **03/04/2026**: FAQ Estabelecimento: Nova pagina /establishment/help, Admin sub-abas FAQ Cliente/Estabelecimento, 8 topicos seed, botao 'Como Usar' corrigido

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Admin: 6 abas completas
- [x] Compartilhamento: WhatsApp, Instagram (clipboard), Email
- [x] Pacotes de Tokens + Comissao 3 niveis
- [x] QR Code persistente + Aba Ofertas (filtros, categorias, CTA)
- [x] ViaCEP + Validacao obrigatoria (Step 3)
- [x] Dashboard: Resgate PIX + Meu Perfil + Equipe/Validadores + Relatorio Financeiro
- [x] Sistema de Equipe: Rota /v/[id] (publico), registro colaborador, scanner
- [x] Relatorio Financeiro: 4 abas (Creditos, QR Codes, Top 5, Resumo)
- [x] Marca Admin (Logo + Tagline)
- [x] CNPJ unico (1 por conta) + campos obrigatorios para publicar oferta
- [x] Sistema de Tokens: Alocacao obrigatoria por oferta, consumo por QR, refund ao desativar
- [x] Tela Comprar Tokens: 3 pacotes (50/100/150) + quantidade customizada (10-1000), tema escuro
- [x] Dashboard Token Card: saldo disponivel, alocados, consumidos
- [x] Token bar em cards de ofertas (tokens restantes/consumidos)
- [x] Fix: redirect silencioso para cadastro quando sessao desyncada
- [x] FAQ Estabelecimento: /establishment/help com 8 topicos seed (tokens, creditos, PIX, equipe, relatorio)
- [x] Admin FAQ sub-abas: 'FAQ Cliente' + 'FAQ Estabelecimento' com CRUD completo
- [x] Botao 'Como Usar' corrigido para navegar para /establishment/help

## Token System
- Tokens sao comprados pelo estabelecimento (R$2,00 cada)
- Cada QR Code validado consome 1 token da oferta
- Ao criar oferta, e obrigatorio alocar tokens
- Ao desativar oferta, tokens nao utilizados voltam ao saldo
- Saldo: total_balance - allocated = available
- MOCKED: Compra de tokens adiciona diretamente sem pagamento real (Stripe pendente)

## Backlog
### P0
- [ ] Integracao Stripe para pagamento real de tokens (Cartao/PIX)

### P1
- [ ] Historico de compras com download de recibo PDF
- [ ] Email de confirmacao apos compra de tokens

### P2
- [ ] Alertas quando tokens de oferta estao acabando
- [ ] Realocacao de tokens entre ofertas ativas
- [ ] Google OAuth
- [ ] Historico completo de transacoes do cliente
- [ ] Refatorar server.py em APIRouters (>4100 linhas)
- [ ] Edicao de ofertas existentes
- [ ] Busca Digital no Media Hub
