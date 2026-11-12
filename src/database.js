import pg from "pg";

const { Pool } = pg;

const settingNames = Object.freeze({
  whatsappGroups: "WPP_BOT_WHATSAPP_GROUPS",
  scheduleJobPeriodicity: "WPP_BOT_SCHEDULE_JOB_PERIODICITY",
  openrouterApiKey: "WPP_BOT_OPENROUTER_API_KEY",
  deepseekApiKey: "WPP_BOT_DEEPSEEK_API_KEY",
  aiProvider: "WPP_BOT_AI_PROVIDER",
  aiModel: "WPP_BOT_AI_MODEL",
  enableAiResponses: "WPP_BOT_ENABLE_AI_RESPONSES",
  mentionAllOnReminder: "WPP_BOT_MENTION_ALL_ON_REMINDER",
});

const messageNames = Object.freeze({
  reminder: "WPP_BOT_MESSAGE_REMINDER_DEFAULT",
});

const readBoolean = (name, value) => {
  if (value.toLowerCase() === "true") {
    return true;
  }
  if (value.toLowerCase() === "false") {
    return false;
  }
  throw new Error(`O parâmetro ${name} deve ter descricao "true" ou "false".`);
};

const aiProviders = Object.freeze(["openrouter", "deepseek"]);

const readAiProvider = (value) => {
  const provider = (value ?? "openrouter").trim().toLowerCase();
  if (!aiProviders.includes(provider)) {
    throw new Error(`O parâmetro ${settingNames.aiProvider} deve ser um destes valores: ${aiProviders.join(", ")}.`);
  }
  return provider;
};

const normalizeSettings = (rows) => {
  const parameters = new Map();
  for (const row of rows) {
    if (parameters.has(row.nome)) {
      throw new Error(`O parâmetro "${row.nome}" está duplicado em tb_parametro.`);
    }
    parameters.set(row.nome, row.descricao);
  }

  const getValue = (name) => {
    const value = parameters.get(name);
    if (value === undefined || value === null) {
      throw new Error(`O parâmetro obrigatório "${name}" não foi encontrado em tb_parametro.`);
    }
    return value;
  };

  return {
    whatsappGroups: parameters.get(settingNames.whatsappGroups) ?? "",
    scheduleJobPeriodicity: getValue(settingNames.scheduleJobPeriodicity),
    aiProvider: readAiProvider(parameters.get(settingNames.aiProvider)),
    aiModel: parameters.get(settingNames.aiModel)?.trim() ?? "",
    openrouterApiKey: parameters.get(settingNames.openrouterApiKey)?.trim() ?? "",
    deepseekApiKey: parameters.get(settingNames.deepseekApiKey)?.trim() ?? "",
    enableAiResponses: readBoolean(
      settingNames.enableAiResponses,
      getValue(settingNames.enableAiResponses),
    ),
    mentionAllOnReminder: readBoolean(
      settingNames.mentionAllOnReminder,
      getValue(settingNames.mentionAllOnReminder),
    ),
    messages: {
      reminder: getValue(messageNames.reminder),
    },
  };
};

export const createPool = () => {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    let parsedUrl;
    try {
      parsedUrl = new URL(connectionString);
    } catch {
      throw new Error("DATABASE_URL não contém uma URL PostgreSQL válida.");
    }
    if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
      throw new Error("DATABASE_URL deve usar o protocolo postgres:// ou postgresql://.");
    }

    return new Pool({
      connectionString,
      ssl: process.env.PGSSL?.toLowerCase() === "true" ? { rejectUnauthorized: true } : false,
    });
  }

  const host = process.env.PGHOST;
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const missing = [!host && "PGHOST", !database && "PGDATABASE", !user && "PGUSER", !password && "PGPASSWORD"].filter(Boolean);
  if (missing.length) {
    throw new Error(`Configure as variáveis de conexão PostgreSQL: ${missing.join(", ")}.`);
  }

  const port = Number(process.env.PGPORT || 5433);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PGPORT deve ser um número entre 1 e 65535.");
  }

  return new Pool({
    host,
    port,
    database,
    user,
    password,
    ssl: process.env.PGSSL?.toLowerCase() === "true" ? { rejectUnauthorized: true } : false,
  });
};

export const loadSettings = async (pool) => {
  const { rows } = await pool.query(
    "SELECT nome, descricao FROM tb_parametro WHERE LEFT(nome, 8) = 'WPP_BOT_' ORDER BY id",
  );
  return normalizeSettings(rows);
};
