# KetoFit

Privacy-first personal training, keto meal planning, and wellness tracking web app built with Next.js App Router, React, TypeScript, Tailwind CSS, PostgreSQL, and Prisma — no Docker required.

## Live App & Pitch Deck

- **Live App:** https://keto-fit-tracker-two.vercel.app
- **Interactive Pitch Deck:** https://keto-fit-tracker-two.vercel.app/pitch

### Quick Start on Mobile (PWA)

1. Open the live URL in Chrome.
2. Select **Create account**. Enter your name, email, and a password of at least 12 characters.
3. Complete the 2-step onboarding: body measurements, experience level, goal, home/gym mode, training days, session duration, and dietary preferences.
4. Optionally generate your first weekly meal plan at the end of onboarding.
5. To install on Android: Chrome menu → **Add to Home screen → Install**.

The interface automatically adapts to the browser's language (**English** and **Spanish**), with a manual override under **Settings & data → Application language**. It features a 4-pillar navigation system with domain sub-tabs, mobile bottom navigation, tactile stepper controls, an animated splash intro, and a reactive vector mascot (**Paltín**). The PWA requires a network connection to read and save records; offline visits show an informative fallback screen.

## Default Admin Account

The default reserved admin account email is **`admin@ketofit.app`** (configurable via the `ADMIN_EMAIL` environment variable). It has no hardcoded password — you choose your password on first registration using the server's `ACCESS_PASSWORD` secret.

1. Open **Create account** and enter `admin@ketofit.app` (or your configured `ADMIN_EMAIL`).
2. Choose a strong password (12–128 characters).
3. In **Admin code**, enter the value configured in your server's `ACCESS_PASSWORD` environment variable.
4. Once registered, sign in normally with your email and password.

The **Admin** panel displays registered accounts, creation dates, and roles only — it never exposes another user's health, nutrition, lab, or workout records. Each account's data is strictly isolated. Email verification and password recovery emails are not yet implemented (no fake emails are simulated).

## Running Locally on Windows

```powershell
cd F:\Sistemas\keto-fit-tracker
.\iniciar.ps1
```

Open **http://localhost:3000**. Keep the terminal open; press `Ctrl+C` to stop the app.

If Windows execution policy blocks the script:

```powershell
powershell -ExecutionPolicy Bypass -File F:\Sistemas\keto-fit-tracker\iniciar.ps1
```

To stop the local PostgreSQL instance as well:

```powershell
.\detener-base.ps1
```

This project uses an isolated PostgreSQL instance on `127.0.0.1:55432` storing data in `.data\postgres`. The PowerShell helper scripts expect PostgreSQL binaries at `C:\Program Files\PostgreSQL\18\bin` and do not touch any other local databases.

Local accounts and data are independent from production. You can transfer records via **Settings & data → Export JSON / Import backup**. Importing replaces only the current account's data after explicit confirmation.

## Training, Nutrition & Customization

- **Home & Gym Modes:** Switch between home bodyweight workouts and gym equipment/free-weight routines at any time. Volume adapts to experience level and the Week 5 deload phase.
- **Editable Routines & Session Mode:** Customize training days, duration, experience, session titles, and individual exercises per day and mode directly from **Training → Edit training**. Each exercise shows your last recorded mark inline, pre-fills sets/reps/load, and supports `±` tactile steppers plus full editing in **History**.
- **Keto Nutrition & Editable Logs:** Track daily calories, carbs (ceiling semantics), protein (floor target), and fats with proportional progress bars. Edit any logged food entry or update dietary preferences and daily targets directly from **Nutrition → Edit diet**.
- **Weekly Meal Planner & Live Macros:** Plan 7 days across breakfast, lunch, snack, and dinner with live per-day calorie, carb, and protein rollups. Choose varied keto or vegetarian, max prep time, servings, and exclusions (eggs, dairy, nuts, fish).
- **Automated Shopping List:** Aggregates all ingredients for the selected week automatically into an action-first checklist with a progress bar.
- **Disclaimers:** Recipe macros are per-serving estimates, not clinical measurements. Exclusions rely on catalog ingredients; verify product labels and cross-contamination for allergies. Generating a meal plan neither logs consumed food nor sets calorie targets automatically. No measurements or histories are fabricated, and there is no Health Connect integration.

## AI Meal Suggestions (Groq & Fireworks)

In **Nutrition → Planner → Weekly assistant**, choose a provider and explicitly authorize sending preferences before generating. Results appear as a preview and only overwrite the selected week once applied.

Groq and Fireworks are supported server-side via environment variables. No API keys are exposed in client code or the browser.

Only dietary preferences, exclusions, prep time, servings, and the recipe catalog are sent — never email, weight, waist, or personal history. The server validates every returned recipe against constraints before displaying it.

**Auto** mode falls back across configured providers (Groq, then Fireworks) on rate limits or transient errors. The on-screen consent notice names both destinations. The deterministic non-AI generator remains available at all times.

Server environment variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (Neon with SSL in production) |
| `ADMIN_EMAIL` | Optional; reserved admin account email (defaults to `admin@ketofit.app`) |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Optional; matches `ADMIN_EMAIL` on the sign-up form if overridden |
| `ACCESS_PASSWORD` | Activation code required to register the admin account |
| `GROQ_API_KEY` | Secret Groq API key |
| `GROQ_MODEL` | Enabled Groq model ID |
| `FIREWORKS_API_KEY` | Optional secret Fireworks API key |
| `FIREWORKS_MODEL` | Fireworks model ID |
| `AI_ENABLED` | Set to `true` to enable AI generation |
| `AI_DAILY_LIMIT` | Optional; defaults to 5 requests/day per account (max 20) |
| `AI_GLOBAL_DAILY_LIMIT` | Optional; defaults to 30 total requests/day (max 500) |
| `OPEN_METEO_API_KEY` | Optional commercial Open-Meteo API key |

Each AI request may consume provider credits. Failed attempts also count toward the app's daily limit, which does not replace provider spending caps. Store all secrets without the `NEXT_PUBLIC_` prefix; changing variables requires a redeploy.

API references: [Groq](https://console.groq.com/docs/api-reference) and [Fireworks](https://fireworksai.readme.io/reference/createchatcompletion).

## Development & Deployment

Requirements: Node.js 20.9+ (developed on Node 24), npm, and PostgreSQL. Local settings live in `.env` (git-ignored).

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Build and run the production server locally:

```powershell
npm run build
npm start
```

Deploy to Vercel production:

```powershell
vercel deploy --prod --yes
```

The Vercel build generates the Prisma client, deploys pending migrations, and builds Next.js.

Never commit or publish `.env*`, `.data`, secret keys, personal backups, `node_modules`, or `.vercel`. `.vercelignore` excludes sensitive local files from deployments.

## Troubleshooting

- **Legacy screen still visible:** Reload the published URL. If installed as a PWA, close and reopen it online to refresh cached assets.
- **Cannot activate admin account:** Register with `admin@ketofit.app` (or your configured `ADMIN_EMAIL`), a password of 12+ characters, and the server's `ACCESS_PASSWORD` as the admin code.
- **PostgreSQL unavailable:** Start the local database with `.\iniciar.ps1` and check `.data\postgres.log`.
- **Changes made in another tab:** Reload before saving again; optimistic concurrency uses a server-side `revision` counter to prevent silent overwrites.
- **Port 3000 in use:** Run `npm start -- --port 3002`.
- **Fireworks not configured:** Add `FIREWORKS_API_KEY` and `FIREWORKS_MODEL` in Vercel environment variables and redeploy.
- **Recipe photos missing:** Illustrative Unsplash images require an internet connection.

Sign out via **Settings & data → Sign out** to revoke the session in PostgreSQL.

## Supermarkets by City & Groq Suggestions

In **Nutrition → Shopping → Configure city**, save country, state/region, city, preferred stores, and custom HTTPS stores in your account (up to 20 locations, included in JSON backups; no GPS or street address requested).

**Suggest for this city** calls Groq only after explicit consent to send country, region, and city (no health or identity data). Suggestions are constrained to the known store catalog (preloaded for Argentina; other countries can add custom HTTPS stores manually). Links are never AI-generated, and Groq does not verify live branches, pricing, stock, or delivery coverage. Store links open official websites directly without creating carts or processing payments.

## Queryable Workout History

In **Training → History**, filter records by exercise, name search, date range, and program week; sort by date or load; inspect details; edit existing entries; and export filtered results to CSV (15 items per page). Selecting a strength exercise displays latest mark, peak load, and a load-progression chart. Existing records are never altered automatically or fabricated.

## UV Index with Device Location

Open **Body & sun → Sun & Vit. D**, authorize sending approximate coordinates, and tap **Use my location** (requires HTTPS or localhost and browser geolocation permission). Coordinates are rounded to two decimal places before querying Open-Meteo, held only in screen memory, never saved to your profile or JSON exports, and never sent to Groq. Tapping **Stop using location** clears the session query immediately.

Displays the latest hourly UV estimate, today/tomorrow forecast chart, WHO UV ≥ 3 sun-protection guidance, and future lower-UV daylight windows. Data comes from Open-Meteo weather models (hourly means of the preceding hour), refreshes every 15 minutes while visible, flags data older than 30 minutes as stale, and is rate-limited to 30 requests/hour per account (separate from Groq quota).

Sources: https://open-meteo.com/en/docs and https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation.

## Vitamin D Exploratory Model & 25(OH)D Lab Log

Based on D-Minder documentation (https://dminder.info/science) and the published equation 13 in *Scientific Reports* (https://www.nature.com/articles/s41598-024-54188-5), the **Sun & Vit. D** view includes a transparent educational calculator with a one-click bridge to import the currently queried UV index, plus a separate lab log strictly for real 25(OH)D blood test results (`1 ng/mL = 2.5 nmol/L`, NIH: https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/).

The theoretical formula `21120 * (UVI * seconds / 40) * skin_fraction / MED` is capped at ¼ nominal MED as a low-dose exploration only. It does not recommend exposure times, supplement doses, or target IU, nor does it predict blood 25(OH)D correction. Lab records are saved per account, included in JSON backups, and never sent to AI or weather APIs.
