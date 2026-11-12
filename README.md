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

Cadastre os parâmetros em `tb_parametro`, usando `nome` e `descricao`. Todos são obrigatórios, exceto `WPP_BOT_WHATSAPP_GROUPS`; se outro parâmetro estiver ausente ou uma flag não for `true`/`false`, o bot não inicia. Quando `WPP_BOT_WHATSAPP_GROUPS` estiver ausente ou vazio, o bot usa todos os grupos da conta.

| `nome` | Uso | Exemplo de `descricao` |
|---|---|---|
| `WPP_BOT_WHATSAPP_GROUPS` (opcional) | Grupos separados por vírgula: nomes ou JIDs. Se ausente ou vazio, seleciona todos os grupos da conta. | `120363411812937621@g.us` |
| `WPP_BOT_SCHEDULE_JOB_PERIODICITY` | Expressão cron para envio de lembretes. | `0 9 * * *` |
| `WPP_BOT_OPENROUTER_API_KEY` | Chave para respostas da IA. | Chave fornecida pelo OpenRouter |
| `WPP_BOT_ENABLE_AI_RESPONSES` | Habilita respostas da IA no privado e quando alguém cita uma mensagem do bot em grupo. | `true` ou `false` |
| `WPP_BOT_MENTION_ALL_ON_REMINDER` | Marca os participantes ao enviar lembretes. | `true` ou `false` |
| `WPP_BOT_MESSAGE_REMINDER_DEFAULT` | Texto da legenda do lembrete. | Texto desejado |
| `WPP_BOT_ENABLE_ORDER_LOOKUP` (opcional) | Habilita a consulta de pedidos no painel externo. Se ausente, assume `false`. | `true` ou `false` |
| `WPP_BOT_ORDER_SITE_LOGIN_URL` (obrigatório se a consulta estiver habilitada) | URL da página de login do painel externo. | `https://painel.exemplo.com/login` |
| `WPP_BOT_ORDER_SITE_SEARCH_URL` (obrigatório se a consulta estiver habilitada) | URL de busca de pedidos. Use `{identifier}` onde o número do pedido deve entrar; sem o marcador, o bot anexa `?q=<número>`. | `https://painel.exemplo.com/pedidos?busca={identifier}` |
| `WPP_BOT_ORDER_SITE_USERNAME` (obrigatório se a consulta estiver habilitada) | Usuário/e-mail de acesso ao painel externo. | E-mail da conta |
| `WPP_BOT_ORDER_SITE_PASSWORD` (obrigatório se a consulta estiver habilitada) | Senha de acesso ao painel externo. | Senha da conta |

O lembrete inclui a imagem `src/images/covil-calango-post.png`. A expressão `* * * * *` agenda o envio a cada minuto. O container usa o fuso `America/Sao_Paulo`.

As alterações feitas no banco são recarregadas a cada 30 segundos. Se uma consulta ou validação falhar durante a recarga, o bot registra o erro e mantém as configurações carregadas anteriormente.

Com `WPP_BOT_ENABLE_AI_RESPONSES=true`, o bot responde às mensagens privadas válidas e, em grupos configurados, somente às mensagens que citam uma mensagem enviada por ele. Com a opção desativada, não responde com IA em nenhum dos casos.

## Contexto da conversa e agrupamento de mensagens

O bot guarda em memória o histórico de cada conversa e envia os turnos anteriores à IA junto com a mensagem atual, para que a resposta considere o que já foi dito. Regras:

- No privado, a conversa é identificada pelo JID do contato. Em grupos, pelo JID do grupo mais o participante, para que a conversa de cada pessoa não se misture.
- São mantidas as últimas 20 mensagens (10 turnos) por conversa. Conversas sem atividade há 30 minutos são descartadas.
- O histórico fica apenas em memória e é perdido ao reiniciar o container.
- O classificador de pedidos também recebe o histórico recente. Assim, se o bot pedir o número do pedido e a pessoa responder só com o número, a consulta é feita.

Mensagens enviadas em sequência numa mesma conversa são agrupadas: ao receber uma mensagem, o bot espera 4 segundos; se outras chegarem nesse intervalo, a espera recomeça e todas são respondidas de uma vez, numa única resposta que cita a última mensagem. Enquanto uma resposta está sendo gerada, mensagens novas da mesma conversa esperam e só são processadas depois, para que nunca haja duas respostas em paralelo.

Os limites (quantidade de mensagens, expiração e janela de agrupamento) ficam em `src/services/conversation.service.js` e `src/services/inbox.service.js`.

## Consulta de pedidos

Com `WPP_BOT_ENABLE_ORDER_LOOKUP=true`, cada mensagem que o bot responderia passa primeiro por uma classificação feita pela própria IA, que decide se o texto é uma pergunta sobre um pedido (status, rastreio, prazo, envio) e extrai o número citado. O fluxo é:

1. Não é pergunta sobre pedido: a IA responde normalmente, com o contexto de `INFO.md`.
2. É pergunta sobre pedido, mas veio de um grupo: o bot pede para a pessoa chamar no privado (evita expor dados de pedido no grupo).
3. É pergunta sobre pedido sem número: o bot pede o número do pedido. Nenhuma consulta é feita.
4. É pergunta sobre pedido com número, no privado: o bot entra no painel externo com as credenciais cadastradas, busca o pedido e responde com número, status, data e detalhes extraídos. Se nada for encontrado, avisa para conferir o número; se o painel estiver fora ou o login falhar, avisa que não conseguiu consultar.

A consulta usa o Playwright (Chromium headless) e executa uma busca por vez, com limite de 60 segundos por consulta. Se a classificação pela IA falhar, a mensagem segue o fluxo normal.

Os seletores do HTML do painel (campos do formulário de login, linha de resultado e campos de status/data/detalhes) ficam em `src/services/order-scraper.service.js`, na constante `siteSelectors`. Eles dependem da estrutura do site e devem ser ajustados inspecionando as páginas de login e de busca. O código valida o login verificando se o campo de senha deixou de aparecer após o envio do formulário.

Atenção: o bot não verifica se o pedido pertence a quem está perguntando. Qualquer pessoa que souber um número de pedido pode consultar o status dele. Por isso, extraia do painel apenas informações não sensíveis (status, data, rastreio) e evite incluir nome, endereço ou documento nos seletores.

Para rodar localmente, instale o navegador uma vez após o `npm ci`:

```sh
npx playwright install chromium
```

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

Guarde a chave OpenRouter como segredo e restrinja o acesso às configurações no banco. Não exponha o PostgreSQL à internet nem use credenciais administrativas em aplicações que só precisam atualizar `tb_parametro`.

## Executar com Docker Compose

```sh
docker compose up -d --build
docker compose logs -f bot
```

A imagem usa `node:20-bookworm-slim` e instala o Chromium headless do Playwright com as dependências de sistema; a primeira build demora mais por causa desse download.

Na primeira execução, leia o QR code nos logs para autenticar o WhatsApp. Não compartilhe os logs enquanto o QR code estiver visível. O volume `whatsapp-auth` preserva a sessão entre reinícios. Para atualizar o bot, execute novamente `docker compose up -d --build`.

## Executar localmente

```sh
npm ci
npm start
```

O conteúdo de `INFO.md` é enviado como contexto às solicitações da IA; edite esse arquivo para atualizar as informações de referência.
