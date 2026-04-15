# PRD - iToke App

## Problema Original
Plataforma de ofertas com QR Codes onde estabelecimentos criam ofertas e clientes resgatam usando tokens/creditos.

## Stack
- Frontend: React Native Web + Expo Router (SDK 54)
- Backend: FastAPI (Python), MongoDB (Atlas), Railway, Stripe (Producao), Expo EAS

## Funcionalidades Implementadas
- Auth, Admin, Estabelecimento, Cliente, FAQ, Legal, CPF, Stripe Producao
- Sistema Representantes PJ completo (Fase 1+2+3)
- Anti-fraude, Historico Compras + Recibo PDF, CPFs mascarados LGPD
- Contrato intermediacao estabelecimento (aceite digital obrigatorio)
- **Novo (Abr/2026)**:
  - Botao "Ofertas de graca" reposicionado (abaixo categorias), pulsante, verde chamativo
  - Google Auth corrigido: passa intended_role (client/establishment)
  - Admin: Videos do app (abertura + ofertas gratis), editor de ofertas, target em midias
  - Pagina exclusao de conta (LGPD/Google Play)
  - Documento fiscal para contador + Contrato Word para estabelecimentos

## Backlog
### P1
- [ ] Build novo (.aab) com todas as alterações e upload no Google Play Teste Fechado
- [ ] Convidar 12+ testadores para o Teste Fechado
- [ ] Conta Apple Developer ($99/ano)
- [ ] Site iToke.com.br

### P2
- [ ] PIX (Mercado Pago), NF-e automatica, Build iOS
- [ ] Video de abertura e video "Ofertas de graca" (URLs a configurar no admin)
