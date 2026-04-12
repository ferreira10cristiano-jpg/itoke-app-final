# PRD - iToke App

## Problema Original
Plataforma de ofertas com QR Codes onde estabelecimentos criam ofertas e clientes resgatam usando tokens/creditos.

## Stack
- Frontend: React Native Web + Expo Router (SDK 54)
- Backend: FastAPI (Python)
- Database: MongoDB (Atlas em producao)
- Hospedagem Backend: Railway
- Build Mobile: Expo EAS
- Pagamentos: Stripe (Producao ativa)

## URLs de Producao
- Backend: https://itoke-app-final-production.up.railway.app
- MongoDB Atlas: cluster0.uxjrdiy.mongodb.net
- APK Android: expo.dev/accounts/itokecris/projects/itoke
- AAB Play Store: Publicado (Teste Interno - Ativo, versionCode 5)
- Stripe Dashboard: https://dashboard.stripe.com (conta iToke ativa)

## Arquitetura Backend (Refatorada)
- server.py (5563 linhas) — Core routes, app setup
- models.py (204 linhas) — Pydantic models
- deps.py (174 linhas) — DB, auth helpers, rate limiter, utilities
- routes/representatives.py (615 linhas) — Representative system routes

## Funcionalidades Implementadas
- Sistema de autenticacao (login/registro por email + Google Auth)
- Painel Admin com gestao completa
- Painel Estabelecimento (ofertas, QR codes, tokens, relatorio fiscal PDF)
- App Cliente (explorar ofertas, gerar QR, resgatar, indicar amigos)
- FAQ com videos, Documentos Legais, CPF obrigatorio
- Integracao Stripe (checkout, webhook, historico) — PRODUCAO ATIVA
- Deploy: MongoDB Atlas + Railway (ONLINE)
- Play Store: Teste Interno (ATIVO, v5)
- Anti-fraude completo
- Historico de Compras com Recibo PDF
- Sistema de Representantes PJ COMPLETO (Fase 1 + 2)
- Documento Word para apresentacao comercial

## Backlog

### Concluido
- [x] Todas funcionalidades core
- [x] Sistema Representantes (Fase 1 + 2)
- [x] Stripe Producao configurado
- [x] Refatoracao: models.py, deps.py, routes/representatives.py

### P1 (Proximo)
- [ ] Testar fluxo completo no celular (v5 no Google Play)

### P2 (Futuro)
- [ ] Integrar PIX (Mercado Pago)
- [ ] NF-e automatica
- [ ] Continuar refatoracao (extrair payments, admin para routes/)
- [ ] Build iOS
- [ ] Site iToke.com.br

### P3 (Longo prazo)
- [ ] 2FA para saques altos
- [ ] Geolocalizacao antifraude
- [ ] Stripe Connect para saques automaticos
