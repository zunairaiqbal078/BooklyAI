import type { AiCatalogContext, AiIntent, ConversationTurn } from "./ai.schema.js";

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
      reply: "I can help cancel. Please open the appointment from your list or dashboard to cancel it for now.",
    };
  }

  if (/available|availability|openings|free/.test(text) || /afternoon appointment|morning appointment/.test(text)) {
    const date = resolveRelativeDate(text, params.context.today);
    const missing = date ? [] : ["date"];
    return {
      intent: "check_availability",
      service: matchServiceName(text, params.context) ?? draft?.serviceName ?? null,
      date,
      time: extractTime(text),
      businessId: draft?.businessId ?? params.context.businesses[0]?.id ?? null,
      confirm: false,
      confidence: 0.75,
      missingFields: missing,
      reply: date
        ? "I'll check what's open."
        : "Which day should I check?",
    };
  }

  if (/book|appointment|consultation|need a|schedule/.test(text)) {
    const service =
      matchServiceName(text, params.context) ?? draft?.serviceName ?? null;
    const date = resolveRelativeDate(text, params.context.today) ?? draft?.date ?? null;
    const time = extractTime(text) ?? draft?.time ?? null;
    const businessId = draft?.businessId ?? params.context.businesses[0]?.id ?? null;

    const missingFields: string[] = [];
    if (!service) missingFields.push("service");
    if (!date) missingFields.push("date");
    if (!time) missingFields.push("time");

    let reply = "I can help book that.";
    if (!service) reply = "What type of consultation do you need?";
    else if (!date) reply = "Which day works for you?";
    else if (!time) reply = "What time works for you?";
    else reply = "I have the details — say confirm to book, or pick another time.";

    return {
      intent: "book_appointment",
      service,
      date,
      time,
      businessId,
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
    reply:
      "I can help you book an appointment, check availability, or show your upcoming appointments.",
  };
}

function matchServiceName(text: string, context: AiCatalogContext): string | null {
  const hit = context.services.find((service) =>
    text.includes(service.name.toLowerCase()),
  );
  if (hit) return hit.name;
  if (/consult|general/.test(text)) {
    return (
      context.services.find((s) => /consult/i.test(s.name))?.name ??
      context.services[0]?.name ??
      null
    );
  }
  if (/follow/.test(text)) {
    return context.services.find((s) => /follow/i.test(s.name))?.name ?? null;
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

  if (/afternoon/.test(text)) return null;
  if (/morning/.test(text)) return null;
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
