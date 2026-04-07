# PRD - Plataforma de Ofertas de Estabelecimentos (iToke)

## Problem Statement
Plataforma de fidelidade e ofertas para estabelecimentos e clientes com sistema de creditos, tokens, QR codes e comissoes por indicacao multinivel.

## Arquitetura
- Backend: FastAPI + MongoDB (Motor async)
- Frontend: Expo React Native Web
- Scanner: html5-qrcode
- Admin: 6 abas (Geral, Financeiro, Saques, Usuarios, Midias, FAQ, Marca, Relatorio)

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
- **03/04/2026**: Centro de Aprendizado, Onboarding Videos, Admin Video CRUD
- **03/04/2026**: Fundo azul bebe (#BFDBFE), Dashboard fundo claro com textos escuros
- **05/04/2026**: Fix videos desaparecendo: reestruturado para video_url DENTRO de cada FAQ topic (nao separado). Admin edita topic e adiciona URL. Help page mostra video embed dentro do accordion.

## Core Requirements (Implementados)
- [x] Fluxo completo de ofertas, QR, vouchers, creditos
- [x] Admin: 6 abas completas
- [x] Compartilhamento: WhatsApp, Instagram, Email
- [x] Pacotes de Tokens + Comissao 3 niveis
- [x] QR Code persistente + Aba Ofertas
- [x] ViaCEP + Validacao obrigatoria
- [x] Dashboard: Resgate PIX + Meu Perfil + Equipe/Validadores + Relatorio Financeiro
- [x] Sistema de Equipe: Rota /v/[id], registro colaborador, scanner
- [x] Relatorio Financeiro: 4 abas
- [x] Marca Admin (Logo + Tagline)
- [x] CNPJ unico + campos obrigatorios
- [x] Sistema de Tokens: Alocacao, consumo por QR, refund ao desativar
- [x] Tela Comprar Tokens: 3 pacotes + customizado (10-1000)
- [x] Dashboard Token Card
- [x] FAQ Estabelecimento com video_url integrado
- [x] Admin FAQ: sub-abas Cliente/Estabelecimento, CRUD com campo video_url
- [x] Dashboard azul bebe (#BFDBFE) com textos escuros
- [x] Centro de Aprendizado no topo do dashboard
- [x] Onboarding modal na primeira entrada (usa FAQ topics)
- [x] Help page: video embed dentro de cada topic expandido
- [x] Video card renderiza corretamente com View+TouchableOpacity (fix hot reload - 05/04/2026)
- [x] CPF obrigatório para clientes (pedido na 1a geração de QR code) - 06/04/2026
- [x] Relatório Fiscal de Créditos para estabelecimentos (lista transações com CPF, email, valores) - 06/04/2026
- [x] Download PDF do relatório fiscal (fpdf2) - 06/04/2026
- [x] Admin: aba "Relatório" para editar layout do PDF (nome, slogan, declaração, rodapé) - 06/04/2026
- [x] Documentos Legais: 5 documentos (Termos Cliente, Termos Estabelecimento, Termos Geral, LGPD, Conformidade Legal) - 07/04/2026
- [x] Página /legal publica com listagem e visualização de cada documento - 07/04/2026
- [x] Links "Termos e Politicas" nas telas de Ajuda (Cliente e Estabelecimento) - 07/04/2026
- [x] Admin: aba "Legal" para editar título e conteúdo dos documentos legais - 07/04/2026
- [x] Slogan alterado de "Descontos que valem ouro" para "Ofertas que saem de Graca" em todo o app - 07/04/2026
- [x] Ícone, favicon, adaptive-icon e splash screen gerados (1024x1024, 1284x2778) - 07/04/2026
- [x] Configurações da Loja de Apps: nome, slogan, descrição curta/completa, keywords, logo URL, cor splash - 07/04/2026
- [x] Admin: aba "Loja" para editar todas as configurações de app store - 07/04/2026
- [x] Endpoint público GET /api/app-config para consumir logo e tagline - 07/04/2026

## Token System
- MOCKED: Compra sem pagamento real (Stripe pendente)

## Backlog
### P0
- [ ] Integracao Stripe para pagamento real de tokens

### P1
- [ ] Historico de compras com download de recibo PDF
- [ ] Email de confirmacao apos compra de tokens

### P2
- [ ] Alertas quando tokens acabando
- [ ] Realocacao de tokens entre ofertas
- [ ] Google OAuth
- [ ] Refatorar server.py em APIRouters (>4500 linhas)
