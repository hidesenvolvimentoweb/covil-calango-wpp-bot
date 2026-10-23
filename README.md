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
SESSION_PATH=./auth_info
OPENROUTER_API_KEY=
```

Instale as dependências e inicie o bot:

```sh
npm ci
npm start
```

Defina `WHATSAPP_GROUPS` com os nomes ou JIDs dos grupos, separados por vírgulas. O bot precisa fazer parte de cada grupo. Ele escuta mensagens e envia lembretes para todos os grupos configurados a cada 10 minutos; ajuste o agendamento em `src/index.js` antes de usar em produção. A sessão é mantida em `SESSION_PATH`: guarde esse diretório entre reinícios e não compartilhe nem versione os arquivos de autenticação.

As mensagens enviadas pelo bot ficam centralizadas em `src/messages.js`, incluindo respostas padrão e textos dos lembretes.

O conteúdo de `conhecimento.md`, na raiz do projeto, é enviado como contexto em cada pergunta à IA. Edite esse arquivo para atualizar as informações de referência usadas nas respostas.

## Docker

Construa e execute a imagem montando a sessão como volume persistente e fornecendo as variáveis de ambiente necessárias:

```sh
docker build -t wp-bot .
docker run -d --name wp-bot --restart unless-stopped \
  -e WHATSAPP_GROUPS="Grupo Teste Bot,Outro Grupo" \
  -e SESSION_PATH=/app/auth_info \
  -v wp-bot-auth:/app/auth_info \
  --env-file .env \
  wp-bot
```

Na primeira execução, consulte `docker logs -f wp-bot` e leia o QR code para autenticar a sessão. Não publique nem compartilhe os logs enquanto o QR estiver visível.