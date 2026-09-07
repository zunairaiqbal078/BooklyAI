"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants";
import { login } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/types";

export function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email.";
    if (!password) next.password = "Password is required.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { user } = await login({ email, password });
      setUser(user);
      router.push(
        user.role === "BUSINESS" && !user.onboardingComplete
          ? ROUTES.onboarding
          : ROUTES.dashboard,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to log in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          aria-invalid={Boolean(fieldErrors.email)}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
        {fieldErrors.email ? (
          <p className="mt-1.5 text-xs text-danger">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            aria-invalid={Boolean(fieldErrors.password)}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-16"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-3 text-xs font-medium text-muted transition hover:text-foreground"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {fieldErrors.password ? (
          <p className="mt-1.5 text-xs text-danger">{fieldErrors.password}</p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href={ROUTES.signup} className="font-medium text-accent transition hover:text-accent-hover">
          Create an account
        </Link>
      </p>
    </form>
  );
}
