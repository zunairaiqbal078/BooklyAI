import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/features/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a BooklyAI account as a customer or business.",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Join as a customer to book, or as a business to accept appointments without overlaps."
      panelTitle="Book appointments naturally using AI."
      panelBody="Start free, invite your team later, and keep every confirmed slot grounded in real availability."
    >
      <SignupForm />
    </AuthShell>
  );
}
