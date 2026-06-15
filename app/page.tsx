import { redirect } from "next/navigation";

import { CtaBand } from "@/components/marketing/CtaBand";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Hero } from "@/components/marketing/Hero";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <MarketingHeader />
      <Hero />
      <FeatureGrid />
      <CtaBand />
      <MarketingFooter />
    </div>
  );
}
