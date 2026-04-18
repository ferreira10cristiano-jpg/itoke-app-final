# PRD - iToke App

## Problema Original
Plataforma de ofertas com QR Codes onde estabelecimentos criam ofertas e clientes resgatam usando tokens/creditos.

## Stack
- Frontend: React Native Web + Expo Router (SDK 54)
- Backend: FastAPI (Python), MongoDB (Atlas), Railway, Stripe
- Build: EAS Build (Expo Application Services)
- Package: com.itokecris.itoke

## Funcionalidades Implementadas
- Auth (Google OAuth via Emergent Auth), Admin, Estabelecimento, Cliente, FAQ, Legal
- Sistema Representantes PJ completo (Cadastro, Dashboard, Comissoes, Saques)
- Anti-fraude, Historico Compras + Recibo PDF, CPFs mascarados LGPD
- Contrato intermediacao estabelecimento
- **Abr/2026**:
  - Login: Apenas Google OAuth (email removido para producao)
  - OAuth nativo Android: openAuthSessionAsync com deep link itoke://callback
  - Abas: Ofertas, Como Funciona, Creditos, Meus QR, Perfil
  - Botao CTA pulsante (CSS @keyframes)
  - Campo placement em media_assets
  - Pagina exclusao de conta (LGPD/Google Play)
  - App publicado no Google Play (teste interno) - com.itokecris.itoke v1.0.0

## Google Play Status
- App: com.itokecris.itoke
- Status: Teste interno ATIVO (18/abr/2026)
- Testadores: 8 cadastrados, precisa de 12 para producao
- Prazo: 14 dias de teste para solicitar producao

## Backlog
### P0
- [x] Corrigir OAuth nativo Android (deep link)
- [x] Remover login por email
- [ ] Novo build com correcoes e resubmit

### P1
- [ ] Refatoracao do server.py (extrair rotas admin/auth)
- [ ] Integrar videos de Divulgacao no Dashboard do Representante

### P2
- [ ] PIX (Mercado Pago), NF-e automatica
- [ ] Site iToke.com.br
- [ ] Build iOS / Apple Store
