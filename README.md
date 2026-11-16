# WPP Bot

Bot de WhatsApp para responder mensagens privadas e mensagens citadas em grupos, além de enviar lembretes periódicos.

## Requisitos

- Node.js 20.19.0 ou superior para execução local, ou Docker Compose.
- Um PostgreSQL existente com a tabela `tb_parametro` e as configurações descritas abaixo.
- Uma sessão autenticada do WhatsApp. Na primeira execução, o QR code aparece nos logs.

O bot não cria banco nem tabelas. A tabela deve ter as colunas `id`, `nome` e `descricao` e conter os parâmetros obrigatórios com os nomes indicados. O bot consulta somente linhas cujo `nome` começa com `WPP_BOT_`.

## Configuração da conexão PostgreSQL

O arquivo `.env` é reservado para conexão com o banco e configurações de execução — não coloque nele as configurações funcionais do bot.

No Docker Compose, o container do bot precisa compartilhar uma rede Docker com o PostgreSQL. Neste ambiente, configure:

- `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD`: banco e credenciais existentes; o Compose os repassa à aplicação.
- `PGHOST=covil-calango-api-db-1` e `PGPORT=5432`: nome do container PostgreSQL e sua porta interna. O serviço `bot` conecta-se à rede Docker externa `covil-calango-api_default`; ela deve existir na VPS antes de subir o bot. `localhost` dentro do container aponta para o próprio container.
- `PGSSL=true` quando o servidor exigir SSL.

Também é possível fornecer `DATABASE_URL` no formato `postgresql://` ou `postgres://`, que substitui as variáveis de conexão separadas.

Para executar diretamente com `npm start`, configure `PGHOST`, `PGDATABASE`, `PGUSER` e `PGPASSWORD`; `PGPORT` é opcional e assume `5433`. `DATABASE_URL` também pode ser usado. Nesse caso, use o endereço do PostgreSQL acessível a partir da máquina onde o processo Node.js roda.

## Parâmetros do bot

Cadastre os parâmetros em `tb_parametro`, usando `nome` e `descricao`. Todos são obrigatórios, exceto os marcados como opcionais; se outro parâmetro estiver ausente ou uma flag não for `true`/`false`, o bot não inicia. Quando `WPP_BOT_WHATSAPP_GROUPS` estiver ausente ou vazio, o bot usa todos os grupos da conta.

| `nome` | Uso | Exemplo de `descricao` |
|---|---|---|
| `WPP_BOT_WHATSAPP_GROUPS` (opcional) | Grupos separados por vírgula: nomes ou JIDs. Se ausente ou vazio, seleciona todos os grupos da conta. | `120363411812937621@g.us` |
| `WPP_BOT_SCHEDULE_JOB_PERIODICITY` | Expressão cron para envio de lembretes. | `0 9 * * *` |
| `WPP_BOT_AI_PROVIDER` (opcional) | Provedor da IA. Se ausente, usa `openrouter`. | `openrouter` ou `deepseek` |
| `WPP_BOT_AI_MODEL` (opcional) | Modelo da IA. Se ausente, usa `recursive/flint-v1.0:free` (OpenRouter) ou `deepseek-chat` (DeepSeek). | `deepseek-chat` |
| `WPP_BOT_OPENROUTER_API_KEY` (opcional) | Chave do OpenRouter. Necessária quando o provedor é `openrouter`. | Chave fornecida pelo OpenRouter |
| `WPP_BOT_DEEPSEEK_API_KEY` (opcional) | Chave do DeepSeek. Necessária quando o provedor é `deepseek`. | Chave criada em platform.deepseek.com |
| `WPP_BOT_ENABLE_AI_RESPONSES` | Habilita respostas da IA no privado e quando alguém cita uma mensagem do bot em grupo. | `true` ou `false` |
| `WPP_BOT_MENTION_ALL_ON_REMINDER` | Marca os participantes ao enviar lembretes. | `true` ou `false` |
| `WPP_BOT_MESSAGE_REMINDER_DEFAULT` | Texto da legenda do lembrete. | Texto desejado |

O lembrete inclui a imagem `src/images/covil-calango-post.png`. A expressão `* * * * *` agenda o envio a cada minuto. O container usa o fuso `America/Sao_Paulo`.

As alterações feitas no banco são recarregadas a cada 30 segundos. Se uma consulta ou validação falhar durante a recarga, o bot registra o erro e mantém as configurações carregadas anteriormente.

Com `WPP_BOT_ENABLE_AI_RESPONSES=true`, o bot responde às mensagens privadas válidas e, em grupos configurados, somente às mensagens que citam uma mensagem enviada por ele. Com a opção desativada, não responde com IA em nenhum dos casos.

Para conferir os parâmetros cadastrados:

```sql
SELECT id, nome, descricao
FROM tb_parametro
WHERE LEFT(nome, 8) = 'WPP_BOT_'
ORDER BY id;
```

Para alterar um valor, atualize `descricao` da linha correspondente a `nome`. Por exemplo, para mudar o agendamento:

```sql
UPDATE tb_parametro
SET descricao = '* * * * *'
WHERE nome = 'WPP_BOT_SCHEDULE_JOB_PERIODICITY';
```

Guarde as chaves do OpenRouter e do DeepSeek como segredo e restrinja o acesso às configurações no banco. Não exponha o PostgreSQL à internet nem use credenciais administrativas em aplicações que só precisam atualizar `tb_parametro`.

## Executar com Docker Compose

```sh
docker compose up -d --build
docker compose logs -f bot
```

Na primeira execução, leia o QR code nos logs para autenticar o WhatsApp. Não compartilhe os logs enquanto o QR code estiver visível. O volume `whatsapp-auth` preserva a sessão entre reinícios. Para atualizar o bot, execute novamente `docker compose up -d --build`.

## Executar localmente

```sh
npm ci
npm start
```

O conteúdo de `INFO.md` é enviado como contexto às solicitações da IA; edite esse arquivo para atualizar as informações de referência.
