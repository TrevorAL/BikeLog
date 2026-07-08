# UI/UX Audit & Overhaul Checklist

Branch: `feature/ui-ux-overhaul`. Standard: Stripe/Linear-tier polish — restraint,
rhythm, hierarchy, designed states — optimized separately for desktop and mobile.

## Baseline (what was already strong)

- Coherent token system: brand/ink palettes, Sora/Inter, shadow scale
  (`tailwind.config.ts`), `surface-card` helpers (`app/globals.css`).
- Login: split-panel desktop, clean mobile collapse, clear value prop.
- Real empty states on dashboard; componentized UI that propagates fixes.

## Findings → work items

| # | Item | Severity | Status |
| --- | --- | --- | --- |
| 1 | Dark mode built on ~40 unlayered `!important` utility overrides — brittle, specificity fights (`app/globals.css`) | P0 foundation | ✅ Replaced with semantic CSS variables (`--surface`, `--text-*`, `--border-subtle`); `!important` removed (unlayered rules already beat `@layer utilities`). Colors unchanged. |
| 2 | Mobile nav: all 3 groups render as always-expanded stacked dropdowns + title in a sticky header — eats a large share of the viewport (`AppHeader.tsx`) | P0 mobile | ✅ Bottom tab bar (thumb-reach, safe-area aware) + compact section pill row for the active group; stacked dropdowns removed. |
| 3 | No streaming/skeletons: `force-dynamic` pages block full paint on DB queries | P1 perceived perf | ✅ `loading.tsx` skeletons for dashboard/rides/maintenance/components/bike. |
| 4 | Touch targets: inputs/selects 40px min-height, below 44px HIG/WCAG target | P1 mobile forms | ✅ 44px on coarse-pointer devices via media query. |
| 5 | Keyboard a11y: no global visible focus style | P1 a11y | ✅ Global `:focus-visible` brand outline. |
| 6 | Login: two competing filled-orange primaries (Google + email submit) | P2 | ✅ Google buttons neutral (convention); email submit is the single brand-filled primary. |
| 7 | Spacing rhythm: mix of `gap-3`/`gap-4`/`p-5` across dashboard sections | P2 polish | ✅ Normalized on dashboard (4-unit rhythm). |

## Wave 2 — structural professionalism (all shipped)

| Item | Status |
| --- | --- |
| In-app ParallaxHero removed; compact status band (bike, due summary, small readiness ring, one CTA) | ✅ |
| Page title/description/actions moved from sticky header into content; chrome is one slim row | ✅ |
| Slim dismissible system banners (accent border, sessionStorage dismiss); max one shown, Strava first | ✅ |
| PillBars threshold mode: semantic green/amber/red by % of service interval, 80% tick, honest widths | ✅ |
| Rides: desktop table (right-aligned tabular numerals, Wet/Notes pills, row actions, details on row click); cards below `lg`; edit is a shared modal | ✅ |
| Empty rides chart hidden until data exists | ✅ |
| Recalc utilities behind a "Component tools" overflow menu; Add component is the sole primary | ✅ |
| Copy: Total Miles + 7-day trend; duplicate Log Ride removed from quick actions | ✅ |

## Still open (future passes)

- Maintenance history + components list desktop tables (same pattern as rides).
- Purposeful motion pass (state-change transitions; replace decorative-only motion).
- Dashboard Suspense streaming (section-level, beyond route-level skeletons).
- Empty/loading/error state unification on remaining screens (one EmptyState pattern).
- RideCard date renders one day off for UTC-midnight dates (pre-existing `toLocaleDateString` timezone shift) — small correctness fix worth taking.

## Verification method

Public screens verified live in preview (light + dark, 375px + 1440px).
Authenticated screens verified live using the dev-only signed-cookie auth
(`ALLOW_LEGACY_TOKEN_AUTH=1` in `.env.local`, gated off in production —
see `lib/auth.ts`).
