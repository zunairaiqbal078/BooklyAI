import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { heuristicInterpret } from "./ai.heuristic.js";
import { BOOKING_SYSTEM_PROMPT, buildUserPrompt } from "./ai.prompt.js";
import { safeParseAiResponse } from "./ai.parser.js";
import type {
  AiCatalogContext,
  AiIntent,
  ConversationTurn,
} from "./ai.schema.js";

export interface InterpretInput {
  message: string;
  history: ConversationTurn[];
  context: AiCatalogContext;
}

export interface InterpretResult {
  intent: AiIntent;
  model: string;
  latencyMs: number;
  success: boolean;
  errorCode: string | null;
  source: "groq" | "heuristic";
}

interface GroqChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Isolated Groq client (OpenAI-compatible). Interprets natural language into structured intent.
 * Does not query PostgreSQL and does not create appointments.
 */
export class AiService {
  async interpret(input: InterpretInput): Promise<InterpretResult> {
    const started = Date.now();

    if (!env.GROQ_API_KEY || env.NODE_ENV === "test") {
      const intent = heuristicInterpret({
        message: input.message,
        context: input.context,
      });
      return {
        intent,
        model: env.NODE_ENV === "test" ? "heuristic-test" : "heuristic",
        latencyMs: Date.now() - started,
        success: true,
        errorCode: null,
        source: "heuristic",
      };
    }

    try {
      const intent = await this.callGroq(input);
      return {
        intent,
        model: env.GROQ_MODEL,
        latencyMs: Date.now() - started,
        success: true,
        errorCode: null,
        source: "groq",
      };
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error.message : "unknown",
          event: "ai.failure",
        },
        "Groq interpret failed — falling back to heuristic",
      );

      const intent = heuristicInterpret({
        message: input.message,
        context: input.context,
      });
      intent.reply = `${intent.reply} (I had trouble reaching the AI service, so I used a simpler parser.)`;

      return {
        intent,
        model: env.GROQ_MODEL,
        latencyMs: Date.now() - started,
        success: false,
        errorCode: "GROQ_UNAVAILABLE",
        source: "heuristic",
      };
    }
  }

  private async callGroq(input: InterpretInput): Promise<AiIntent> {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: BOOKING_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildUserPrompt({
              message: input.message,
              history: input.history,
              context: input.context,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Groq HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const payload = (await response.json()) as GroqChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Groq returned an empty response.");
    }

    const parsed = safeParseAiResponse(content);
    if (!parsed) {
      throw new Error("Failed to parse structured AI response.");
    }

    return parsed;
  }
}

export const aiService = new AiService();
