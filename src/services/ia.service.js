import { messages } from "../messages.js";
import { OpenRouter } from "@openrouter/sdk";
import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getSettings } from "../settings.js";

const providers = {
  openrouter: {
    defaultModel: "recursive/flint-v1.0:free",
    apiKeySetting: "WPP_BOT_OPENROUTER_API_KEY",
    getApiKey: (settings) => settings.openrouterApiKey,
    async complete({ apiKey, model, chatMessages }) {
      const openrouter = new OpenRouter({ apiKey });
      const completion = await openrouter.chat.send({
        chatRequest: { model, messages: chatMessages, stream: false },
      });
      return completion.choices[0]?.message?.content;
    },
  },
  deepseek: {
    defaultModel: "deepseek-chat",
    apiKeySetting: "WPP_BOT_DEEPSEEK_API_KEY",
    getApiKey: (settings) => settings.deepseekApiKey,
    async complete({ apiKey, model, chatMessages }) {
      // A API do DeepSeek é compatível com a da OpenAI; basta trocar a baseURL.
      const deepseek = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
      const completion = await deepseek.chat.completions.create({
        model,
        messages: chatMessages,
        stream: false,
      });
      return completion.choices[0]?.message?.content;
    },
  },
};

export async function generateByPrompt(prompt) {
  try {
    const settings = getSettings();
    const provider = providers[settings.aiProvider];

    const apiKey = provider.getApiKey(settings);
    if (!apiKey) {
      throw new Error(`Configure ${provider.apiKeySetting} para habilitar as respostas da IA (provedor: ${settings.aiProvider}).`);
    }

    const knowledge = await readFile(fileURLToPath(new URL("../../INFO.md", import.meta.url)), "utf8");

    const chatMessages = [
      {
        role: "system",
        content: `Siga as instruções e use as informações a seguir para atender o cliente. Se elas não forem suficientes para responder, diga isso claramente. Não responda nada que não for solicitado.\n\n${knowledge}`,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const content = await provider.complete({
      apiKey,
      model: settings.aiModel || provider.defaultModel,
      chatMessages,
    });

    return content || messages.replies.genericErrorReply;
  } catch (err) {
    console.error("Erro ao gerar resposta da IA:", err);
    return messages.replies.genericErrorReply;
  }
}
