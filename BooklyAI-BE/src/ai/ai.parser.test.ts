import { describe, expect, it } from "vitest";
import { heuristicInterpret } from "./ai.heuristic.js";
import { parseAiResponse, safeParseAiResponse } from "./ai.parser.js";

const context = {
  today: "2026-09-07",
  role: "CUSTOMER" as const,
  account: {
    userId: "11111111-1111-4111-8111-111111111111",
    name: "Ava Chen",
    email: "customer@booklyai.dev",
    role: "CUSTOMER" as const,
    businessId: null,
    onboardingComplete: null,
    ownedBusiness: null,
  },
  businesses: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Northside Wellness",
      slug: "northside-wellness",
      category: "WELLNESS",
      city: "Austin",
      description: "Consultations and follow-ups.",
    },
  ],
  services: [
    {
      id: "44444444-4444-4444-8444-444444444441",
      businessId: "33333333-3333-4333-8333-333333333333",
      name: "General consultation",
      durationMin: 45,
      priceCents: 9000,
    },
  ],
  draft: null,
};

describe("parseAiResponse", () => {
  it("accepts a valid structured intent", () => {
    const parsed = parseAiResponse({
      intent: "book_appointment",
      service: "consultation",
      date: "2026-09-08",
      time: "15:30",
      businessId: null,
      confirm: false,
      confidence: 0.94,
      missingFields: [],
      reply: "I can help with that.",
    });

    expect(parsed.intent).toBe("book_appointment");
    expect(parsed.confidence).toBe(0.94);
  });

  it("parses JSON from fenced model output", () => {
    const parsed = parseAiResponse(`\`\`\`json
{"intent":"small_talk","service":null,"date":null,"time":null,"businessId":null,"confirm":false,"confidence":0.5,"missingFields":[],"reply":"Hi"}
\`\`\``);
    expect(parsed.intent).toBe("small_talk");
  });

  it("rejects invalid payloads", () => {
    expect(safeParseAiResponse({ intent: "delete_everything" })).toBeNull();
  });
});

describe("heuristicInterpret", () => {
  it("extracts a booking request for tomorrow", () => {
    const intent = heuristicInterpret({
      message: "I need a general consultation tomorrow afternoon.",
      context,
    });
    expect(intent.intent).toBe("book_appointment");
    expect(intent.date).toBe("2026-09-08");
    expect(intent.service).toMatch(/consultation/i);
  });

  it("treats yes as confirmation", () => {
    const intent = heuristicInterpret({
      message: "Yes, confirm it",
      context: {
        ...context,
        draft: {
          businessId: context.businesses[0]!.id,
          serviceId: context.services[0]!.id,
          serviceName: "General consultation",
          date: "2026-09-09",
          time: "15:30",
          awaitingConfirmation: true,
        },
      },
    });
    expect(intent.intent).toBe("confirm_booking");
    expect(intent.confirm).toBe(true);
  });

  it("refuses out-of-context questions", () => {
    const intent = heuristicInterpret({
      message: "Who is the president?",
      context,
    });
    expect(intent.intent).toBe("out_of_context");
    expect(intent.reply.toLowerCase()).toContain("out of context");
  });

  it("returns account info for the signed-in customer", () => {
    const intent = heuristicInterpret({
      message: "Who am I?",
      context,
    });
    expect(intent.intent).toBe("account_info");
  });
});
