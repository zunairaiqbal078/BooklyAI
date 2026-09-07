import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to BooklyAI with a secure HttpOnly session.",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue booking with the assistant or manage your calendar."
      panelTitle="Your schedule, without the email chain."
      panelBody="Customers book in conversation. Businesses keep a clean, conflict-free calendar."
    >
      <LoginForm />
    </AuthShell>
  );
}
