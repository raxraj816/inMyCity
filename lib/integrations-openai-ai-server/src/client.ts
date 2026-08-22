import OpenAI from "openai";

const apiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;

const baseURL =
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? process.env.OPENAI_BASE_URL;

export const openai = apiKey
  ? new OpenAI({
      apiKey,
      baseURL,
    })
  : null;
