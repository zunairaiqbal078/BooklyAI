"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { BookAppointmentForm } from "@/components/appointments/book-appointment-form";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingBlock } from "@/components/ui/loading-block";
import { ROUTES } from "@/constants";
import {
  getMarketplaceBusiness,
  type MarketplaceBusinessDetail,
  type MarketplaceOffer,
  type MarketplaceReview,
  type MarketplaceService,
} from "@/features/marketplace/api";
import { useAuth } from "@/features/auth/auth-provider";
import { useLoadWhen } from "@/hooks/use-load-when";
import { ApiError } from "@/types";

function formatPrice(cents: number | null): string {
  if (cents == null) return "Ask for price";
  return `$${(cents / 100).toFixed(0)}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="tracking-tight text-accent" aria-label={`${rating} out of 5`}>
      {"★".repeat(rating)}
      <span className="text-muted">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function BusinessPublicView() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const { user } = useAuth();
  const [business, setBusiness] = useState<MarketplaceBusinessDetail | null>(null);
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [reviews, setReviews] = useState<MarketplaceReview[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManualBook, setShowManualBook] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await getMarketplaceBusiness(slug);
      setBusiness(payload.business);
      setServices(payload.services);
      setOffers(payload.offers);
      setReviews(payload.reviews);
      setSelectedServiceId(payload.services[0]?.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Business not found.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useLoadWhen(Boolean(slug), load);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-12">
        {loading ? <LoadingBlock label="Loading business…" /> : null}
        {error ? <ErrorState message={error} /> : null}
        {business ? (
          <div className="space-y-10">
            <header className="overflow-hidden rounded-3xl border border-line bg-surface">
              <div
                className="relative min-h-56 bg-cover bg-center px-6 py-10 sm:min-h-64 sm:px-10"
                style={{
                  backgroundImage: business.coverImageUrl
                    ? `linear-gradient(120deg, rgba(12,24,20,0.72), rgba(12,24,20,0.35)), url(${business.coverImageUrl})`
                    : "linear-gradient(135deg,#dff3ea 0%,#f7faf8 55%,#e7f0ec 100%)",
                }}
              >
                <p
                  className={`text-xs font-medium uppercase tracking-[0.18em] ${
                    business.coverImageUrl ? "text-white/80" : "text-accent"
                  }`}
                >
                  {business.category}
                  {business.city ? ` · ${business.city}` : ""}
                </p>
                <h1
                  className={`mt-3 font-display text-4xl tracking-tight sm:text-5xl ${
                    business.coverImageUrl ? "text-white" : ""
                  }`}
                >
                  {business.name}
                </h1>
                <p
                  className={`mt-3 max-w-2xl text-sm leading-6 ${
                    business.coverImageUrl ? "text-white/85" : "text-muted"
                  }`}
                >
                  {business.description ?? "Book a service at a time that works for you."}
                </p>
                <p
                  className={`mt-4 text-sm ${
                    business.coverImageUrl ? "text-white/75" : "text-muted"
                  }`}
                >
                  {business.reviewTeaser}
                  {business.address ? ` · ${business.address}` : ""}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {user?.role === "CUSTOMER" ? (
                    <>
                      <Button type="button" onClick={() => setShowManualBook(true)}>
                        Book manually
                      </Button>
                      <Link
                        href={`${ROUTES.assistant}?business=${encodeURIComponent(business.slug)}`}
                      >
                        <Button variant="secondary">Book with AI</Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href={ROUTES.login}>
                        <Button>Log in to book</Button>
                      </Link>
                      <Link href={ROUTES.signup}>
                        <Button variant="secondary">Create customer account</Button>
                      </Link>
                    </>
                  )}
                  <Link href={ROUTES.explore}>
                    <Button variant="ghost">Back to explore</Button>
                  </Link>
                </div>
              </div>
            </header>

            {offers.length > 0 ? (
              <section>
                <h2 className="font-display text-2xl tracking-tight">Current offers</h2>
                <p className="mt-1 text-sm text-muted">Promotions tied to bookable services.</p>
                <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                  {offers.map((offer) => (
                    <li
                      key={offer.id}
                      className="overflow-hidden rounded-2xl border border-line bg-surface"
                    >
                      {offer.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={offer.imageUrl}
                          alt=""
                          className="h-40 w-full object-cover"
                        />
                      ) : null}
                      <div className="p-5">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">
                          {offer.serviceName}
                        </p>
                        <h3 className="mt-1 font-display text-xl tracking-tight">{offer.title}</h3>
                        {offer.description ? (
                          <p className="mt-2 text-sm text-muted">{offer.description}</p>
                        ) : null}
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">{formatPrice(offer.priceCents)}</span>
                          {user?.role === "CUSTOMER" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 px-3 text-xs"
                              onClick={() => {
                                setSelectedServiceId(offer.serviceId);
                                setShowManualBook(true);
                              }}
                            >
                              Book this
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <h2 className="font-display text-2xl tracking-tight">Services</h2>
                <ul className="mt-4 space-y-3">
                  {services.map((service) => (
                    <li key={service.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(service.id);
                          setShowManualBook(true);
                        }}
                        className="flex w-full gap-4 overflow-hidden rounded-2xl border border-line bg-surface text-left transition hover:border-accent/40"
                      >
                        {service.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={service.imageUrl}
                            alt=""
                            className="h-28 w-28 shrink-0 object-cover"
                          />
                        ) : null}
                        <div className="flex flex-1 items-start justify-between gap-3 px-5 py-4">
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="mt-1 text-sm text-muted">
                              {service.description ?? `${service.durationMin} minutes`}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p>{formatPrice(service.priceCents)}</p>
                            <p className="text-muted">{service.durationMin} min</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <aside className="rounded-2xl border border-line bg-surface p-5">
                <h2 className="font-display text-2xl tracking-tight">Hours</h2>
                <ul className="mt-4 space-y-2 text-sm">
                  {business.hours.map((rule) => (
                    <li key={`${rule.dayOfWeek}-${rule.startTime}`} className="flex justify-between">
                      <span className="text-muted">{rule.dayLabel}</span>
                      <span>
                        {rule.startTime}–{rule.endTime}
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>
            </section>

            <section>
              <h2 className="font-display text-2xl tracking-tight">Customer reviews</h2>
              <p className="mt-1 text-sm text-muted">
                {business.reviewCount > 0
                  ? `${business.ratingAvg.toFixed(1)} average from ${business.reviewCount} reviews`
                  : "No reviews yet — be the first after a completed visit."}
              </p>
              {reviews.length === 0 ? (
                <p className="mt-4 text-sm text-muted">Reviews will appear here after customers rate a service.</p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {reviews.map((review) => (
                    <li
                      key={review.id}
                      className="rounded-2xl border border-line bg-surface px-5 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{review.customerName}</p>
                        <Stars rating={review.rating} />
                      </div>
                      <p className="mt-1 text-xs text-muted">{review.serviceName}</p>
                      {review.comment ? (
                        <p className="mt-2 text-sm text-muted">{review.comment}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {showManualBook && user?.role === "CUSTOMER" ? (
              <section id="book">
                <BookAppointmentForm
                  lockedBusinessId={business.id}
                  lockedBusinessName={business.name}
                  initialServiceId={selectedServiceId}
                  onBooked={() => {
                    router.push(ROUTES.appointments);
                  }}
                />
              </section>
            ) : null}
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
