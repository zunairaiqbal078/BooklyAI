"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ImageField } from "@/components/catalog/image-field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/loading-block";
import {
  createOffer,
  createService,
  deleteOffer,
  deleteService,
  getMyBusiness,
  listOffers,
  type OwnedOffer,
  type OwnedService,
} from "@/features/business/api";
import { useAuth } from "@/features/auth/auth-provider";
import { useLoadWhen } from "@/hooks/use-load-when";
import { cn } from "@/lib/utils";
import { ApiError } from "@/types";

type CatalogKind = "service" | "offer";

function formatPrice(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(0)}`;
}

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

const emptyServiceForm = {
  name: "",
  description: "",
  durationMin: "45",
  price: "",
  imageUrl: "",
};

const emptyOfferForm = {
  serviceId: "",
  title: "",
  description: "",
  price: "",
  imageUrl: "",
};

export function CatalogView() {
  const { user } = useAuth();
  const titleId = useId();
  const [services, setServices] = useState<OwnedService[]>([]);
  const [offers, setOffers] = useState<OwnedOffer[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [kind, setKind] = useState<CatalogKind>("service");
  const [formError, setFormError] = useState<string | null>(null);

  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [offerForm, setOfferForm] = useState(emptyOfferForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mine, offerList] = await Promise.all([getMyBusiness(), listOffers()]);
      setBusinessName(mine.business.name);
      setServices(mine.services);
      setOffers(offerList.offers);
      setOfferForm((prev) => ({
        ...prev,
        serviceId: prev.serviceId || mine.services[0]?.id || "",
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useLoadWhen(user?.role === "BUSINESS", load);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  function openModal(initial: CatalogKind = "service") {
    setKind(initial);
    setFormError(null);
    setServiceForm(emptyServiceForm);
    setOfferForm({
      ...emptyOfferForm,
      serviceId: services[0]?.id || "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (kind === "service") {
        await createService({
          name: serviceForm.name.trim(),
          description: serviceForm.description.trim() || undefined,
          durationMin: Number(serviceForm.durationMin),
          priceCents: dollarsToCents(serviceForm.price),
          imageUrl: serviceForm.imageUrl.trim() || undefined,
        });
      } else {
        if (!offerForm.serviceId) {
          throw new ApiError(400, "VALIDATION_ERROR", "Select a service for this offer.");
        }
        await createOffer({
          serviceId: offerForm.serviceId,
          title: offerForm.title.trim(),
          description: offerForm.description.trim() || undefined,
          priceCents: dollarsToCents(offerForm.price),
          imageUrl: offerForm.imageUrl.trim() || undefined,
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : kind === "service"
            ? "Could not create service."
            : "Could not create offer.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteService(id: string) {
    if (!window.confirm("Delete this service? Linked offers will be hidden too.")) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteService(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete service.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteOffer(id: string) {
    if (!window.confirm("Delete this offer?")) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteOffer(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete offer.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!user || user.role !== "BUSINESS") return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Catalog</p>
            <h1 className="mt-2 font-display text-4xl tracking-tight">
              {businessName || "Your services & offers"}
            </h1>
         
          </div>
          <Button type="button" onClick={() => openModal("service")} disabled={loading}>
            Add
          </Button>
        </header>

        {loading ? <LoadingBlock label="Loading catalog…" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading ? (
          <>
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl tracking-tight">Services</h2>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  onClick={() => openModal("service")}
                >
                  Add service
                </Button>
              </div>
              {services.length === 0 ? (
                <EmptyState
                  title="No services yet"
                  description="Use Add to create a service before offers."
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {services.map((service) => (
                    <li
                      key={service.id}
                      className="overflow-hidden rounded-2xl border border-line bg-surface"
                    >
                      {service.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={service.imageUrl}
                          alt=""
                          className="h-32 w-full object-cover"
                        />
                      ) : null}
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="mt-1 text-sm text-muted">
                            {service.durationMin} min · {formatPrice(service.priceCents)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 shrink-0 px-3 text-xs text-danger hover:bg-red-50"
                          disabled={deletingId === service.id}
                          onClick={() => void handleDeleteService(service.id)}
                        >
                          {deletingId === service.id ? "…" : "Delete"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl tracking-tight">Offers</h2>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  onClick={() => openModal("offer")}
                  disabled={services.length === 0}
                >
                  Add offer
                </Button>
              </div>
              {offers.length === 0 ? (
                <EmptyState
                  title="No offers yet"
                  description="Create promotional offers with pictures for each service."
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
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
                          className="h-32 w-full object-cover"
                        />
                      ) : null}
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted">
                            {offer.serviceName}
                          </p>
                          <p className="mt-1 font-medium">{offer.title}</p>
                          <p className="mt-1 text-sm text-muted">
                            {formatPrice(offer.priceCents)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 shrink-0 px-3 text-xs text-danger hover:bg-red-50"
                          disabled={deletingId === offer.id}
                          onClick={() => void handleDeleteOffer(offer.id)}
                        >
                          {deletingId === offer.id ? "…" : "Delete"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="font-display text-2xl tracking-tight">
                  Add to catalog
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Toggle between a bookable service and a promotional offer.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 rounded-full px-0 text-lg"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                ×
              </Button>
            </div>

            <div
              className="mt-5 grid grid-cols-2 rounded-full border border-line bg-background p-1"
              role="tablist"
              aria-label="Catalog type"
            >
              {(["service", "offer"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={kind === option}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-medium transition",
                    kind === option
                      ? "bg-accent text-white"
                      : "text-muted hover:text-foreground",
                  )}
                  onClick={() => {
                    setKind(option);
                    setFormError(null);
                  }}
                >
                  {option === "service" ? "Service" : "Offer"}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-3">
              {kind === "service" ? (
                <>
                  <Input
                    required
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Service name"
                  />
                  <Input
                    value={serviceForm.description}
                    onChange={(e) =>
                      setServiceForm((s) => ({ ...s, description: e.target.value }))
                    }
                    placeholder="Short description"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      required
                      type="number"
                      min={5}
                      max={480}
                      value={serviceForm.durationMin}
                      onChange={(e) =>
                        setServiceForm((s) => ({ ...s, durationMin: e.target.value }))
                      }
                      placeholder="Duration (min)"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm((s) => ({ ...s, price: e.target.value }))}
                      placeholder="Price (USD)"
                    />
                  </div>
                  <ImageField
                    value={serviceForm.imageUrl}
                    onChange={(imageUrl) => setServiceForm((s) => ({ ...s, imageUrl }))}
                    disabled={saving}
                  />
                </>
              ) : (
                <>
                  {services.length === 0 ? (
                    <p className="rounded-xl border border-line bg-background px-4 py-3 text-sm text-muted">
                      Create a service first, then add an offer for it.
                    </p>
                  ) : (
                    <select
                      required
                      value={offerForm.serviceId}
                      onChange={(e) =>
                        setOfferForm((s) => ({ ...s, serviceId: e.target.value }))
                      }
                      className="w-full rounded-xl border border-line bg-background px-3 py-3 text-sm"
                    >
                      <option value="">Select service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <Input
                    required
                    value={offerForm.title}
                    onChange={(e) => setOfferForm((s) => ({ ...s, title: e.target.value }))}
                    placeholder="Offer title"
                    disabled={services.length === 0}
                  />
                  <Input
                    value={offerForm.description}
                    onChange={(e) =>
                      setOfferForm((s) => ({ ...s, description: e.target.value }))
                    }
                    placeholder="Offer description"
                    disabled={services.length === 0}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={offerForm.price}
                    onChange={(e) => setOfferForm((s) => ({ ...s, price: e.target.value }))}
                    placeholder="Offer price (USD)"
                    disabled={services.length === 0}
                  />
                  <ImageField
                    value={offerForm.imageUrl}
                    onChange={(imageUrl) => setOfferForm((s) => ({ ...s, imageUrl }))}
                    disabled={saving || services.length === 0}
                  />
                </>
              )}

              {formError ? (
                <p role="alert" className="text-sm text-danger">
                  {formError}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={saving || (kind === "offer" && services.length === 0)}
                >
                  {saving ? "Saving…" : kind === "service" ? "Save service" : "Save offer"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
