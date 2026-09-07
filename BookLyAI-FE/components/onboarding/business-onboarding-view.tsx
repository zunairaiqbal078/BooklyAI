"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { ImageField } from "@/components/catalog/image-field";
import { AppShell } from "@/components/layout/app-shell";
import { PlacesLocationField } from "@/components/maps/places-location-field";
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

export function BusinessOnboardingView() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<BusinessCategory>("SALON");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canStep1 = name.trim().length >= 2 && description.trim().length >= 10;
  const canStep2 = city.trim().length >= 2;
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
        description: description.trim(),
        category,
        city: city.trim(),
        address: address.trim() || undefined,
        timezone: "UTC",
        coverImageUrl: coverImageUrl.trim() || undefined,
        services: [],
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
          <h1 className="mt-2 font-display text-4xl tracking-tight">
            Set up your business profile
          </h1>
          <p className="mt-2 text-sm text-muted">
            Add details, location, and hours. Services and offers are managed later in Catalog.
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
              <Label htmlFor="description">About / description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
                className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-accent"
                placeholder="Tell customers what you offer, your style, and who you serve."
              />
              <p className="mt-1.5 text-xs text-muted">At least 10 characters.</p>
            </div>
            <div>
              <Label>Profile photo (optional)</Label>
              <p className="mb-2 text-xs text-muted">
                Shown in your header and on your public business page.
              </p>
              <ImageField value={coverImageUrl} onChange={setCoverImageUrl} disabled={submitting} />
            </div>
            <Button type="button" disabled={!canStep1} onClick={() => setStep(2)}>
              Continue to location
            </Button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
            <PlacesLocationField
              city={city}
              address={address}
              onChange={({ city: nextCity, address: nextAddress }) => {
                setCity(nextCity);
                setAddress(nextAddress);
              }}
            />
            <div className="flex flex-wrap gap-3">
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
