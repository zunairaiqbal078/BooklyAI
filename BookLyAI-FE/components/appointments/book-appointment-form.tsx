"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/loading-block";
import {
  createAppointment,
  getAvailability,
  listBusinessServices,
  listBusinesses,
  type BusinessSummary,
  type ServiceSummary,
} from "@/features/appointments/api";
import { useLoadWhen } from "@/hooks/use-load-when";
import { ApiError } from "@/types";

interface BookAppointmentFormProps {
  onBooked: () => Promise<void> | void;
  /** Lock the form to one business (e.g. marketplace public page). */
  lockedBusinessId?: string;
  lockedBusinessName?: string;
  initialServiceId?: string;
}

export function BookAppointmentForm({
  onBooked,
  lockedBusinessId,
  lockedBusinessName,
  initialServiceId,
}: BookAppointmentFormProps) {
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [businessId, setBusinessId] = useState(lockedBusinessId ?? "");
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const boot = useCallback(async () => {
    setLoadingMeta(true);
    setError(null);
    try {
      if (lockedBusinessId) {
        setBusinessId(lockedBusinessId);
        setBusinesses([
          {
            id: lockedBusinessId,
            name: lockedBusinessName ?? "Selected business",
            slug: "",
            description: null,
            timezone: "UTC",
            activeServiceCount: 0,
          },
        ]);
      } else {
        const { businesses: rows } = await listBusinesses();
        setBusinesses(rows);
        if (rows[0]) setBusinessId(rows[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load businesses.");
    } finally {
      setLoadingMeta(false);
    }
  }, [lockedBusinessId, lockedBusinessName]);

  useLoadWhen(true, boot);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { services: rows } = await listBusinessServices(businessId);
          if (cancelled) return;
          setServices(rows);
          setServiceId((current) => {
            if (initialServiceId && rows.some((row) => row.id === initialServiceId)) {
              return initialServiceId;
            }
            if (current && rows.some((row) => row.id === current)) return current;
            return rows[0]?.id ?? "";
          });
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.message : "Could not load services.");
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [businessId, initialServiceId]);

  const canLoadSlots = Boolean(businessId && serviceId && date);

  useEffect(() => {
    if (!canLoadSlots) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoadingSlots(true);
        setError(null);
        try {
          const result = await getAvailability({ businessId, serviceId, date });
          if (cancelled) return;
          setSlots(result.slots);
          setTime(result.slots[0] ?? "");
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.message : "Could not load availability.");
            setSlots([]);
            setTime("");
          }
        } finally {
          if (!cancelled) setLoadingSlots(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canLoadSlots, businessId, serviceId, date]);

  const visibleSlots = canLoadSlots ? slots : [];
  const visibleTime = canLoadSlots ? time : "";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!businessId || !serviceId || !date || !visibleTime) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await createAppointment({
        businessId,
        serviceId,
        startTime: `${date}T${visibleTime}:00.000Z`,
      });
      setSuccess("Appointment confirmed.");
      await onBooked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingMeta) return <LoadingBlock label="Loading booking options…" />;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-line bg-surface p-6"
    >
      <div>
        <h2 className="text-lg font-medium">Book manually</h2>
        <p className="mt-1 text-sm text-muted">
          Pick a service and open slot — overlaps are blocked automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="business">Business</Label>
          <select
            id="business"
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            disabled={Boolean(lockedBusinessId)}
            className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-accent disabled:opacity-70"
          >
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="service">Service</Label>
          <select
            id="service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-accent"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.durationMin} min)
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="time">Time</Label>
          <select
            id="time"
            value={visibleTime}
            onChange={(e) => setTime(e.target.value)}
            disabled={!canLoadSlots || loadingSlots || visibleSlots.length === 0}
            className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-accent disabled:opacity-60"
          >
            {visibleSlots.length === 0 ? (
              <option value="">{loadingSlots ? "Loading…" : "No open slots"}</option>
            ) : (
              visibleSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {success ? (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">✓ {success}</p>
      ) : null}

      <Button type="submit" disabled={submitting || !visibleTime} className="h-11">
        {submitting ? "Confirming…" : "Confirm appointment"}
      </Button>
    </form>
  );
}
