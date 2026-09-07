import { api } from "@/lib/api";
import type { BusinessCategory } from "@/types";

export interface MarketplaceBusiness {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: BusinessCategory;
  city: string | null;
  address: string | null;
  coverImageUrl: string | null;
  timezone: string;
  ratingAvg: number;
  reviewCount: number;
  activeServiceCount: number;
  sampleServices: Array<{
    id: string;
    name: string;
    durationMin: number;
    priceCents: number | null;
    imageUrl: string | null;
  }>;
  sampleOffers: Array<{
    id: string;
    title: string;
    imageUrl: string | null;
    priceCents: number | null;
    serviceId: string;
  }>;
}

export interface MarketplaceBusinessDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: BusinessCategory;
  city: string | null;
  address: string | null;
  coverImageUrl: string | null;
  timezone: string;
  ratingAvg: number;
  reviewCount: number;
  reviewTeaser: string;
  hours: Array<{
    dayOfWeek: number;
    dayLabel: string;
    startTime: string;
    endTime: string;
    slotMin: number;
  }>;
}

export interface MarketplaceService {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number | null;
  imageUrl: string | null;
}

export interface MarketplaceOffer {
  id: string;
  businessId: string;
  serviceId: string;
  serviceName: string;
  title: string;
  description: string | null;
  priceCents: number | null;
  imageUrl: string | null;
}

export interface MarketplaceReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
}

export function listMarketplaceBusinesses(params?: {
  q?: string;
  category?: BusinessCategory | "";
  city?: string;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.category) search.set("category", params.category);
  if (params?.city) search.set("city", params.city);
  const query = search.toString();
  return api<{ businesses: MarketplaceBusiness[] }>(
    `/api/marketplace/businesses${query ? `?${query}` : ""}`,
  );
}

export function getMarketplaceBusiness(slug: string) {
  return api<{
    business: MarketplaceBusinessDetail;
    services: MarketplaceService[];
    offers: MarketplaceOffer[];
    reviews: MarketplaceReview[];
  }>(`/api/marketplace/businesses/${slug}`);
}

export function listMarketplaceCities() {
  return api<{ cities: string[] }>("/api/marketplace/cities");
}
