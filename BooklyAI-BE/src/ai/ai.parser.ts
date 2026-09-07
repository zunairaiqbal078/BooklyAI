import { aiIntentSchema, type AiIntent } from "./ai.schema.js";

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // fall through
  }

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim()) as unknown;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  }

  throw new Error("No JSON object found in model response.");
}

export function parseAiResponse(raw: unknown): AiIntent {
  if (typeof raw === "string") {
    return aiIntentSchema.parse(extractJsonObject(raw));
  }
  return aiIntentSchema.parse(raw);
}

export function safeParseAiResponse(raw: unknown): AiIntent | null {
  try {
    return parseAiResponse(raw);
  } catch {
    return null;
  }
}
