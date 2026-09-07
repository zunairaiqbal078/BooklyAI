"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants";
import { register } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, type UserRole } from "@/types";

export function SignupForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Name must be at least 2 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    if (role === "BUSINESS" && businessName.trim().length < 2) {
      next.businessName = "Business name is required.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { user } = await register({
        name,
        email,
        password,
        role,
        ...(role === "BUSINESS" ? { businessName } : {}),
      });
      setUser(user);
      router.push(
        user.role === "BUSINESS" && !user.onboardingComplete
          ? ROUTES.onboarding
          : ROUTES.dashboard,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ava Chen"
        />
        {fieldErrors.name ? <p className="mt-1.5 text-xs text-danger">{fieldErrors.name}</p> : null}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
        {fieldErrors.email ? <p className="mt-1.5 text-xs text-danger">{fieldErrors.email}</p> : null}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-16"
            placeholder="At least 8 characters"
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

      <fieldset>
        <legend className="mb-2 text-sm font-medium">I am signing up as</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["CUSTOMER", "BUSINESS"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRole(option)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                role === option
                  ? "border-accent bg-accent-soft text-foreground shadow-[inset_0_0_0_1px_rgba(15,76,69,0.15)]"
                  : "border-line bg-surface text-muted hover:border-accent/40 hover:text-foreground"
              }`}
            >
              <span className="block font-medium">
                {option === "CUSTOMER" ? "Customer" : "Business"}
              </span>
              <span className="mt-1 block text-xs opacity-80">
                {option === "CUSTOMER" ? "Book appointments" : "Manage your calendar"}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {role === "BUSINESS" ? (
        <div className="animate-fade-up">
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            required
            minLength={2}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Northside Wellness"
          />
          {fieldErrors.businessName ? (
            <p className="mt-1.5 text-xs text-danger">{fieldErrors.businessName}</p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={ROUTES.login} className="font-medium text-accent transition hover:text-accent-hover">
          Sign in
        </Link>
      </p>
    </form>
  );
}
