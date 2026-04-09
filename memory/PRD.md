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
- Health Check: https://itoke-app-final-production.up.railway.app/api/health
- APK Android: https://expo.dev/accounts/itokecris/projects/itoke/builds/780733b3-c059-4415-922f-385b629d9108
- AAB Play Store: https://expo.dev/artifacts/eas/gQqrSuAzJZeuuR4nbXUg9R.aab

## Contas de Servico
- Expo: itokecris (Project ID: 73f0bd4b-f4db-49c1-8785-3a303cbb1ab8)
- Railway: itoke-app-final-production
- MongoDB Atlas: ferreira10cristiano_db_user @ cluster0.uxjrdiy.mongodb.net
- Google Play Developer: em verificacao (1-3 dias)

## Funcionalidades Implementadas
- Sistema de autenticacao (login/registro por email)
- Painel Admin com gestao completa
- Painel Estabelecimento (ofertas, QR codes, tokens)
- App Cliente (explorar ofertas, gerar QR, resgatar)
- FAQ com videos do YouTube
- Relatorio Fiscal com exportacao PDF
- Documentos Legais editaveis pelo Admin
- Captura de CPF obrigatoria
- Configuracao da Loja (App Store)
- Deploy: MongoDB Atlas + Railway (CONCLUIDO)
- Build APK Android via Expo EAS (CONCLUIDO)
- Build AAB Play Store (CONCLUIDO)
- **Integracao Stripe** para pagamento real de tokens (CONCLUIDO)
  - Checkout session com redirecionamento Stripe
  - Pagina de sucesso com polling de status
  - Webhook para processar pagamentos
  - Historico de pagamentos
  - Distribuicao de comissoes apos pagamento

## Infraestrutura de Producao
- MongoDB Atlas: Cluster Free M0 (512MB) - ONLINE
- Railway: Backend dockerizado - ONLINE
- Expo EAS: Build Android preview + production - GERADOS
- IP 0.0.0.0/0 liberado no Atlas
- newArchEnabled: true (requerido pelo Reanimated)
- Stripe: Chave de teste configurada

## Backlog Priorizado

### P0 (Concluido)
- [x] FAQ com videos
- [x] Relatorio Fiscal PDF
- [x] Documentos Legais
- [x] Configuracao App Store
- [x] Deploy MongoDB Atlas
- [x] Deploy Railway
- [x] Build APK Android (EAS)
- [x] Build AAB Play Store
- [x] Integracao Stripe

### P1 (Proximo)
- [ ] Anti-fraude: Rate Limiting e alertas no Admin
- [ ] Historico de compras de tokens com recibo PDF
- [ ] Rebuildar APK/AAB com Stripe integrado
- [ ] Publicar na Play Store (aguardando verificacao da conta)

### P2 (Futuro)
- [ ] Google OAuth
- [ ] Refatorar server.py em APIRouters (~5000 linhas)
- [ ] Build iOS (requer conta Apple Developer $99/ano)
- [ ] Site iToke.com.br

### P3 (Longo prazo)
- [ ] 2FA para saques altos
- [ ] Geolocalizacao antifraude
