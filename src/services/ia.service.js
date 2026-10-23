import { OpenAI } from "openai";
import dotenv from "dotenv";
import { messages } from "../messages.js";

dotenv.config();

const clientIAConfig = {
  model: "moonshotai/Kimi-K2-Instruct-0905",
  role: "user",
  temperature: 0.7,
  max_tokens: 300
}

export async function generateByPrompt(prompt) {
  try {
    if (!process.env.HF_TOKEN || !process.env.HF_BASE_URL) {
      throw new Error("Configure HF_TOKEN e HF_BASE_URL para habilitar as respostas da IA.");
    }

    const client = new OpenAI({
      baseURL: process.env.HF_BASE_URL,
      apiKey: process.env.HF_TOKEN,
    });
    const completion = await client.chat.completions.create({
      model: clientIAConfig.model,
      messages: [
        {
          role: clientIAConfig.role,
          content: prompt,
        },
      ],
      temperature: clientIAConfig.temperature,
      max_tokens: clientIAConfig.max_tokens,
    });

    return completion.choices[0]?.message?.content || messages.replies.unrecognized;
  } catch (err) {
    console.error("Erro ao gerar resposta da IA:", err);
    return messages.replies.aiError;
  }
}