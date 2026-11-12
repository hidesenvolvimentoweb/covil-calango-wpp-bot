import { chromium } from "playwright";
import { getSettings } from "../settings.js";

/**
 * Seletores do painel externo onde os pedidos são consultados.
 * Eles dependem do HTML do site: inspecione a página de login e a página de busca
 * de pedidos e ajuste os valores abaixo. Os demais dados (URLs e credenciais) vêm de tb_parametro.
 *
 * - login.*: campos do formulário de login e botão de envio.
 * - result.row: elemento que representa um pedido na página de resultado da busca.
 * - result.<campo>: elementos dentro da linha com cada informação; deixe "" para ignorar o campo.
 */
export const siteSelectors = Object.freeze({
  login: {
    username: 'input[name="email"]',
    password: 'input[name="password"]',
    submit: 'button[type="submit"]',
  },
  result: {
    row: ".order-result-row, tr.pedido-item",
    number: ".order-number",
    status: ".status",
    date: ".date",
    details: ".details",
  },
});

const actionTimeoutMs = 15000;
const navigationTimeoutMs = 20000;
const lookupTimeoutMs = 60000;
const identifierPlaceholder = "{identifier}";

let browserPromise;
let queue = Promise.resolve();

const getBrowser = () => {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true }).then((browser) => {
      browser.on("disconnected", () => {
        browserPromise = undefined;
      });
      return browser;
    });
    browserPromise.catch(() => {
      browserPromise = undefined;
    });
  }
  return browserPromise;
};

export const closeBrowser = async () => {
  const pending = browserPromise;
  browserPromise = undefined;
  if (pending) {
    await pending.then((browser) => browser.close()).catch(() => {});
  }
};

/**
 * Monta a URL de busca. Se o template tiver "{identifier}", substitui; senão anexa "?q=<identificador>".
 */
export const buildSearchUrl = (template, identifier) => {
  const encoded = encodeURIComponent(identifier);
  if (template.includes(identifierPlaceholder)) {
    return template.replaceAll(identifierPlaceholder, encoded);
  }
  return `${template}${template.includes("?") ? "&" : "?"}q=${encoded}`;
};

const readField = async (row, selector) => {
  if (!selector) {
    return "";
  }
  const text = await row.locator(selector).first().innerText({ timeout: 2000 }).catch(() => "");
  return text.replace(/\s+/g, " ").trim();
};

const login = async (page, { loginUrl, username, password }) => {
  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
  await page.fill(siteSelectors.login.username, username);
  await page.fill(siteSelectors.login.password, password);
  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    page.click(siteSelectors.login.submit),
  ]);
  await page.waitForLoadState("networkidle").catch(() => {});

  const stillOnLogin = await page.locator(siteSelectors.login.password).count();
  if (stillOnLogin > 0) {
    throw new Error("Login no painel externo falhou: o formulário de login continua visível. Verifique as credenciais e os seletores.");
  }
};

const runLookup = async (identifier) => {
  const { orderLookup } = getSettings();
  const browser = await getBrowser();
  const context = await browser.newContext();
  context.setDefaultTimeout(actionTimeoutMs);
  context.setDefaultNavigationTimeout(navigationTimeoutMs);

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`A consulta do pedido excedeu ${lookupTimeoutMs / 1000} segundos.`)), lookupTimeoutMs);
  });

  const lookup = (async () => {
    const page = await context.newPage();
    await login(page, orderLookup);

    await page.goto(buildSearchUrl(orderLookup.searchUrl, identifier), { waitUntil: "domcontentloaded" });
    const row = page.locator(siteSelectors.result.row).first();
    await row.waitFor({ state: "attached", timeout: 10000 }).catch(() => {});
    if (await row.count() === 0) {
      return null;
    }

    return {
      number: (await readField(row, siteSelectors.result.number)) || identifier,
      status: await readField(row, siteSelectors.result.status),
      date: await readField(row, siteSelectors.result.date),
      details: await readField(row, siteSelectors.result.details),
    };
  })();

  try {
    return await Promise.race([lookup, timeout]);
  } finally {
    clearTimeout(timer);
    await context.close().catch(() => {});
  }
};

/**
 * Consulta um pedido no painel externo. As consultas são executadas uma por vez.
 *
 * @param {string} identifier - Número do pedido (ou outro identificador aceito pela busca do site)
 * @returns {Promise<{ number: string, status: string, date: string, details: string } | null>}
 *   Dados do pedido, ou null quando a busca não retorna resultado. Lança erro em falhas de acesso/login.
 */
export const fetchOrderStatus = (identifier) => {
  const run = queue.then(() => runLookup(identifier));
  queue = run.catch(() => {});
  return run;
};
