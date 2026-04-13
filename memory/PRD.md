# PRD - iToke App

## Problema Original
Plataforma de ofertas com QR Codes onde estabelecimentos criam ofertas e clientes resgatam usando tokens/creditos.

## Stack
- Frontend: React Native Web + Expo Router (SDK 54)
- Backend: FastAPI (Python), MongoDB (Atlas), Railway, Stripe (Producao), Expo EAS

## Arquitetura Backend (Refatorada)
- server.py (~5570 linhas) — Core routes
- models.py (204 linhas) — Pydantic models
- deps.py (174 linhas) — DB, auth, rate limiter, validators
- routes/representatives.py (~850 linhas) — Representative system

## Funcionalidades Implementadas (Completas)
- Auth, Admin, Estabelecimento, Cliente, FAQ, Legal, CPF
- Stripe Producao, Anti-fraude, Historico Compras + Recibo PDF
- Sistema Representantes PJ completo (Fase 1+2+3)
- Compartilhamento inteligente, Alocacao tokens, Pacote Especial
- Materiais marketing admin, Regras de tokens editaveis
- **CPFs mascarados (LGPD)**: 123.***.***-01 em recibos e relatorios
- Documento fiscal para contador (iToke_Plano_Fiscal_Contador.docx)

## Backlog
### P1
- [ ] Testar no celular (v5 Google Play)
- [ ] Site iToke.com.br

### P2
- [ ] PIX (Mercado Pago), NF-e automatica, Build iOS
- [ ] Stripe Connect (split payment)
- [ ] Continuar refatoracao server.py
