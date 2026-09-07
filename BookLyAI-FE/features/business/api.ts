import { API_URL } from "@/constants";
import { api } from "@/lib/api";
import { ApiError, type BusinessCategory } from "@/types";

export interface OwnedBusiness {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: BusinessCategory;
  city: string | null;
  address: string | null;
  coverImageUrl: string | null;
  timezone: string;
  isPublished: boolean;
  onboardingComplete: boolean;
  ratingAvg: number;
  reviewCount: number;
  createdAt: string;
}

export interface OwnedService {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number | null;
  imageUrl: string | null;
  isActive: boolean;
}

export interface OwnedOffer {
  id: string;
  businessId: string;
  serviceId: string;
  serviceName: string;
  title: string;
  description: string | null;
  priceCents: number | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface OwnedHours {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMin: number;
}

export interface OnboardingPayload {
  name: string;
  description?: string;
  category: BusinessCategory;
  city: string;
  address?: string;
  timezone?: string;
  coverImageUrl?: string;
  services: Array<{
    name: string;
    description?: string;
    durationMin: number;
    priceCents?: number | null;
    imageUrl?: string;
  }>;
  hours: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotMin?: number;
  }>;
  publish?: boolean;
}

export function getMyBusiness() {
  return api<{
    business: OwnedBusiness;
    services: OwnedService[];
    hours: OwnedHours[];
  }>("/api/businesses/me");
}

export function completeOnboarding(input: OnboardingPayload) {
  return api<{ business: OwnedBusiness }>("/api/businesses/me/onboarding", {
    method: "POST",
    body: input,
  });
}

export function createService(input: {
  name: string;
  description?: string;
  durationMin: number;
  priceCents?: number | null;
  imageUrl?: string;
}) {
  return api<{ service: OwnedService }>("/api/businesses/me/services", {
    method: "POST",
    body: input,
  });
}

export function listOffers() {
  return api<{ offers: OwnedOffer[] }>("/api/offers");
}

export function createOffer(input: {
  serviceId: string;
  title: string;
  description?: string;
  priceCents?: number | null;
  imageUrl?: string;
}) {
  return api<{ offer: OwnedOffer }>("/api/offers", {
    method: "POST",
    body: input,
  });
}

export function deleteService(id: string) {
  return api<{ deleted: boolean }>(`/api/businesses/me/services/${id}`, {
    method: "DELETE",
  });
}

export function deleteOffer(id: string) {
  return api<{ deleted: boolean }>(`/api/offers/${id}`, {
    method: "DELETE",
  });
}

/** Upload a local image file; returns a public URL stored on create/update. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);

  const response = await fetch(`${API_URL}/api/uploads/image`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const payload = (await response.json()) as
    | { success: true; data: { url: string } }
    | { success: false; error: { code: string; message: string } };

  if (!response.ok || !payload.success) {
    const error = !payload.success
      ? payload.error
      : { code: "REQUEST_FAILED", message: "Upload failed." };
    throw new ApiError(response.status, error.code, error.message);
  }

  return payload.data.url;
}
