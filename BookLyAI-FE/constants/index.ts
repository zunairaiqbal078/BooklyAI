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
  explore: "/explore",
  onboarding: "/onboarding",
  catalog: "/catalog",
  business: (slug: string) => `/businesses/${slug}`,
} as const;

export const BUSINESS_CATEGORIES = [
  { value: "SALON", label: "Salon" },
  { value: "CLINIC", label: "Clinic" },
  { value: "SPA", label: "Spa" },
  { value: "WELLNESS", label: "Wellness" },
  { value: "FITNESS", label: "Fitness" },
  { value: "OTHER", label: "Other" },
] as const;

export const SUGGESTED_PROMPTS = [
  "Book a haircut in Austin tomorrow",
  "Show wellness clinics near me",
  "Show my upcoming appointments",
  "Find me an afternoon appointment",
] as const;

export const BUSINESS_SUGGESTED_PROMPTS = [
  "What are my upcoming appointments?",
  "Summarize today's schedule",
  "How many total appointments do I have?",
  "Show completed / paid appointments",
] as const;
