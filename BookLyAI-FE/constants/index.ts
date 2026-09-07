export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  assistant: "/assistant",
  appointments: "/appointments",
  calendar: "/calendar",
} as const;

export const SUGGESTED_PROMPTS = [
  "Book an appointment tomorrow",
  "Show my upcoming appointments",
  "I need a consultation this week",
  "Find me an afternoon appointment",
] as const;
