# PRD - iToke App

## Problema Original
Plataforma de ofertas com QR Codes onde estabelecimentos criam ofertas e clientes resgatam usando tokens/creditos.

## Stack
- Frontend: React Native Web + Expo Router (SDK 54)
- Backend: FastAPI (Python)
- Database: MongoDB (Atlas em producao)
- Hospedagem Backend: Railway
- Build Mobile: Expo EAS
- Pagamentos: Stripe

## URLs de Producao
- Backend: https://itoke-app-final-production.up.railway.app
- MongoDB Atlas: cluster0.uxjrdiy.mongodb.net
- APK Android: expo.dev/accounts/itokecris/projects/itoke
- AAB Play Store: Publicado (Teste Interno - Ativo, versionCode 5)

## Funcionalidades Implementadas
- Sistema de autenticacao (login/registro por email + Google Auth)
- Painel Admin com gestao completa
- Painel Estabelecimento (ofertas, QR codes, tokens, relatorio fiscal PDF)
- App Cliente (explorar ofertas, gerar QR, resgatar, indicar amigos)
- FAQ com videos do YouTube
- Documentos Legais editaveis pelo Admin
- Captura de CPF obrigatoria com validacao de digitos verificadores
- Integracao Stripe (checkout, webhook, historico)
- Deploy: MongoDB Atlas + Railway (ONLINE)
- Build Android: APK preview + AAB producao (GERADO)
- Play Store: Teste Interno (ATIVO, v5)
- Anti-fraude: Rate limiting, Validacao CPF, Deteccao CPF duplicado, Alertas Admin
- Compatibilidade nativa Android corrigida (Share, Upload, Callback)
- Historico de Compras de Tokens com Recibo PDF
- **Sistema de Representantes Comerciais PJ COMPLETO (Fase 1 + 2)**:
  - Admin CRUD de representantes (CNPJ validado, tokens gratis, comissao editavel)
  - Dashboard do representante via link privado (token-based auth)
  - Codigo de indicacao exclusivo + tracking de vinculos 12 meses
  - Motor de comissoes event-driven (no QR confirm)
  - Contrato digital simples (aceite + IP/timestamp como prova)
  - Upload de documentos (RG, CNPJ, Contrato Social, Selfie)
  - Sistema de saques (request, approve, reject) com chave PIX
  - Expiracao automatica de vinculos (12 meses)
  - Anti-fraude: CNPJ != estabelecimento, deteccao de duplicados, usuario ja cadastrado
- **Refatoracao**: Models extraidos para models.py (reducao de ~185 linhas em server.py)

## Backlog Priorizado

### P0 (Concluido)
- [x] FAQ com videos
- [x] Relatorio Fiscal PDF
- [x] Documentos Legais
- [x] Deploy MongoDB Atlas + Railway
- [x] Build APK/AAB
- [x] Publicacao Play Store (Teste Interno)
- [x] Integracao Stripe
- [x] Anti-fraude (rate limiting, CPF, alertas)
- [x] Correcoes compatibilidade nativa Android
- [x] Historico de compras de tokens com recibo PDF
- [x] Sistema de Representantes PJ - Fase 1 + Fase 2 COMPLETO

### P1 (Proximo)
- [ ] Configurar Stripe para producao (chave sk_live_)
- [ ] Testar fluxo completo no celular (v5 submetida ao Play)

### P2 (Futuro)
- [ ] NF-e automatica (apos CNPJ do usuario)
- [ ] Continuar refatoracao do server.py (dividir endpoints em routers)
- [ ] Build iOS
- [ ] Site iToke.com.br

### P3 (Longo prazo)
- [ ] 2FA para saques altos
- [ ] Geolocalizacao antifraude
- [ ] Stripe Connect para saques automaticos
