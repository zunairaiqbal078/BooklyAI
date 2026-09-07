import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFinalCta } from "@/components/landing/landing-final-cta";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingWorkflow } from "@/components/landing/landing-workflow";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { MarketingHeader } from "@/components/layout/marketing-header";

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingWorkflow />
        <LandingFinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
