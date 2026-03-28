# PRD - Plataforma de Ofertas de Estabelecimentos

## Problem Statement
Refatoração do perfil "Estabelecimento" com separação de dados fixos (perfil) e variáveis (oferta), limpeza de campos duplicados, Hub de Mídia funcional e automação de links do Instagram.

## Arquitetura

### Backend (FastAPI + MongoDB)
- **Collections**: `establishments`, `offers`, `users`, `sessions`
- **Endpoints**:
  - `POST/GET/PUT /api/establishments/{id}` - Gerenciamento do estabelecimento
  - `POST/GET /api/offers` - Gerenciamento de ofertas
  - `POST /api/generate-image` - Geração de imagem via Gemini
  - `POST /api/auth/email-login` - Login via email (modo teste)
  - `POST /api/auth/logout` - Logout

### Frontend (Expo React Native Web)
- `/` - Tela de Seleção (Cliente/Estabelecimento)
- `/login` - Login com Google ou Email
- `/(tabs)` - Área do Cliente (Ofertas, QR, Carteira, Ajuda, Perfil)
- `/establishment/dashboard` - Dashboard do Estabelecimento
- `/establishment/register` - Registro de Estabelecimento
- `/establishment/offers` - Wizard 4 passos para criar ofertas
- `/admin/dashboard` - Dashboard Admin
- `/representative/dashboard` - Dashboard Representante

## User Personas
1. **Cliente** - Busca ofertas, gera QR Codes, economiza
2. **Dono de Estabelecimento** - Cria perfil uma vez, publica múltiplas ofertas
3. **Admin** - Gerencia plataforma
4. **Representante** - Gerencia parceiros

## Core Requirements (Implementados)
- [x] Separação de dados: Cidade, Bairro, Sobre, Instagram movidos para Perfil
- [x] Formulário de oferta limpo: apenas Título, Preços, Descrição única, Foto
- [x] Oferta puxa automaticamente dados do perfil
- [x] Hub de Mídia com 4 opções: Câmera, Galeria, URL, IA (Gemini)
- [x] Conversão automática de @usuario → https://instagram.com/usuario
- [x] Link do Instagram clicável no perfil e home
- [x] CNPJ com validação algorítmica
- [x] Wizard 4 passos: Info → Regras → Localização → Preview

## Implementation Log
- **25/03/2026**: Implementação completa da refatoração inicial
- **26/03/2026**: Restauração do código do GitHub + Mock Auth
- **28/03/2026**: Correção de Navegação e Logout Global
  - ROOT ROUTE: `/` sempre exibe tela de seleção inicial
  - BACK BUTTON: Seta de voltar faz logout e redireciona para `/`
  - LOGOUT BUTTON: Confirmação + logout + redirect para `/`
  - PROTEÇÃO DE ROTA: Dashboards protegidos por autenticação
  - PERSISTÊNCIA: Após logout, não é possível voltar via botão Back do browser
  - Corrigido logout em: Customer Profile, Establishment Dashboard, Admin Dashboard, Representative Dashboard

## Tech Stack
- Backend: FastAPI, Motor (async MongoDB), Pydantic
- Frontend: Expo (React Native Web), Expo Router, Zustand
- AI: Gemini 3.1 Flash Image Preview (via Emergent LLM Key)

## Backlog
- P1: Edição de ofertas existentes
- P1: Implementar "Busca Digital" (pesquisa de imagens na web) no Media Hub
- P2: Restaurar autenticação Firebase real
- P2: Filtro de ofertas por cidade/bairro
- P2: Preview de imagem antes de publicar
- P3: Categorias de ofertas
