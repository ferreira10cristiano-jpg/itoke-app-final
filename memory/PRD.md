# PRD - Plataforma de Ofertas de Estabelecimentos (iToke)

## Problem Statement
Plataforma de fidelidade e ofertas para estabelecimentos e clientes com sistema de creditos, tokens, QR codes e comissoes por indicacao multinivel.

## Arquitetura
- Backend: FastAPI + MongoDB (Motor async)
- Frontend: Expo React Native Web
- Scanner: html5-qrcode
- Admin: 6 abas (Geral, Financeiro, Saques, Usuarios, Midias, FAQ + Videos)

## Implementation Log
- **25-28/03/2026**: MVP completo
- **28-29/03/2026**: Refactors criticos
- **29/03/2026**: Admin Upgrade P1-P3 + Final Polish
- **30/03/2026**: Redesign Premium Carteira + UPGRADE FINAL + Midias IA
- **31/03/2026**: Pacotes Tokens + Comissoes 3 niveis + QR Code + Midias v2 + Instagram + FAQ
- **01/04/2026**: Reestruturacao Ofertas + ViaCEP + Validacao Step 3 + Dashboard flexivel + Resgate PIX
- **02/04/2026**: Tela Meu Perfil + Fix Skip + Icones Ionicons + Equipe de Validacao + Relatorio Financeiro
- **03/04/2026**: Cadastro simplificado, Marca Admin, CNPJ unico, Sistema de Tokens Core
- **03/04/2026**: Tela Comprar Tokens, FAQ Estabelecimento, Fix redirect silencioso
- **03/04/2026**: Redesign Dashboard azul escuro (#0D1B2A), Centro de Aprendizado, Onboarding Videos, Admin Video CRUD

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Admin: 6 abas completas (Geral, Financeiro, Saques, Usuarios, Midias, FAQ)
- [x] Compartilhamento: WhatsApp, Instagram (clipboard), Email
- [x] Pacotes de Tokens + Comissao 3 niveis
- [x] QR Code persistente + Aba Ofertas (filtros, categorias, CTA)
- [x] ViaCEP + Validacao obrigatoria (Step 3)
- [x] Dashboard: Resgate PIX + Meu Perfil + Equipe/Validadores + Relatorio Financeiro
- [x] Sistema de Equipe: Rota /v/[id] (publico), registro colaborador, scanner
- [x] Relatorio Financeiro: 4 abas (Creditos, QR Codes, Top 5, Resumo)
- [x] Marca Admin (Logo + Tagline)
- [x] CNPJ unico + campos obrigatorios para publicar oferta
- [x] Sistema de Tokens: Alocacao por oferta, consumo por QR, refund ao desativar
- [x] Tela Comprar Tokens: 3 pacotes + quantidade customizada (10-1000)
- [x] Dashboard Token Card: saldo disponivel, alocados, consumidos
- [x] FAQ Estabelecimento: /establishment/help com 8 topicos seed
- [x] Admin FAQ sub-abas: FAQ Cliente + FAQ Estabelecimento com CRUD
- [x] Dashboard azul escuro (#0D1B2A) em todas as paginas do estabelecimento
- [x] Centro de Aprendizado: secao destacada no topo do dashboard
- [x] Onboarding Videos: Pop-ups sequenciais na primeira entrada (welcome -> 3 videos -> parabens)
- [x] Videos Explicativos: secao de videos na pagina Como Usar (acima do FAQ)
- [x] Admin Video Management: CRUD de videos dentro das sub-abas FAQ (Cliente/Estabelecimento)
- [x] 3 videos seed (placeholder sem URL): Token, Comprar, Alocar
- [x] Flag has_seen_onboarding para nao repetir onboarding

## Token System
- Tokens: comprados pelo estabelecimento (R$2,00 cada)
- Cada QR Code validado consome 1 token da oferta
- Criar oferta: obrigatorio alocar tokens
- Desativar oferta: tokens nao utilizados voltam ao saldo
- MOCKED: Compra sem pagamento real (Stripe pendente)

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
- [ ] Refatorar server.py em APIRouters (>4500 linhas)
- [ ] Edicao de ofertas existentes
- [ ] Busca Digital no Media Hub
