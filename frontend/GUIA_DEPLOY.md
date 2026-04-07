# Guia de Deploy - iToke no Railway + Dominio itoke.com.br

## VISAO GERAL

```
Usuarios --> itoke.com.br (frontend/app)
                |
                v
         api.itoke.com.br (backend no Railway)
                |
                v
         MongoDB Atlas (banco de dados na nuvem)
```

---

## PASSO 1: BANCO DE DADOS (MongoDB Atlas - Gratis)

### 1.1 Criar conta
- Acesse: https://www.mongodb.com/atlas
- Crie conta gratuita
- Crie um cluster (plano M0 Free - gratis pra sempre)
- Regiao: South America (Sao Paulo)

### 1.2 Configurar acesso
- Em "Database Access": crie usuario e senha
- Em "Network Access": adicione `0.0.0.0/0` (permite acesso de qualquer IP)
- Em "Connect": copie a connection string:
  ```
  mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/itoke_db
  ```

### 1.3 Plano gratis aguenta quanto?
- 512 MB de armazenamento
- Suficiente para ~50.000 usuarios
- Quando precisar mais, upgrade para M10 (~US$ 57/mes)

---

## PASSO 2: BACKEND NO RAILWAY

### 2.1 Criar conta
- Acesse: https://railway.app
- Faca login com GitHub

### 2.2 Deploy do backend
1. Clique em "New Project"
2. Selecione "Deploy from GitHub repo"
3. Escolha o repositorio do iToke
4. Configure o "Root Directory": `backend`
5. O Railway vai detectar o Dockerfile automaticamente

### 2.3 Configurar variaveis de ambiente
No painel do Railway, va em "Variables" e adicione:

```
MONGO_URL=mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/itoke_db
DB_NAME=itoke_db
PORT=8001
```

### 2.4 Configurar dominio customizado
1. No Railway, va em "Settings" > "Domains"
2. Clique em "Custom Domain"
3. Digite: `api.itoke.com.br`
4. O Railway vai mostrar um registro CNAME para voce configurar

---

## PASSO 3: CONFIGURAR DNS (no painel do seu dominio)

### 3.1 No painel onde registrou itoke.com.br (Registro.br, GoDaddy, etc.):

Adicione estes registros DNS:

| Tipo | Nome | Valor |
|------|------|-------|
| CNAME | api | (valor fornecido pelo Railway, ex: xxx.up.railway.app) |

### 3.2 Aguarde propagacao
- Pode levar de 5 minutos a 24 horas
- Para verificar: `nslookup api.itoke.com.br`

### 3.3 SSL (HTTPS)
- O Railway gera certificado SSL automaticamente
- Nao precisa fazer nada, `https://api.itoke.com.br` vai funcionar

---

## PASSO 4: ATUALIZAR O APP

### 4.1 Editar o eas.json (frontend)
Troque a URL de producao:
```json
"production": {
  "env": {
    "EXPO_PUBLIC_BACKEND_URL": "https://api.itoke.com.br"
  }
}
```

### 4.2 Gerar novo build
```bash
cd frontend
eas build --platform android --profile production
```

---

## PASSO 5: FRONTEND (SITE itoke.com.br) - OPCIONAL

Se quiser ter um site em itoke.com.br (landing page):

Opcao A - Vercel (gratis):
1. Crie conta em vercel.com
2. Conecte o repositorio
3. Configure root directory: `frontend`
4. Adicione dominio `itoke.com.br`
5. No DNS, adicione registro A ou CNAME apontando para Vercel

Opcao B - Apenas redirecionar:
- Se nao quiser site, configure itoke.com.br para redirecionar para a Play Store

---

## CUSTOS MENSAIS ESTIMADOS

| Servico | Plano | Custo |
|---------|-------|-------|
| MongoDB Atlas | M0 (Free) | R$ 0 |
| Railway | Starter | ~R$ 25/mes |
| Dominio itoke.com.br | Registro.br | ~R$ 40/ano |
| Play Store | Conta dev | R$ 125 (unico) |
| App Store | Conta dev | ~R$ 500/ano |
| **TOTAL mensal** | | **~R$ 25/mes** |

---

## CHECKLIST DE DEPLOY

- [ ] MongoDB Atlas criado e connection string copiada
- [ ] Repositorio salvo no GitHub
- [ ] Railway conectado ao GitHub
- [ ] Variaveis de ambiente configuradas no Railway
- [ ] Backend rodando (testar: https://api.itoke.com.br/api/health)
- [ ] DNS configurado: api.itoke.com.br -> Railway
- [ ] SSL ativo (https funcionando)
- [ ] eas.json atualizado com URL de producao
- [ ] Build de preview testado no celular
- [ ] Build de producao gerado

---

## ESCALANDO DEPOIS

Quando o app crescer, os upgrades sao simples:

| Usuarios | MongoDB | Railway | Custo estimado |
|----------|---------|---------|----------------|
| 0-5.000 | M0 Free | Starter | R$ 25/mes |
| 5.000-50.000 | M10 | Pro | R$ 350/mes |
| 50.000-500.000 | M30 | Pro + mais replicas | R$ 1.500/mes |
| 500.000+ | Dedicado | AWS/GCP | Sob consulta |

A migracao entre planos e feita com 1 clique, sem downtime.

---

## SUPORTE

Se precisar de ajuda:
- Railway: https://docs.railway.app
- MongoDB Atlas: https://docs.atlas.mongodb.com
- Expo EAS: https://docs.expo.dev/eas
