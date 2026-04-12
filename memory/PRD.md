# PRD - iToke App

## Problema Original
Plataforma de ofertas com QR Codes onde estabelecimentos criam ofertas e clientes resgatam usando tokens/creditos.

## Stack
- Frontend: React Native Web + Expo Router (SDK 54)
- Backend: FastAPI (Python), MongoDB (Atlas), Railway, Stripe (Producao), Expo EAS

## Arquitetura Backend (Refatorada)
- server.py (5563 linhas) — Core routes, app setup
- models.py (204 linhas) — Pydantic models
- deps.py (174 linhas) — DB, auth, rate limiter, validators
- routes/representatives.py (~850 linhas) — Representative system routes completo

## Funcionalidades Implementadas
- Auth (email + Google Auth), Admin, Estabelecimento, Cliente
- FAQ, Documentos Legais, CPF obrigatorio, Stripe (PRODUCAO)
- Deploy: Atlas + Railway + Play Store (Teste Interno v5)
- Anti-fraude, Historico Compras com Recibo PDF
- **Sistema de Representantes PJ COMPLETO**:
  - CRUD, Dashboard privado, Contrato digital, Documentos, Saques
  - Compartilhamento inteligente (WhatsApp/Email/Mais) com mensagens prontas
  - Seletor alvo: Clientes vs Estabelecimentos
  - Alocacao de tokens gratis para estabelecimentos (com regras admin)
  - Pacote Especial de Lancamento (20 tokens R$9,90, editavel no admin)
  - Materiais de marketing (admin gerencia, rep acessa)
  - Regras editaveis: max por estab, validade, segunda alocacao requer aprovacao

## Backlog
### P1 (Proximo)
- [ ] Testar fluxo completo no celular (v5 no Google Play)
- [ ] Site institucional iToke.com.br

### P2 (Futuro)
- [ ] PIX via Mercado Pago
- [ ] NF-e automatica
- [ ] Continuar refatoracao server.py
- [ ] Build iOS
