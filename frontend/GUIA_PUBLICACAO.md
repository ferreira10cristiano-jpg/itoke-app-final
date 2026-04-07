# Guia de Publicacao - iToke

## PASSO A PASSO COMPLETO

---

## 1. PREPARACAO (Antes de tudo)

### 1.1 Salvar codigo no GitHub
- No chat do Emergent, clique em **"Save to Github"**
- Crie um repositorio (ex: `itoke-app`)
- Faca o push

### 1.2 Baixar o codigo no seu computador
```bash
git clone https://github.com/SEU_USUARIO/itoke-app.git
cd itoke-app/frontend
npm install
```

---

## 2. CONFIGURAR EXPO EAS

### 2.1 Criar conta no Expo (gratis)
- Acesse: https://expo.dev/signup
- Crie sua conta

### 2.2 Instalar EAS CLI
```bash
npm install -g eas-cli
eas login
# Digite seu email e senha do Expo
```

### 2.3 Vincular o projeto
```bash
cd frontend
eas init
# Isso vai gerar o projectId automaticamente
# O projectId sera adicionado no app.json automaticamente
```

### 2.4 Editar app.json
Substitua estes campos:
- `"owner"`: seu usuario do Expo (ex: `"joaosilva"`)
- `"extra.eas.projectId"`: o ID gerado pelo `eas init`

---

## 3. BUILD ANDROID (Play Store)

### 3.1 Gerar APK de teste (para testar no celular)
```bash
eas build --platform android --profile preview
# Aguarde ~15 minutos
# Voce recebera um link para baixar o .apk
# Instale no celular para testar
```

### 3.2 Gerar AAB de producao (para a Play Store)
```bash
eas build --platform android --profile production
# Aguarde ~15 minutos
# Voce recebera o .aab para subir na Play Store
```

### 3.3 Publicar na Play Store
1. Acesse: https://play.google.com/console
2. Crie conta de desenvolvedor (US$ 25, taxa unica)
3. Clique em "Criar app"
4. Preencha:
   - Nome: iToke
   - Idioma: Portugues (Brasil)
   - Tipo: App
   - Acesso: Gratuito
5. Va em "Producao" > "Criar nova versao"
6. Faca upload do arquivo .aab
7. Preencha a descricao (copie do arquivo DESCRICAO_LOJAS.md)
8. Adicione screenshots (capture do app rodando)
9. Preencha o questionario de conteudo
10. Envie para revisao (~2-7 dias para aprovacao)

---

## 4. BUILD iOS (App Store)

### 4.1 Gerar IPA
```bash
eas build --platform ios --profile production
# O EAS compila na nuvem (nao precisa de Mac!)
# Aguarde ~20 minutos
# Voce recebera o .ipa
```

### 4.2 Publicar na App Store
1. Acesse: https://developer.apple.com
2. Crie conta de desenvolvedor (US$ 99/ano)
3. Use o Transporter (app gratuito da Apple, roda no Mac ou EAS Submit):
```bash
eas submit --platform ios --profile production
```
4. Acesse App Store Connect: https://appstoreconnect.apple.com
5. Preencha informacoes do app
6. Envie para revisao (~1-3 dias)

---

## 5. EDITAR URL DE PRODUCAO

Antes do build de producao, edite o `eas.json`:
```json
"production": {
  "env": {
    "EXPO_PUBLIC_BACKEND_URL": "https://seu-dominio-real.com"
  }
}
```

Opcoes de hospedagem do backend:
- Railway (facil, ~US$ 5/mes)
- Render (tem plano gratis)
- AWS / DigitalOcean (mais controle)

---

## 6. CHECKLIST FINAL

### Antes de publicar:
- [ ] Conta Expo criada (expo.dev)
- [ ] Codigo baixado do GitHub
- [ ] `npm install` executado na pasta frontend
- [ ] `eas init` executado
- [ ] app.json atualizado (owner e projectId)
- [ ] Backend hospedado em servidor de producao
- [ ] URL de producao configurada no eas.json
- [ ] Build de preview testado no celular
- [ ] Screenshots capturados
- [ ] Descricao preenchida na loja

### Play Store:
- [ ] Conta de desenvolvedor criada (US$ 25)
- [ ] Build .aab gerado
- [ ] Upload feito
- [ ] Questionario de conteudo respondido
- [ ] Politica de privacidade URL adicionada
- [ ] Enviado para revisao

### App Store:
- [ ] Conta de desenvolvedor criada (US$ 99/ano)
- [ ] Build .ipa gerado
- [ ] Upload via EAS Submit ou Transporter
- [ ] Informacoes preenchidas no App Store Connect
- [ ] Enviado para revisao

---

## DICAS IMPORTANTES

1. **Comece pelo Android** - mais barato e aprovacao mais rapida
2. **Teste o APK preview** antes de enviar para a loja
3. **A URL do backend** precisa ser um dominio real (nao o preview do Emergent)
4. **Screenshots**: capture do app rodando no celular ou emulador
5. **Politica de privacidade**: use a pagina /legal do app como URL
