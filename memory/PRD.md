# PRD - iToke App

## Problema Original
Plataforma de ofertas com QR Codes onde estabelecimentos criam ofertas e clientes resgatam usando tokens/créditos.

## Stack
- Frontend: React Native Web + Expo Router
- Backend: FastAPI (Python)
- Database: MongoDB (Atlas em produção)
- Hospedagem: Railway (backend)

## URLs de Produção
- Backend: https://itoke-app-final-production.up.railway.app
- MongoDB Atlas: cluster0.uxjrdiy.mongodb.net
- Health Check: https://itoke-app-final-production.up.railway.app/api/health

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

## Infraestrutura de Produção
- MongoDB Atlas: Cluster Free M0 (512MB) - CONFIGURADO
- Railway: Backend dockerizado - ONLINE
- IP 0.0.0.0/0 liberado no Atlas
- Dockerfile otimizado com requirements-prod.txt

## Backlog Priorizado

### P0 (Concluído)
- [x] FAQ com vídeos
- [x] Relatório Fiscal PDF
- [x] Documentos Legais
- [x] Configuração App Store
- [x] Deploy MongoDB Atlas
- [x] Deploy Railway

### P1 (Próximo)
- [ ] Build EAS (APK/IPA) para lojas
- [ ] Integração Stripe para pagamento real de tokens
- [ ] Anti-fraude: Rate Limiting e alertas no Admin
- [ ] Histórico de compras de tokens com recibo PDF

### P2 (Futuro)
- [ ] Google OAuth
- [ ] Refatorar server.py em APIRouters (~5000 linhas)

### P3 (Longo prazo)
- [ ] 2FA para saques altos
- [ ] Geolocalização antifraude
