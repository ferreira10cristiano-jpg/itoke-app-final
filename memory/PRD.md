# PRD - iToke App

## Problema Original
Plataforma de ofertas com QR Codes onde estabelecimentos criam ofertas e clientes resgatam usando tokens/créditos.

## Stack
- Frontend: React Native Web + Expo Router (SDK 54)
- Backend: FastAPI (Python)
- Database: MongoDB (Atlas em produção)
- Hospedagem Backend: Railway
- Build Mobile: Expo EAS

## URLs de Produção
- Backend: https://itoke-app-final-production.up.railway.app
- MongoDB Atlas: cluster0.uxjrdiy.mongodb.net
- Health Check: https://itoke-app-final-production.up.railway.app/api/health
- APK Android: https://expo.dev/accounts/itokecris/projects/itoke/builds/780733b3-c059-4415-922f-385b629d9108

## Contas de Serviço
- Expo: itokecris (Project ID: 73f0bd4b-f4db-49c1-8785-3a303cbb1ab8)
- Railway: itoke-app-final-production
- MongoDB Atlas: ferreira10cristiano_db_user @ cluster0.uxjrdiy.mongodb.net

## Funcionalidades Implementadas
- Sistema de autenticação (login/registro por email)
- Painel Admin com gestão completa
- Painel Estabelecimento (ofertas, QR codes, tokens)
- App Cliente (explorar ofertas, gerar QR, resgatar)
- FAQ com vídeos do YouTube
- Relatório Fiscal com exportação PDF
- Documentos Legais editáveis pelo Admin
- Captura de CPF obrigatória
- Configuração da Loja (App Store)
- Deploy: MongoDB Atlas + Railway (CONCLUÍDO)
- Build APK Android via Expo EAS (CONCLUÍDO)

## Infraestrutura de Produção
- MongoDB Atlas: Cluster Free M0 (512MB) - ONLINE
- Railway: Backend dockerizado - ONLINE
- Expo EAS: Build Android preview - GERADO
- IP 0.0.0.0/0 liberado no Atlas
- newArchEnabled: true (requerido pelo Reanimated)

## Backlog Priorizado

### P0 (Concluído)
- [x] FAQ com vídeos
- [x] Relatório Fiscal PDF
- [x] Documentos Legais
- [x] Configuração App Store
- [x] Deploy MongoDB Atlas
- [x] Deploy Railway
- [x] Build APK Android (EAS)

### P1 (Próximo)
- [ ] Testar APK no celular e corrigir bugs
- [ ] Build de produção para Play Store
- [ ] Integração Stripe para pagamento real de tokens
- [ ] Anti-fraude: Rate Limiting e alertas no Admin
- [ ] Histórico de compras de tokens com recibo PDF

### P2 (Futuro)
- [ ] Google OAuth
- [ ] Refatorar server.py em APIRouters (~5000 linhas)
- [ ] Build iOS (requer conta Apple Developer $99/ano)

### P3 (Longo prazo)
- [ ] 2FA para saques altos
- [ ] Geolocalização antifraude
