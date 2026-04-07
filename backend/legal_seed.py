"""Legal documents seed data for iToke platform"""

LEGAL_DOCUMENTS = [
    {
        "key": "terms_client",
        "title": "Termos de Uso - Cliente",
        "version": "1.0",
        "order": 1,
        "content": """TERMOS DE USO - CLIENTE
Plataforma iToke de Intermediacao de Ofertas e Descontos

Versao: 1.0

1. DEFINICOES E ESCOPO

1.1 Definicoes Principais

"iToke": Plataforma digital de intermediacao de ofertas e descontos.
"Cliente": Pessoa fisica que se registra e utiliza a plataforma iToke para acessar ofertas de estabelecimentos parceiros.
"Estabelecimento": Pessoa juridica (restaurante, loja, servico, etc.) que publica ofertas na plataforma iToke.
"Token": Ativo digital de fidelidade, de propriedade exclusiva da iToke, que permite ao Cliente gerar QR Codes para validar ofertas.
"Credito iToke": Ativo digital de recompensa por indicacao, de propriedade exclusiva da iToke, que representa um bonus de fidelidade nao conversivel em moeda corrente.
"Oferta": Promocao ou desconto publicado por um Estabelecimento na plataforma iToke.
"QR Code": Codigo bidimensional unico gerado pela plataforma que permite a validacao de uma Oferta especifica.

1.2 Escopo da Plataforma
A iToke e uma plataforma de intermediacao que conecta Clientes a Estabelecimentos, facilitando a geracao de QR Codes e validacao de ofertas atraves de Tokens, com recompensas por indicacao em forma de Creditos.

A iToke NAO e: uma instituicao financeira, uma corretora de valores, uma casa de cambio, uma plataforma de criptomoedas, um banco ou fintech regulada pelo Banco Central.

2. NATUREZA JURIDICA DA PLATAFORMA

2.1 Plataforma de Intermediacao
A iToke opera como uma plataforma de intermediacao de servicos, conforme definido pela Lei n. 13.874/2019 (Lei da Liberdade Economica).

2.2 Tokens: Bonus de Fidelidade, Nao Moeda Corrente
IMPORTANTE: Os Tokens sao bonus de fidelidade e NAO constituem moeda corrente. Tokens NAO sao dinheiro, NAO tem valor intrinseco, NAO sao titulos ou valores mobiliarios, NAO sao criptomoedas, NAO sao depositos, sao propriedade da iToke, NAO podem ser sacados, NAO podem ser usados para pagar ofertas (servem APENAS para gerar QR Codes).

2.3 Creditos: Recompensas de Indicacao, Nao Moeda Corrente
IMPORTANTE: Os Creditos sao recompensas de indicacao e NAO constituem moeda corrente. Creditos NAO sao dinheiro, NAO podem ser sacados pelo Cliente. Somente Estabelecimentos podem sacar Creditos em dinheiro. Creditos sao nao-transferiveis.

2.4 Conformidade Legal
A iToke esta em conformidade com: Lei n. 13.874/2019, Lei n. 13.709/2018 (LGPD), Lei n. 8.078/1990 (CDC), Lei n. 9.613/1998.

3. DIREITOS E OBRIGACOES DO CLIENTE

3.1 Direitos do Cliente
Acessar a plataforma e visualizar Ofertas, comprar Tokens, gerar QR Codes para Ofertas, receber Creditos atraves do Programa de Indicacao, utilizar Creditos para pagar ofertas, acessar historico de transacoes, solicitar exclusao de dados pessoais (conforme LGPD).

3.2 Obrigacoes do Cliente
Fornecer informacoes precisas e atualizadas, manter credenciais de acesso seguras, nao compartilhar credenciais com terceiros, nao tentar contornar sistemas de seguranca, nao utilizar a plataforma para fins ilicitos.

4. TOKENS: CARACTERISTICAS E LIMITACOES

Propriedade exclusiva da iToke. Uso limitado a gerar QR Codes. Nao transferivel, nao reembolsavel, nao expiram, sem juros. Tokens NUNCA sao usados para pagar ofertas.

5. CREDITOS: RECOMPENSAS DE INDICACAO

O Cliente ganha Creditos atraves do Programa de Indicacao: 1o Nivel: R$ 1,00, 2o Nivel: R$ 1,00, 3o Nivel: R$ 1,00. Creditos podem ser usados APENAS para pagar ofertas.

6. COMPRA DE TOKENS

Tokens sao comprados atraves da plataforma iToke. Tokens comprados NAO podem ser reembolsados (exceto fraude ou erro tecnico).

7. GERACAO DE QR CODE E VALIDACAO DE OFERTAS

Cliente escolhe Oferta, gera QR Code (consome 1 Token), se desloca ao Estabelecimento com o QR Code. QR Code e unico e valido por tempo determinado.

8. PAGAMENTO DE OFERTAS COM CREDITOS

Se Creditos >= Valor da Oferta: Cliente paga 100% com Creditos. Se Creditos < Valor: Cliente paga com Creditos + diferenca em dinheiro. Se nao tem Creditos: Cliente paga 100% em dinheiro ao Estabelecimento.

9. PROGRAMA DE INDICACAO

Cliente recebe codigo de indicacao unico. R$ 1,00 em Creditos por cada compra de pacote de Tokens nos 3 primeiros niveis.

10. RESPONSABILIDADES E LIMITACOES

A iToke e responsavel por manter a plataforma operacional e segura, processar pagamentos corretamente, proteger dados pessoais (LGPD).

11. EXCLUSAO DE RESPONSABILIDADE

A PLATAFORMA iToke E FORNECIDA "NO ESTADO EM QUE SE ENCONTRA". Em nenhuma circunstancia, a responsabilidade total da iToke excedera o valor pago pelo Cliente nos ultimos 12 meses.

12. PROTECAO DE DADOS E PRIVACIDADE

A iToke coleta dados de cadastro, geolocalizacao, transacoes e uso. O Cliente tem direito de acessar, corrigir, solicitar exclusao e portabilidade de dados. Contato: privacy@itoke.com.br

13. PROPRIEDADE INTELECTUAL

Todos os direitos de propriedade intelectual da plataforma pertencem a iToke ou seus licenciadores.

14. ALTERACOES NOS TERMOS

A iToke se reserva o direito de alterar estes Termos a qualquer momento. Alteracoes serao notificadas via email.

15. RESCISAO E SUSPENSAO

Cliente pode rescindir sua conta a qualquer momento. Tokens e Creditos nao utilizados serao perdidos.

16. LEI APLICAVEL E JURISDICAO

Estes Termos sao regidos pela Lei da Republica Federativa do Brasil.

Contato: legal@itoke.com.br

Ao utilizar a plataforma iToke, voce concorda com estes Termos de Uso em sua integralidade."""
    },
    {
        "key": "terms_establishment",
        "title": "Termos de Uso - Estabelecimento",
        "version": "2.0",
        "order": 2,
        "content": """TERMOS DE USO - ESTABELECIMENTO
Plataforma iToke de Intermediacao de Ofertas e Descontos

Versao: 2.0

1. DEFINICOES E ESCOPO

"iToke": Plataforma digital de intermediacao de ofertas e descontos.
"Estabelecimento": Pessoa juridica que publica ofertas na plataforma iToke.
"Cliente": Pessoa fisica que utiliza a plataforma para acessar ofertas.
"Token": Ativo digital de fidelidade. Para Estabelecimentos: permite publicar ofertas (alocado em quantidade limitada por oferta).
"Credito iToke": Valor recebido pelo Estabelecimento quando um Cliente usa Creditos para pagar uma Oferta. Creditos podem ser sacados em dinheiro real.

2. NATUREZA JURIDICA DA PLATAFORMA

A iToke opera como plataforma de intermediacao de servicos (Lei n. 13.874/2019). A iToke NAO e instituicao financeira, corretora, casa de cambio, plataforma de criptomoedas ou banco.

3. DIREITOS E OBRIGACOES DO ESTABELECIMENTO

Direitos: Comprar pacotes de Tokens, publicar Ofertas, alocar Tokens em Ofertas, receber relatorios detalhados, receber Creditos de Clientes, sacar Creditos em dinheiro real, realocar Tokens entre Ofertas.

Obrigacoes: Fornecer informacoes precisas, honrar integralmente as Ofertas publicadas, confirmar/rejeitar QR Codes honestamente, nao discriminar Clientes, cumprir obrigacoes fiscais e tributarias.

4. TOKENS: COMPRA E ALOCACAO EM OFERTAS

Tokens para Estabelecimento permitem publicar Ofertas. Numero de Tokens = Numero maximo de Clientes que podem gerar QR Code. Tokens sao propriedade da iToke, nao transferiveis, nao reembolsaveis.

5. CREDITOS: RECOMPENSAS DE CLIENTES

Creditos sao dinheiro recebido de Clientes, conversivel em reais. Quando Cliente usa Creditos para pagar, sao transferidos automaticamente para conta do Estabelecimento.

Diferenca: Tokens = Moeda de plataforma (nao conversivel). Creditos = Dinheiro real (conversivel via saque).

6. PUBLICACAO DE OFERTAS

Ofertas devem ser precisas, honestas, disponiveis, legais e reais. Estabelecimento e responsavel por honrar Ofertas publicadas.

7. VALIDACAO DE QR CODES E CONFIRMACAO DE COMPRAS

Estabelecimento escaneia QR Code, verifica presenca do Cliente, confirma compra na plataforma. Creditos sao transferidos automaticamente.

8. RECEBIMENTO DE CREDITOS

Creditos aparecem na conta em tempo real. Historico completo de transacoes disponivel. Relatorios podem ser exportados.

9. SAQUE DE CREDITOS EM DINHEIRO

Estabelecimento acessa dashboard, solicita saque, dinheiro e transferido para conta bancaria. Saque tem comissao percentual definida pela plataforma.

10. RESPONSABILIDADES E LIMITACOES

A iToke e responsavel por manter a plataforma operacional, processar pagamentos e saques corretamente, proteger dados pessoais.

11. EXCLUSAO DE RESPONSABILIDADE

A plataforma e fornecida "no estado em que se encontra". Limite maximo de responsabilidade: valor recebido pelo Estabelecimento nos ultimos 12 meses.

12. PROTECAO DE DADOS E PRIVACIDADE

A iToke coleta dados de cadastro, bancarios, transacoes e uso. O Estabelecimento tem direitos LGPD: acessar, corrigir, excluir e portabilidade. Contato: privacy@itoke.com.br

13. PROPRIEDADE INTELECTUAL

Todos os direitos pertencem a iToke ou seus licenciadores.

14. ALTERACOES NOS TERMOS

A iToke pode alterar os Termos a qualquer momento. Notificacao via email com 30 dias de antecedencia.

15. RESCISAO E SUSPENSAO

Estabelecimento pode rescindir a qualquer momento. Tokens nao utilizados e Creditos nao sacados serao perdidos.

16. LEI APLICAVEL E JURISDICAO

Estes Termos sao regidos pela Lei brasileira. Contato: legal@itoke.com.br

Ao utilizar a plataforma iToke, voce concorda com estes Termos em sua integralidade."""
    },
    {
        "key": "terms_general",
        "title": "Termos de Uso - iToke (Geral)",
        "version": "1.0",
        "order": 3,
        "content": """TERMOS DE USO - iToke
Plataforma de Intermediacao de Ofertas e Descontos

Versao: 1.0

1. DEFINICOES E ESCOPO

"iToke": Plataforma digital de intermediacao de ofertas e descontos.
"Usuario": Pessoa fisica ou juridica que se registra e utiliza a plataforma.
"Cliente": Pessoa fisica que utiliza a plataforma para validar ofertas.
"Estabelecimento": Pessoa juridica que publica ofertas na plataforma.
"Token": Ativo digital de fidelidade, bonus nao conversivel em moeda corrente.
"Oferta": Promocao ou desconto publicado por um Estabelecimento.
"QR Code": Codigo bidimensional unico para validacao de Oferta.

A iToke NAO e: instituicao financeira, corretora de valores, casa de cambio, plataforma de criptomoedas, banco ou fintech regulada pelo Banco Central.

2. NATUREZA JURIDICA

Plataforma de intermediacao (Lei n. 13.874/2019). Tokens sao bonus de fidelidade, NAO constituem moeda corrente. Conformidade com LGPD, CDC, Lei de Prevencao a Lavagem de Dinheiro.

3. DIREITOS E OBRIGACOES DOS USUARIOS

Clientes: acessar ofertas, validar QR Codes, acessar historico, solicitar exclusao de dados.
Estabelecimentos: publicar ofertas, receber relatorios, sacar valores, solicitar suporte.

4. TOKENS

Propriedade da iToke. Uso limitado a validar Ofertas. Nao transferivel, nao reembolsavel, sem expiracao, sem juros.

5. COMPRA E USO DE TOKENS

Compra via plataforma com gateway de pagamento. Tokens NAO podem ser reembolsados (exceto fraude/erro tecnico).

6. OFERTAS E DESCONTOS

Estabelecimentos publicam Ofertas livremente. Ofertas devem ser precisas e honestas. iToke NAO e responsavel pela qualidade das Ofertas.

7. VALIDACAO DE QR CODE E CONFIRMACAO DE COMPRA

Cliente gera QR Code (consome 1 Token). Estabelecimento confirma presenca e compra. Rejeicao deve ocorrer em ate 24 horas.

8. RESPONSABILIDADES

iToke: manter plataforma operacional, processar pagamentos, proteger dados. Usuario: manter credenciais seguras, verificar Ofertas, cumprir obrigacoes tributarias.

9. EXCLUSAO DE RESPONSABILIDADE

Plataforma fornecida "AS IS". Limite de responsabilidade: valor pago nos ultimos 12 meses.

10. PROTECAO DE DADOS (LGPD)

Coleta de dados de cadastro, geolocalizacao, transacoes. Direitos: acessar, corrigir, excluir, portabilidade. Contato: privacy@itoke.com.br

11. PROPRIEDADE INTELECTUAL

Todos os direitos pertencem a iToke.

12. ALTERACOES NOS TERMOS

Direito de alterar a qualquer momento. Notificacao via email.

13. RESCISAO E SUSPENSAO

Usuario pode rescindir a qualquer momento. Tokens perdidos apos rescisao.

14. LEI APLICAVEL E JURISDICAO

Lei brasileira. Contato: legal@itoke.com.br

Ao utilizar a plataforma iToke, voce concorda com estes Termos."""
    },
    {
        "key": "privacy_lgpd",
        "title": "Politica de Privacidade - LGPD",
        "version": "1.0",
        "order": 4,
        "content": """POLITICA DE PRIVACIDADE iToke
Plataforma de Intermediacao de Ofertas

1. INTRODUCAO

A iToke esta comprometida em proteger sua privacidade. Esta Politica explica como coletamos, usamos, divulgamos e protegemos suas informacoes quando voce usa nosso aplicativo movel e website.

2. INFORMACOES QUE COLETAMOS

2.1 Informacoes Fornecidas Diretamente por Voce
Nome completo, Email, Telefone, Endereco, Data de nascimento, CPF ou CNPJ, Dados bancarios (para Estabelecimentos), Informacoes de pagamento.

2.2 Informacoes Coletadas Automaticamente
Localizacao geografica, Endereco IP, Tipo de dispositivo, Sistema operacional, Historico de navegacao, Cookies.

2.3 Informacoes de Terceiros
Redes sociais, Provedores de pagamento, Parceiros comerciais, Autoridades publicas.

3. COMO USAMOS SUAS INFORMACOES

Fornecimento do Servico: Criar e manter conta, processar transacoes, entregar ofertas, conectar Clientes a Estabelecimentos, validar QR Codes, processar pagamentos e saques.

Comunicacao: Notificacoes sobre ofertas, atualizacoes de seguranca, mudancas de politica.

Seguranca: Detectar fraude, prevenir atividades ilicitas, cumprir obrigacoes legais.

Melhorias: Analisar uso, melhorar funcionalidades, desenvolver novos recursos.

4. COMPARTILHAMENTO DE INFORMACOES

Compartilhamos com: Estabelecimentos (quando voce usa uma oferta), provedores de pagamento, processadores de dados, autoridades publicas (quando obrigado por lei).

NAO compartilhamos com: terceiros para marketing, corretoras de dados, publicidade direcionada (sem consentimento).

5. SEGURANCA DE DADOS

Criptografia SSL/TLS, firewalls, acesso restrito a dados pessoais, auditorias de seguranca regulares. Nenhum metodo e 100% seguro.

6. RETENCAO DE DADOS

Dados pessoais: Deletados em ate 30 dias apos encerramento. Dados de transacao: Retidos por 5 anos (conforme lei). Dados anonimizados: Retidos indefinidamente.

7. SEUS DIREITOS LGPD

Conforme a Lei Geral de Protecao de Dados (LGPD), voce tem direito a:
- Acessar: Solicitar copia de seus dados
- Corrigir: Corrigir dados imprecisos
- Deletar: Solicitar exclusao de seus dados
- Portabilidade: Receber dados em formato estruturado
- Revogar consentimento: Retirar consentimento a qualquer momento
- Oposicao: Se opor ao processamento
- Informacao: Saber como seus dados sao usados

Contato: privacy@itoke.com.br

8. COOKIES E RASTREAMENTO

Usamos cookies para manter voce conectado, lembrar preferencias e analisar uso.

9. CRIANCAS E MENORES

Nosso Servico nao e destinado a menores de 18 anos.

10. TRANSFERENCIAS INTERNACIONAIS

Seus dados podem ser transferidos para fora do Brasil com salvaguardas apropriadas.

11. ALTERACOES NESTA POLITICA

Podemos atualizar periodicamente. Notificaremos sobre mudancas significativas.

12. CONTATO

Email: privacy@itoke.com.br
DPO: dpo@itoke.com.br"""
    },
    {
        "key": "legal_compliance",
        "title": "Declaracao de Conformidade Legal",
        "version": "1.0",
        "order": 5,
        "content": """iToke - DECLARACAO DE CONFORMIDADE LEGAL
Plataforma de Intermediacao de Ofertas e Descontos

1. INTRODUCAO

iToke e uma plataforma digital de intermediacao que conecta Clientes a Estabelecimentos atraves de um sistema de Tokens e Creditos. Este documento declara que iToke NAO e um esquema de piramide, MLM ou qualquer atividade fraudulenta.

2. O QUE E iToke

Tokens: Ativos digitais que Clientes compram para gerar QR Codes de ofertas reais.
Creditos: Recompensas que Clientes recebem por indicar amigos (ate 3 niveis).
Ofertas: Promocoes publicadas por Estabelecimentos parceiros.
QR Codes: Codigos unicos que validam ofertas especificas.

3. POR QUE iToke NAO E PIRAMIDE

Piramide: Ganho principal por recrutamento, produto inexistente, pressao de compra, ganho sem venda, estrutura infinita.
iToke: Ganho principal por venda de ofertas, produto real e util, sem pressao, precisa venda real, limitada a 3 niveis, totalmente transparente.

Produto Real e Util: Tokens sao realmente usados para gerar QR Codes de ofertas autenticas.
Venda Real e Obrigatoria: Cliente PRECISA validar uma oferta real para consumir um Token.
Creditos sao Secundarios: Ganho principal e por usar ofertas.
Sem Pressao de Compra: Nao ha obrigacao de comprar Tokens.
Limite de Indicacao: Ganho limitado a 3 niveis (nao infinito).
Comissao Justa: R$ 1,00 por indicacao, razoavel.
Transparencia Total: Termos, politicas e funcionamento sao publicos.

4. CONFORMIDADE LEGAL

Lei n. 13.874/2019 (Lei da Liberdade Economica)
Lei n. 13.709/2018 (LGPD)
Lei n. 8.078/1990 (CDC)
Lei n. 9.613/1998 (Prevencao a Lavagem de Dinheiro)

iToke NAO se enquadra como: esquema de piramide, MLM, atividade fraudulenta, operacao financeira nao regulada.

5. FLUXO OPERACIONAL TRANSPARENTE

1. Cliente compra Tokens
2. Cliente escolhe Oferta real
3. Cliente gera QR Code (consome 1 Token)
4. Cliente se desloca ao Estabelecimento
5. Estabelecimento valida QR Code
6. Cliente realiza compra
7. Cliente paga com Creditos + dinheiro
8. Estabelecimento recebe Creditos + dinheiro
9. Estabelecimento saca Creditos em dinheiro real

6. SEGURANCA E PREVENCAO DE FRAUDE

Validacao de Ofertas reais e verificadas. Limite de indicacao de 3 niveis. Monitoramento de padroes suspeitos. Confirmacao manual pelo Estabelecimento. Historico completo de transacoes. Suspensao de contas fraudulentas.

7. COMPARACAO COM PLATAFORMAS LEGITIMAS

iToke funciona como Uber, Airbnb, iFood, Shopee: conecta dois grupos, oferece servico real, cobra comissao justa, transparencia total.

8. CONFORMIDADE COM LOJAS

Google Play Store e Apple App Store: Produto real e util, transparencia total, conformidade legal, nao e esquema de piramide.

9. CONTATO

Email: legal@itoke.com.br

10. DECLARACAO FINAL

iToke NAO e um esquema de piramide.
iToke NAO e MLM.
iToke NAO e uma atividade fraudulenta.
iToke esta em conformidade com todas as leis brasileiras.
iToke esta em conformidade com Google Play e Apple App Store.
iToke opera com transparencia total."""
    }
]
