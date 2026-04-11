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
- AAB Play Store: Publicado (Teste Interno - Ativo)

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
- Play Store: Teste Interno (ATIVO)
- **Anti-fraude**:
  - Rate limiting: login (5/min), QR (15/dia), pagamento (10/hora)
  - Validacao CPF (algoritmo modulo 11)
  - Deteccao de CPF duplicado
  - Log de atividades suspeitas
  - Painel de alertas no Admin
- **Compatibilidade nativa Android corrigida** (Share, Upload, Callback)
- **Historico de Compras de Tokens com Recibo PDF** (11/Abr/2026):
  - GET /api/payments/purchase-history (lista unificada Stripe + legacy)
  - GET /api/payments/receipt/{transaction_id}/pdf (recibo PDF profissional)
  - Tela /purchase-history com cards de resumo e lista de compras
  - Links de acesso na aba Creditos e na tela Comprar Tokens

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

### P1 (Proximo)
- [ ] Rebuildar APK/AAB com correcoes nativas (aguardando EAS Build do usuario)
- [ ] Configurar Stripe para producao (chave sk_live_)
- [ ] Testar fluxo completo no celular

### P2 (Futuro)
- [ ] NF-e automatica (apos CNPJ do usuario)
- [ ] Google OAuth nativo melhorado
- [ ] Refatorar server.py em APIRouters (>5400 linhas)
- [ ] Build iOS
- [ ] Site iToke.com.br

### P3 (Longo prazo)
- [ ] 2FA para saques altos
- [ ] Geolocalizacao antifraude
