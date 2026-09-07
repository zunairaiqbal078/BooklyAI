"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/loading-block";
import { BUSINESS_CATEGORIES, ROUTES } from "@/constants";
import {
  listMarketplaceBusinesses,
  listMarketplaceCities,
  type MarketplaceBusiness,
} from "@/features/marketplace/api";
import { useLoadWhen } from "@/hooks/use-load-when";
import { ApiError, type BusinessCategory } from "@/types";

function formatPrice(cents: number | null): string | null {
  if (cents == null) return null;
  return `$${(cents / 100).toFixed(0)}`;
}

export function ExploreView() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState<BusinessCategory | "">("");
  const [applied, setApplied] = useState({ q: "", city: "", category: "" as BusinessCategory | "" });
  const [cities, setCities] = useState<string[]>([]);
  const [businesses, setBusinesses] = useState<MarketplaceBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, cityList] = await Promise.all([
        listMarketplaceBusinesses({
          q: applied.q.trim() || undefined,
          city: applied.city || undefined,
          category: applied.category || undefined,
        }),
        listMarketplaceCities(),
      ]);
      setBusinesses(list.businesses);
      setCities(cityList.cities);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load marketplace.");
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useLoadWhen(true, load);

  const heading = useMemo(() => {
    if (applied.city) return `Services in ${applied.city}`;
    return "Discover local services";
  }, [applied.city]);

  function applyFilters() {
    setApplied({ q, city, category });
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-12">
        <header className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Explore</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight">{heading}</h1>
          <p className="mt-2 text-sm text-muted">
            Filter by city and category, open a business page, then book manually or with the AI
            assistant.
          </p>
        </header>

        <div className="mt-8 grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[1fr_160px_160px_auto]">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search salon, clinic, haircut…"
            aria-label="Search"
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
          />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-xl border border-line bg-background px-3 py-3 text-sm"
            aria-label="City"
          >
            <option value="">All cities</option>
            {cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as BusinessCategory | "")}
            className="rounded-xl border border-line bg-background px-3 py-3 text-sm"
            aria-label="Category"
          >
            <option value="">All types</option>
            {BUSINESS_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <Button type="button" onClick={applyFilters} className="h-11">
            Search
          </Button>
        </div>

        <div className="mt-8">
          {loading ? <LoadingBlock label="Finding businesses…" /> : null}
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {!loading && !error && businesses.length === 0 ? (
            <EmptyState
              title="No businesses match"
              description="Try another city or category — or ask a business owner to finish onboarding."
            />
          ) : null}
          {!loading && !error ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {businesses.map((business) => (
                <Link
                  key={business.id}
                  href={ROUTES.business(business.slug)}
                  className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-accent/40"
                >
                  {business.coverImageUrl || business.sampleOffers[0]?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        business.coverImageUrl ??
                        business.sampleOffers[0]?.imageUrl ??
                        ""
                      }
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                  ) : null}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">
                          {business.category}
                          {business.city ? ` · ${business.city}` : ""}
                        </p>
                        <h2 className="mt-1 font-display text-2xl tracking-tight group-hover:text-accent">
                          {business.name}
                        </h2>
                      </div>
                      <span className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent">
                        {business.reviewCount > 0
                          ? `${business.ratingAvg.toFixed(1)} · ${business.reviewCount}`
                          : "New"}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted">
                      {business.description ?? "Bookable services nearby."}
                    </p>
                    {business.sampleOffers.length > 0 ? (
                      <p className="mt-3 text-xs text-accent">
                        Offer: {business.sampleOffers[0].title}
                        {formatPrice(business.sampleOffers[0].priceCents)
                          ? ` · ${formatPrice(business.sampleOffers[0].priceCents)}`
                          : ""}
                      </p>
                    ) : null}
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {business.sampleServices.map((service) => (
                        <li
                          key={service.id}
                          className="rounded-full border border-line px-3 py-1 text-xs text-muted"
                        >
                          {service.name}
                          {formatPrice(service.priceCents)
                            ? ` · ${formatPrice(service.priceCents)}`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
