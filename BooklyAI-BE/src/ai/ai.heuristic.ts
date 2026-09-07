import type { AiCatalogContext, AiIntent, ConversationTurn } from "./ai.schema.js";

const OUT_OF_CONTEXT_REPLY =
  "This is out of context for BooklyAI. I can only help with finding local services and booking appointments — not general questions outside that.";

/**
 * Offline interpreter used when Mistral is unavailable (tests / missing API key).
 * Keeps booking flow demoable without inventing availability.
 */
export function heuristicInterpret(params: {
  message: string;
  context: AiCatalogContext;
}): AiIntent {
  const text = params.message.trim().toLowerCase();
  const draft = params.context.draft;

  if (isOutOfContext(text)) {
    return {
      intent: "out_of_context",
      service: null,
      date: null,
      time: null,
      businessId: null,
      confirm: false,
      confidence: 0.95,
      missingFields: [],
      reply:
        params.context.role === "BUSINESS"
          ? "This is out of context for BooklyAI. I can only help with your business schedule, appointments, and account summary."
          : OUT_OF_CONTEXT_REPLY,
    };
  }

  if (params.context.role === "BUSINESS") {
    return heuristicBusinessInterpret(text, params.context);
  }

  if (
    /who am i|my (name|email|account|profile)|what('?s| is) my (name|email|account)|account info/.test(
      text,
    )
  ) {
    return {
      intent: "account_info",
      service: null,
      date: null,
      time: null,
      businessId: null,
      confirm: false,
      confidence: 0.95,
      missingFields: [],
      reply: "Here are your account details.",
    };
  }

  if (/^(yes|yep|yeah|confirm|book it|that works|sounds good)\b/.test(text)) {
    return {
      intent: "confirm_booking",
      service: draft?.serviceName ?? null,
      date: draft?.date ?? null,
      time: draft?.time ?? null,
      businessId: draft?.businessId ?? null,
      confirm: true,
      confidence: 0.95,
      missingFields: [],
      reply: "Confirming your appointment now.",
    };
  }

  if (/upcoming|my appointments|show.*(appointment|booking)/.test(text)) {
    return {
      intent: "list_appointments",
      service: null,
      date: null,
      time: null,
      businessId: null,
      confirm: false,
      confidence: 0.9,
      missingFields: [],
      reply: "Here are your appointments.",
    };
  }

  if (/cancel/.test(text)) {
    return {
      intent: "cancel_appointment",
      service: null,
      date: null,
      time: null,
      businessId: null,
      confirm: false,
      confidence: 0.7,
      missingFields: ["appointmentId"],
      reply:
        "I can help cancel. Please open the appointment from your list or dashboard to cancel it for now.",
    };
  }

  if (
    /available|availability|openings|free/.test(text) ||
    /afternoon appointment|morning appointment/.test(text)
  ) {
    const date = resolveRelativeDate(text, params.context.today);
    const businessId =
      matchBusinessId(text, params.context) ?? draft?.businessId ?? null;
    const missing = [
      ...(date ? [] : ["date"]),
      ...(businessId || params.context.businesses.length <= 1 ? [] : ["business"]),
    ];
    return {
      intent: "check_availability",
      service: matchServiceName(text, params.context) ?? draft?.serviceName ?? null,
      date,
      time: extractTime(text),
      businessId: businessId ?? (params.context.businesses.length === 1
        ? params.context.businesses[0]!.id
        : null),
      confirm: false,
      confidence: 0.75,
      missingFields: missing,
      reply: !businessId && params.context.businesses.length > 1
        ? "Which business should I check?"
        : date
          ? "I'll check what's open."
          : "Which day should I check?",
    };
  }

  if (/book|appointment|consultation|need a|schedule|haircut|massage|spa|salon/.test(text)) {
    const service =
      matchServiceName(text, params.context) ?? draft?.serviceName ?? null;
    const date = resolveRelativeDate(text, params.context.today) ?? draft?.date ?? null;
    const time = extractTime(text) ?? draft?.time ?? null;
    const matchedBusiness =
      matchBusinessId(text, params.context) ??
      draft?.businessId ??
      (params.context.businesses.length === 1 ? params.context.businesses[0]!.id : null);

    const missingFields: string[] = [];
    if (!matchedBusiness && params.context.businesses.length > 1) missingFields.push("business");
    if (!service) missingFields.push("service");
    if (!date) missingFields.push("date");
    if (!time) missingFields.push("time");

    let reply = "I can help book that.";
    if (!matchedBusiness && params.context.businesses.length > 1) {
      reply = "Which business would you like to book with? You can also filter by city on Explore.";
    } else if (!service) reply = "Which service do you need?";
    else if (!date) reply = "Which day works for you?";
    else if (!time) reply = "What time works for you?";
    else reply = "I have the details — say confirm to book, or pick another time.";

    return {
      intent: "book_appointment",
      service,
      date,
      time,
      businessId: matchedBusiness,
      confirm: false,
      confidence: missingFields.length === 0 ? 0.9 : 0.7,
      missingFields,
      reply,
    };
  }

  // Bare time reply during an active draft
  const timeOnly = extractTime(text);
  if (timeOnly && draft) {
    return {
      intent: "book_appointment",
      service: draft.serviceName,
      date: draft.date,
      time: timeOnly,
      businessId: draft.businessId,
      confirm: false,
      confidence: 0.88,
      missingFields: [],
      reply: "Got it. Would you like me to confirm that appointment?",
    };
  }

  return {
    intent: "small_talk",
    service: null,
    date: null,
    time: null,
    businessId: null,
    confirm: false,
    confidence: 0.55,
    missingFields: [],
    reply: params.context.account?.name
      ? `Hi ${params.context.account.name.split(/\s+/)[0]}, I can help you find salons, clinics, and other local services, check availability, or book an appointment.`
      : "I can help you find salons, clinics, and other local services, check availability, or book an appointment.",
  };
}

function heuristicBusinessInterpret(text: string, context: AiCatalogContext): AiIntent {
  if (
    /who am i|my (name|email|account|profile|business)|what('?s| is) my (name|email|account)|account info/.test(
      text,
    )
  ) {
    return {
      intent: "account_info",
      service: null,
      date: null,
      time: null,
      businessId: null,
      confirm: false,
      confidence: 0.95,
      missingFields: [],
      reply: "Here are your account details.",
    };
  }

  if (/book|schedule (a|an|my)|make an appointment for (me|a customer)/.test(text) &&
      !/upcoming|how many|summary|total|schedule for today|today'?s schedule/.test(text)) {
    return {
      intent: "small_talk",
      service: null,
      date: null,
      time: null,
      businessId: null,
      confirm: false,
      confidence: 0.85,
      missingFields: [],
      reply:
        `${context.account.name.split(/\s+/)[0] ?? "Hi"}, business accounts use this assistant for schedule insights. Customers book through Explore or the customer assistant.`,
    };
  }

  if (
    /summary|overview|how many|total|stats|statistics|paid|revenue|completed|today'?s schedule|schedule today|account/.test(
      text,
    )
  ) {
    return {
      intent: "business_summary",
      service: null,
      date: null,
      time: null,
      businessId: null,
      confirm: false,
      confidence: 0.92,
      missingFields: [],
      reply: "Here is your business appointment summary.",
    };
  }

  if (/upcoming|my appointments|show.*(appointment|booking)|who('?s| is) (booked|coming)/.test(text)) {
    return {
      intent: "list_appointments",
      service: null,
      date: null,
      time: null,
      businessId: null,
      confirm: false,
      confidence: 0.9,
      missingFields: [],
      reply: "Here are your upcoming appointments.",
    };
  }

  return {
    intent: "business_summary",
    service: null,
    date: null,
    time: null,
    businessId: null,
    confirm: false,
    confidence: 0.7,
    missingFields: [],
    reply:
      `Hi ${context.account.name.split(/\s+/)[0] ?? ""}. I can summarize upcoming bookings, today’s schedule, totals, and completed/paid visits for ${context.account.ownedBusiness?.name ?? "your business"}.`.replace(
        "Hi .",
        "Hi.",
      ),
  };
}

function isOutOfContext(text: string): boolean {
  if (
    /book|appointment|schedule|available|availability|service|salon|clinic|spa|wellness|haircut|massage|consult|cancel|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(:\d{2})?\s*(am|pm)/.test(
      text,
    )
  ) {
    return false;
  }

  return (
    /who is the president|capital of|write (me )?(code|a poem|essay)|weather|crypto|bitcoin|stock market|recipe|football|cricket score|homework|solve this|chatgpt|tell me a joke about politics/.test(
      text,
    ) ||
    (/^(what is|who is|explain|define)\b/.test(text) &&
      !/appointment|service|business|book/.test(text))
  );
}

function matchBusinessId(text: string, context: AiCatalogContext): string | null {
  const hit = context.businesses.find(
    (business) =>
      text.includes(business.name.toLowerCase()) ||
      text.includes(business.slug.replace(/-/g, " ")),
  );
  if (hit) return hit.id;

  const cityHit = context.businesses.filter(
    (business) => business.city && text.includes(business.city.toLowerCase()),
  );
  if (cityHit.length === 1) return cityHit[0]!.id;

  const categoryWords: Record<string, string[]> = {
    SALON: ["salon", "hair", "barber"],
    CLINIC: ["clinic", "doctor", "medical"],
    SPA: ["spa"],
    WELLNESS: ["wellness"],
    FITNESS: ["fitness", "gym", "trainer"],
  };
  for (const [category, words] of Object.entries(categoryWords)) {
    if (words.some((w) => text.includes(w))) {
      const matches = context.businesses.filter((b) => b.category === category);
      if (matches.length === 1) return matches[0]!.id;
    }
  }

  return null;
}

function matchServiceName(text: string, context: AiCatalogContext): string | null {
  const hit = context.services.find((service) =>
    text.includes(service.name.toLowerCase()),
  );
  if (hit) return hit.name;
  if (/consult|general/.test(text)) {
    return (
      context.services.find((s) => /consult/i.test(s.name))?.name ?? null
    );
  }
  if (/follow/.test(text)) {
    return context.services.find((s) => /follow/i.test(s.name))?.name ?? null;
  }
  if (/haircut|hair cut/.test(text)) {
    return context.services.find((s) => /hair/i.test(s.name))?.name ?? null;
  }
  if (/massage/.test(text)) {
    return context.services.find((s) => /massage/i.test(s.name))?.name ?? null;
  }
  return null;
}

function extractTime(text: string): string | null {
  const match12 = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i.exec(text);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = Number(match12[2] ?? "0");
    const meridiem = match12[3]!.toLowerCase();
    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const match24 = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
  if (match24) {
    return `${match24[1]!.padStart(2, "0")}:${match24[2]}`;
  }

  return null;
}

function resolveRelativeDate(text: string, todayIso: string): string | null {
  const today = new Date(`${todayIso}T12:00:00.000Z`);

  if (/\btoday\b/.test(text)) {
    return todayIso;
  }
  if (/\btomorrow\b/.test(text)) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  for (let i = 0; i < weekdays.length; i += 1) {
    if (text.includes(weekdays[i]!)) {
      const d = new Date(today);
      const delta = (i - d.getUTCDay() + 7) % 7 || 7;
      d.setUTCDate(d.getUTCDate() + delta);
      return d.toISOString().slice(0, 10);
    }
  }

  const iso = /\b(\d{4}-\d{2}-\d{2})\b/.exec(text);
  return iso?.[1] ?? null;
}

export type { ConversationTurn };
