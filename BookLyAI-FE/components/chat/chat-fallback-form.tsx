"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAvailability,
  listBusinessServices,
  type ServiceSummary,
} from "@/features/appointments/api";
import type { ChatMessageMeta } from "@/features/chat/api";
import { formatClockTime } from "@/lib/datetime";
import { ApiError } from "@/types";

type FallbackFormMeta = Extract<ChatMessageMeta, { type: "fallback_form" }>["form"];

interface ChatFallbackFormProps {
  form: FallbackFormMeta;
  sessionId: string | null;
  disabled?: boolean;
  onSubmit: (input: {
    sessionId?: string;
    businessId: string;
    serviceId: string;
    date: string;
    time: string;
  }) => Promise<void>;
}

export function ChatFallbackForm({
  form,
  sessionId,
  disabled,
  onSubmit,
}: ChatFallbackFormProps) {
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [serviceId, setServiceId] = useState(form.serviceId ?? "");
  const [date, setDate] = useState(form.date ?? "");
  const [slots, setSlots] = useState<string[]>(form.availableSlots ?? []);
  const [time, setTime] = useState(form.time ?? "");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    try {
      const { services: rows } = await listBusinessServices(form.businessId);
      setServices(rows);
      if (!serviceId && rows[0]) setServiceId(rows[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load services.");
    }
  }, [form.businessId, serviceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadServices();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadServices]);

  useEffect(() => {
    if (!serviceId || !date) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoadingSlots(true);
        try {
          const result = await getAvailability({
            businessId: form.businessId,
            serviceId,
            date,
          });
          if (cancelled) return;
          setSlots(result.slots);
          if (!result.slots.includes(time)) {
            setTime(result.slots[0] ?? "");
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.message : "Could not load slots.");
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
  }, [form.businessId, serviceId, date, time]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!serviceId || !date || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        sessionId: sessionId ?? undefined,
        businessId: form.businessId,
        serviceId,
        date,
        time,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-2xl border border-line bg-background px-4 py-4"
    >
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
        Complete your appointment
      </p>

      <div>
        <Label htmlFor="chat-service">Service</Label>
        <select
          id="chat-service"
          value={serviceId}
          disabled={disabled || submitting}
          onChange={(e) => setServiceId(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="chat-date">Date</Label>
          <Input
            id="chat-date"
            type="date"
            required
            value={date}
            disabled={disabled || submitting}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="chat-time">Time</Label>
          <select
            id="chat-time"
            value={time}
            disabled={disabled || submitting || loadingSlots || slots.length === 0}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-60"
          >
            {slots.length === 0 ? (
              <option value="">{loadingSlots ? "Loading…" : "No slots"}</option>
            ) : (
              slots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatClockTime(slot)}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <Button type="submit" disabled={disabled || submitting || !time} className="h-10 w-full sm:w-auto">
        {submitting ? "Confirming…" : "Confirm appointment"}
      </Button>
    </form>
  );
}
