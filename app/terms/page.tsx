import Link from "next/link";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export const metadata = {
  title: "Terms of Service — BikeLog",
  description: "Terms and conditions for using BikeLog.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <MarketingHeader variant="minimal" />

      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-xl sm:p-12">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: June 16, 2026</p>

          <div className="prose prose-slate mt-8 max-w-none text-slate-700">
            <p>
              By creating an account and using BikeLog, you agree to these terms. If you don&apos;t
              agree, please don&apos;t use the service.
            </p>

            <h2>What BikeLog is</h2>
            <p>
              BikeLog is a tool to help you track bike maintenance, component wear, rides, tire
              pressure, and fit measurements. It is provided as-is, free of charge, while in early
              access. We reserve the right to change pricing or features in the future with
              reasonable notice.
            </p>

            <h2>Your account</h2>
            <ul>
              <li>You are responsible for keeping your login credentials secure.</li>
              <li>
                You must be at least 13 years old (or the applicable minimum age in your
                jurisdiction) to create an account.
              </li>
              <li>
                You are responsible for all activity that occurs under your account.
              </li>
            </ul>

            <h2>Your data</h2>
            <p>
              You own the data you enter into BikeLog. By using the service you grant us a limited
              license to store and process that data solely to provide the service to you. We do not
              claim ownership of your rides, components, or any other content you create.
            </p>

            <h2>Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use BikeLog for any unlawful purpose.</li>
              <li>Attempt to reverse-engineer, scrape, or disrupt the service.</li>
              <li>
                Share account access in a way that circumvents per-user limits or billing (if
                applicable in the future).
              </li>
            </ul>

            <h2>Strava integration</h2>
            <p>
              Connecting your Strava account is optional. When connected, BikeLog imports your ride
              data to update component mileage. Strava&apos;s own terms of service govern your use of
              Strava. You can disconnect at any time from the integrations section of your settings
              or directly in Strava.
            </p>

            <h2>No warranty</h2>
            <p>
              BikeLog is provided &quot;as is&quot; without any warranty, express or implied. We do not
              guarantee that the service will be uninterrupted, error-free, or that maintenance
              interval calculations will be accurate for your specific bike and riding conditions.
              Always use your own judgement when assessing whether a component is safe to ride.
            </p>

            <h2>Limitation of liability</h2>
            <p>
              To the maximum extent permitted by applicable law, BikeLog and its operators will not
              be liable for any indirect, incidental, or consequential damages arising from your use
              of the service, including any equipment damage or personal injury related to
              maintenance decisions informed by the app.
            </p>

            <h2>Termination</h2>
            <p>
              You can delete your account at any time by contacting us. We may suspend or terminate
              accounts that violate these terms, with or without notice.
            </p>

            <h2>Changes to these terms</h2>
            <p>
              We may update these terms as the service evolves. Continued use of BikeLog after
              changes are posted constitutes acceptance of the revised terms. Material changes will
              be noted at the top of this page.
            </p>

            <h2>Governing law</h2>
            <p>
              These terms are governed by the laws of the United States. Any disputes will be
              resolved in the courts of the applicable jurisdiction.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about these terms?{" "}
              <a href="mailto:tlachman4@gmail.com" className="text-brand-600 hover:underline">
                tlachman4@gmail.com
              </a>
            </p>
          </div>

          <div className="mt-10 border-t border-slate-100 pt-6">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
              ← Back to BikeLog
            </Link>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
