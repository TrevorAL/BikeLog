import Link from "next/link";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export const metadata = {
  title: "Privacy Policy — BikeLog",
  description: "How BikeLog collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <MarketingHeader variant="minimal" />

      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-xl sm:p-12">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: June 16, 2026</p>

          <div className="prose prose-slate mt-8 max-w-none text-slate-700">
            <p>
              BikeLog is a personal bike maintenance tracker. This policy explains what data we
              collect, why we collect it, and your rights around it.
            </p>

            <h2>What we collect</h2>
            <ul>
              <li>
                <strong>Account information:</strong> your name, email address, and profile photo
                from Google (if you sign in with Google) or your chosen password.
              </li>
              <li>
                <strong>Bike and component data:</strong> the bikes, components, maintenance events,
                rides, tire pressure setups, fit measurements, and checklists you create inside the
                app.
              </li>
              <li>
                <strong>Strava data:</strong> if you connect your Strava account, we import your
                ride activities (distance, duration, date, and surface conditions) to keep your
                component mileage up to date. We store the OAuth tokens needed to fetch this data.
              </li>
              <li>
                <strong>Notification preferences:</strong> your choices around email reminders for
                maintenance due dates.
              </li>
            </ul>

            <h2>How we use your data</h2>
            <ul>
              <li>To provide the BikeLog service — tracking rides, components, and maintenance.</li>
              <li>
                To send optional maintenance reminder emails (only if you enable notifications in
                your settings).
              </li>
              <li>To sync ride data from Strava on your behalf (only if connected).</li>
            </ul>
            <p>We do not sell your data, run ads, or share it with third parties for marketing.</p>

            <h2>Third-party services</h2>
            <ul>
              <li>
                <strong>Google OAuth:</strong> used for sign-in. Google&apos;s privacy policy applies to
                the authentication step.
              </li>
              <li>
                <strong>Strava:</strong> optional. If connected, Strava&apos;s privacy policy governs
                their handling of your fitness data.
              </li>
              <li>
                <strong>Resend:</strong> our transactional email provider. Your email address is
                passed to Resend solely to deliver maintenance reminders you opt into.
              </li>
              <li>
                <strong>Neon (PostgreSQL) and Vercel:</strong> cloud infrastructure providers that
                store and serve your data. Both are hosted in the United States.
              </li>
              <li>
                <strong>Sentry:</strong> used for error monitoring. Sentry may receive sanitised
                error context (no passwords or financial data) when the app encounters an
                unexpected error.
              </li>
            </ul>

            <h2>Data retention</h2>
            <p>
              Your data is retained as long as your account is active. You can request deletion at
              any time by emailing us (see Contact below) and we will remove your account and all
              associated data within 30 days.
            </p>

            <h2>Your rights</h2>
            <ul>
              <li>
                <strong>Access:</strong> you can view all your data inside the app at any time.
              </li>
              <li>
                <strong>Deletion:</strong> email us to request full account and data deletion.
              </li>
              <li>
                <strong>Strava disconnection:</strong> you can revoke BikeLog&apos;s Strava access from
                your Strava settings at any time, or from the integrations section of BikeLog.
              </li>
            </ul>

            <h2>Cookies</h2>
            <p>
              BikeLog uses a single session cookie to keep you logged in. We do not use tracking or
              advertising cookies.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              We may update this policy as the service evolves. Material changes will be noted at
              the top of this page with a revised &quot;Last updated&quot; date.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about this policy?{" "}
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
