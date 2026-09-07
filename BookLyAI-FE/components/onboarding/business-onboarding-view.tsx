"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUSINESS_CATEGORIES, ROUTES } from "@/constants";
import { completeOnboarding } from "@/features/business/api";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, type BusinessCategory } from "@/types";

const DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

interface ServiceDraft {
  name: string;
  description: string;
  durationMin: number;
  price: string;
}

export function BusinessOnboardingView() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.role === "BUSINESS" ? "" : "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<BusinessCategory>("SALON");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>([
    { name: "", description: "", durationMin: 45, price: "" },
  ]);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canStep1 = name.trim().length >= 2 && city.trim().length >= 2;
  const canStep2 = services.every((s) => s.name.trim().length >= 2 && s.durationMin >= 5);
  const canStep3 = selectedDays.length > 0 && startTime < endTime;

  const previewHours = useMemo(
    () =>
      selectedDays.map((dayOfWeek) => ({
        dayOfWeek,
        startTime,
        endTime,
        slotMin: 30,
      })),
    [selectedDays, startTime, endTime],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canStep1 || !canStep2 || !canStep3) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        city: city.trim(),
        address: address.trim() || undefined,
        timezone: "UTC",
        services: services.map((service) => ({
          name: service.name.trim(),
          description: service.description.trim() || undefined,
          durationMin: service.durationMin,
          priceCents: service.price ? Math.round(Number(service.price) * 100) : null,
        })),
        hours: previewHours,
        publish: true,
      });
      await refresh();
      router.push(ROUTES.dashboard);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not finish onboarding.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || user.role !== "BUSINESS") {
    return (
      <AppShell>
        <ErrorState message="Business onboarding is only available to business accounts." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-8">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
            Business setup
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight">Tell customers what you offer</h1>
          <p className="mt-2 text-sm text-muted">
            Add your location and services so customers can discover and book you.
          </p>
          <p className="mt-4 text-xs text-muted">Step {step} of 3</p>
        </header>

        {step === 1 ? (
          <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
            <div>
              <Label htmlFor="biz-name">Business name</Label>
              <Input
                id="biz-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lumen Hair Studio"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as BusinessCategory)}
                className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm"
              >
                {BUSINESS_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="city">City / location</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Austin"
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Street address (optional)</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="4800 South Congress Ave"
              />
            </div>
            <div>
              <Label htmlFor="description">About</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-accent"
                placeholder="What should customers know?"
              />
            </div>
            <Button type="button" disabled={!canStep1} onClick={() => setStep(2)}>
              Continue to services
            </Button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
            <p className="text-sm text-muted">Add at least one bookable service.</p>
            {services.map((service, index) => (
              <div key={index} className="space-y-3 rounded-xl border border-line/80 p-4">
                <div>
                  <Label htmlFor={`svc-name-${index}`}>Service name</Label>
                  <Input
                    id={`svc-name-${index}`}
                    value={service.name}
                    onChange={(e) => {
                      const next = [...services];
                      next[index] = { ...service, name: e.target.value };
                      setServices(next);
                    }}
                    placeholder="Signature haircut"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`svc-duration-${index}`}>Duration (min)</Label>
                    <Input
                      id={`svc-duration-${index}`}
                      type="number"
                      min={5}
                      value={service.durationMin}
                      onChange={(e) => {
                        const next = [...services];
                        next[index] = {
                          ...service,
                          durationMin: Number(e.target.value) || 30,
                        };
                        setServices(next);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`svc-price-${index}`}>Price (optional)</Label>
                    <Input
                      id={`svc-price-${index}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={service.price}
                      onChange={(e) => {
                        const next = [...services];
                        next[index] = { ...service, price: e.target.value };
                        setServices(next);
                      }}
                      placeholder="55"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor={`svc-desc-${index}`}>Description</Label>
                  <Input
                    id={`svc-desc-${index}`}
                    value={service.description}
                    onChange={(e) => {
                      const next = [...services];
                      next[index] = { ...service, description: e.target.value };
                      setServices(next);
                    }}
                    placeholder="Cut, wash, and style"
                  />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setServices((rows) => [
                    ...rows,
                    { name: "", description: "", durationMin: 30, price: "" },
                  ])
                }
              >
                Add another service
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" disabled={!canStep2} onClick={() => setStep(3)}>
                Continue to hours
              </Button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
            <p className="text-sm text-muted">Choose weekly open days and hours.</p>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => {
                const active = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() =>
                      setSelectedDays((days) =>
                        active
                          ? days.filter((d) => d !== day.value)
                          : [...days, day.value].sort((a, b) => a - b),
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      active
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line text-muted"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="start">Opens</Label>
                <Input
                  id="start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end">Closes</Label>
                <Input
                  id="end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            {error ? <ErrorState message={error} /> : null}
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="submit" disabled={submitting || !canStep3}>
                {submitting ? "Publishing…" : "Publish & go to dashboard"}
              </Button>
            </div>
          </section>
        ) : null}
      </form>
    </AppShell>
  );
}
