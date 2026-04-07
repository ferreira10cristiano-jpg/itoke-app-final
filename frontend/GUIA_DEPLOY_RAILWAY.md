# Deploy do iToke no Railway - Passo a Passo

## Seus dados (ja configurados)
- MongoDB Atlas: CONECTADO
- Connection String: mongodb+srv://ferreira10cristiano_db_user:***@cluster0.uxjrdiy.mongodb.net/?appName=Cluster0
- IP liberado: 0.0.0.0/0 (qualquer servidor)

---

## PASSO 1: Salvar o codigo no GitHub

1. No chat do Emergent, clique em "Save to GitHub"
2. Escolha o repositorio (ou crie um novo chamado "itoke-app")
3. Aguarde o push completar

---

## PASSO 2: Criar conta no Railway

1. Acesse: https://railway.app
2. Clique em "Login" -> "Login with GitHub"
3. Autorize o Railway a acessar seu GitHub

---

## PASSO 3: Criar projeto no Railway

1. Clique em "New Project"
2. Selecione "Deploy from GitHub repo"
3. Escolha o repositorio "itoke-app" (ou o nome que voce deu)
4. IMPORTANTE: Na configuracao, defina o "Root Directory" como: backend
5. O Railway vai detectar o Dockerfile automaticamente

---

## PASSO 4: Configurar variaveis de ambiente

No painel do Railway, clique no seu servico -> aba "Variables" -> "New Variable":

Adicione estas 2 variaveis (uma por vez):

| Variavel | Valor |
|----------|-------|
| MONGO_URL | mongodb+srv://ferreira10cristiano_db_user:GftGOsfnJdBNG8kB@cluster0.uxjrdiy.mongodb.net/?appName=Cluster0 |
| DB_NAME | itoke_db |

O Railway ja fornece a variavel PORT automaticamente.

---

## PASSO 5: Fazer o deploy

1. Apos configurar as variaveis, o Railway vai fazer o build automaticamente
2. Aguarde o build completar (geralmente 2-5 minutos)
3. Quando aparecer "Deployed" com bolinha verde, esta pronto!

---

## PASSO 6: Testar

1. O Railway vai gerar uma URL tipo: https://itoke-app-production.up.railway.app
2. Teste acessando: https://SUA-URL.up.railway.app/api/health
3. Deve retornar: {"status": "healthy", ...}

---

## PASSO 7: Dominio customizado (opcional)

Se quiser usar api.itoke.com.br:
1. No Railway -> Settings -> Domains -> Custom Domain
2. Digite: api.itoke.com.br
3. Configure o CNAME no Registro.br apontando para o valor que o Railway fornecer

---

## Custos

| Servico | Custo |
|---------|-------|
| MongoDB Atlas M0 | Gratis |
| Railway Starter | ~US$ 5/mes |
| Total | ~R$ 25/mes |
