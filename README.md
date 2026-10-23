# Projeto WPP Bot

Bot para responder mensagens em grupos do WhatsApp e enviar lembretes periódicos.

## Requisitos

- Node.js 20.19.0 ou superior.
- Uma sessão autenticada do WhatsApp. Na primeira execução, o QR code será exibido no terminal.
- `OPENROUTER_API_KEY` no `.env` para habilitar respostas geradas pela IA. Sem essa variável, o bot continua ligado, mas não responde com IA.

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
WHATSAPP_GROUPS=Grupo Teste Bot,Outro Grupo
# Também pode usar JIDs de grupos, por exemplo 120363000000000000@g.us.
# Compatibilidade: se WHATSAPP_GROUPS não estiver definido, usa JID_TESTE ou WHATSAPP_GROUP_NAME.
SCHEDULE_JOB_PERIODICITY=0 9 * * *
SESSION_PATH=./auth_info
OPENROUTER_API_KEY=
```

Instale as dependências e inicie o bot:

```sh
npm ci
npm start
```

Defina `WHATSAPP_GROUPS` com os nomes ou JIDs dos grupos, separados por vírgulas. O bot precisa fazer parte de cada grupo. Ele escuta mensagens e envia um lembrete diário para todos os grupos configurados. `SCHEDULE_JOB_PERIODICITY` usa uma expressão cron e, por padrão, `0 9 * * *` agenda a postagem para as 9h, de acordo com o fuso horário local do processo. A sessão é mantida em `SESSION_PATH`: guarde esse diretório entre reinícios e não compartilhe nem versione os arquivos de autenticação.

As mensagens enviadas pelo bot ficam centralizadas em `src/messages.js`, incluindo respostas padrão e textos dos lembretes.

O conteúdo de `conhecimento.md`, na raiz do projeto, é enviado como contexto em cada pergunta à IA. Edite esse arquivo para atualizar as informações de referência usadas nas respostas.

## Docker

No servidor, instale o Docker e copie o projeto (sem compartilhar o arquivo `.env`). Crie o `.env` com as variáveis necessárias e construa a imagem:

```sh
docker build -t wp-bot .
```

Inicie o bot com reinício automático e um volume persistente para a sessão do WhatsApp:

```sh
docker run -d --name wp-bot --restart unless-stopped \
  --env-file .env \
  -e SESSION_PATH=/app/auth_info \
  -v wp-bot-auth:/app/auth_info \
  wp-bot
```

O bot não precisa publicar nenhuma porta: ele mantém a conexão de saída com o WhatsApp. Na primeira execução, acompanhe `docker logs -f wp-bot` e leia o QR code para autenticar. Não compartilhe esses logs enquanto o QR estiver visível. O volume `wp-bot-auth` preserva a sessão entre reinícios e atualizações do contêiner; mantenha-o ao recriar o contêiner. Para atualizar a imagem, execute novamente `docker build -t wp-bot .` e recrie o contêiner. O `.dockerignore` impede que `.env` e arquivos de autenticação sejam incluídos na imagem.