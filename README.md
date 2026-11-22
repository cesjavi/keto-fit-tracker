# KetoFit

Personal training, keto meal planning, and wellness tracking web app (Spanish UI) built with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, and Prisma — no Docker required.

## Mobile Access (PWA)

**https://keto-fit-tracker-two.vercel.app**

1. Open the URL in Chrome.
2. Select **Crear cuenta**. Enter your name, email, and a password of at least 12 characters.
3. Complete the initial onboarding: body measurements, experience level, goal, home/gym mode, training days, session duration, and dietary preferences.
4. Optionally generate your first weekly meal plan at the end of onboarding.
5. To install on Android: Chrome menu → **Add to Home screen → Install**.

The interface features a 4-pillar navigation system with domain sub-tabs, bottom navigation on mobile, tactile stepper controls, an animated splash intro, and a reactive vector mascot (**Paltín**). The PWA requires a network connection to read and save records; offline visits display an informative fallback screen.

## Activating the Admin Account

The reserved admin email is **cesjavi@gmail.com**. It has no predefined password — you choose one when registering.

1. Under **Crear cuenta**, enter that email address.
2. Choose a new password (12–128 characters).
3. In **Código de administrador**, enter the legacy private key provided in `Acceso-KetoFit.txt`.
4. Registration links previous records from that database to your account; onboarding lets you confirm or update them.

That code only activates the reserved account. Afterward, sign in with your email and new password. Previous single-password sessions no longer grant access.

The **Administración** panel lists registered accounts, creation dates, and roles only — it never displays health, nutrition, or workout history of other users. Each account's records are strictly isolated. Email verification and password recovery emails are not yet implemented (no fake emails are simulated).

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

Local accounts and data are independent from Vercel production. You can transfer records via **Ajustes y datos → Exportar JSON / Importar copia**. Importing replaces only the current account's data after explicit confirmation.

## Training, Nutrition & Customization

- **Home & Gym Modes:** Switch between home bodyweight workouts and gym equipment/free-weight routines at any time. Volume adapts to experience level and the Week 5 deload phase.
- **Editable Routines & Session Mode:** Customize training days, duration, experience, session titles, and individual exercises per day/mode directly from **Entrenamiento → Editar entrenamiento**. Each exercise displays your last recorded mark inline, pre-fills sets/reps/load, and supports `±` tactile steppers plus full editing in **Historial**.
- **Keto Nutrition & Editable Logs:** Track daily calories, net/total carbs (ceiling semantics), protein (floor target), and fats with proportional progress bars. Edit any logged food entry or update dietary preferences and daily targets directly from **Alimentación → Cambiar alimentación**.
- **Weekly Meal Planner & Live Macros:** Plan 7 days across breakfast, lunch, snack, and dinner with live per-day calorie, carb, and protein totals. Choose omnivore keto or vegetarian, max prep time, servings, and exclusions (eggs, dairy, nuts, fish).
- **Automated Shopping List:** Aggregates all ingredients for the selected week automatically with an action-first checklist and progress bar.
- **Disclaimers:** Recipe macros are per-serving estimates, not clinical measurements. Exclusions rely on catalog ingredients; verify labels and cross-contamination for allergies. Generating a meal plan neither logs consumed food nor sets calorie targets automatically. No measurements or histories are fabricated, and there is no Health Connect integration.

## AI Meal Suggestions (Groq & Fireworks)

In **Alimentación → Planificador → Asistente semanal**, choose a provider and explicitly authorize sending preferences before generating. Results appear as a preview and only overwrite the selected week once applied.

Groq is configured in production with the owner's server-side key. Fireworks is integrated as an optional fallback once its API key and model are configured. No keys are exposed in client code or the browser.

Only dietary preferences, exclusions, prep time, servings, and the recipe catalog are sent — never email, weight, waist, or personal history. The server validates every returned recipe against constraints before displaying it.

**Auto** mode falls back across configured providers (Groq, then Fireworks) on rate limits or transient errors. The on-screen consent notice names both destinations. The deterministic non-AI generator remains available at all times.

Server environment variables in Vercel:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection string with SSL |
| `ACCESS_PASSWORD` | Reserved activation code for the admin account |
| `GROQ_API_KEY` | Secret Groq API key |
| `GROQ_MODEL` | Enabled Groq model ID |
| `FIREWORKS_API_KEY` | Optional secret Fireworks API key |
| `FIREWORKS_MODEL` | Fireworks model ID |
| `AI_ENABLED` | Set to `true` to enable AI generation |
| `AI_DAILY_LIMIT` | Optional; defaults to 5 requests/day per account (max 20) |
| `AI_GLOBAL_DAILY_LIMIT` | Optional; defaults to 30 total requests/day (max 500) |
| `OPEN_METEO_API_KEY` | Optional commercial Open-Meteo API key |

Each AI request may consume provider credits. Failed attempts also count toward the app's daily limit, which does not replace provider spending caps. Store all secrets without the `NEXT_PUBLIC_` prefix; changing variables requires a redeploy.

API docs: [Groq](https://console.groq.com/docs/api-reference) and [Fireworks](https://fireworksai.readme.io/reference/createchatcompletion).

## Development & Deployment

Requirements: Node.js 20.9+ (developed on Node 24), npm, and PostgreSQL. Local settings live in `.env` (git-ignored).

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Build and run production server locally:

```powershell
npm run build
npm start
```

Run tests:

```powershell
npm test
```

Deploy to Vercel production:

```powershell
vercel deploy --prod --yes --scope cesjavis-projects
```

The Vercel build runs Prisma generation, deploys pending migrations, and builds Next.js (tests are not executed during the Vercel build). Project: `cesjavis-projects/keto-fit-tracker` backed by Neon PostgreSQL `ketofit-db`.

Never commit or publish `.env*`, `.data`, secret keys, personal backups, `node_modules`, or `.vercel`. `.vercelignore` excludes sensitive local files from deployments.

## Troubleshooting

- **Legacy single-password screen still visible:** Reload the published URL. If installed as a PWA, close and reopen it online to refresh cached assets.
- **Cannot activate admin account:** Use `cesjavi@gmail.com`, a new password (12+ chars), and the previous private key as the admin code.
- **PostgreSQL unavailable:** Start the local database with `.\iniciar.ps1` and check `.data\postgres.log`.
- **Changes made in another tab:** Reload before saving again; optimistic concurrency uses a server-side `revision` counter to prevent silent overwrites.
- **Port 3000 in use:** Run `npm start -- --port 3002`.
- **Fireworks not configured:** Add `FIREWORKS_API_KEY` and `FIREWORKS_MODEL` in Vercel environment variables and redeploy.
- **Recipe photos missing:** Illustrative Unsplash images require an internet connection.

Sign out via **Ajustes y datos → Cerrar sesión** to revoke the session in PostgreSQL.

## Supermarkets by City & Groq Suggestions

In **Alimentación → Compras → Configurar ciudad**, save country, province/region, city, preferred stores, and custom HTTPS stores in your account (up to 20 locations, included in JSON backups; no GPS or street address requested).

**Sugerir para esta ciudad** calls Groq only after explicit consent to send country, region, and city (no health or identity data). Suggestions are constrained to the known store catalog (currently preloaded for Argentina; other countries can add custom HTTPS stores manually). Links are never AI-generated, and Groq does not verify live branches, pricing, stock, or delivery coverage. Store actions open official websites directly without creating carts or processing payments.

## Queryable Workout History

In **Entrenamiento → Historial**, filter records by exercise, name search, date range, and program week; sort by date or load; inspect details; edit existing entries; and export filtered results to CSV (15 items per page). Selecting a strength exercise displays latest mark, peak load, and a load-progression chart. Existing records are never altered automatically or fabricated.

## UV Index with Device Location

Open **Cuerpo y entorno → Sol y Vit. D**, authorize sending approximate coordinates, and tap **Usar mi ubicación** (requires HTTPS or localhost and browser geolocation permission). Coordinates are rounded to two decimal places before querying Open-Meteo, held only in screen memory, never saved to your profile or JSON exports, and never sent to Groq. Tapping **Dejar de usar ubicación** clears the session query immediately.

Displays the latest hourly UV estimate, today/tomorrow forecast chart, WHO UV ≥ 3 sun-protection guidance, and future lower-UV daylight windows. Data comes from Open-Meteo weather models (hourly means of the preceding hour), refreshes every 15 minutes while visible, flags data older than 30 minutes as stale, and is rate-limited to 30 requests/hour per account (separate from Groq quota).

Sources: https://open-meteo.com/en/docs and https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation.

## Vitamin D Exploratory Model & 25(OH)D Lab Log

Based on D-Minder documentation (https://dminder.info/science) and the published equation 13 in *Scientific Reports* (https://www.nature.com/articles/s41598-024-54188-5), the **Sol y Vit. D** view includes a transparent educational calculator with a one-click bridge to import the currently queried UV index, plus a separate lab log strictly for real 25(OH)D blood test results (`1 ng/mL = 2.5 nmol/L`, NIH: https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/).

The theoretical formula `21120 * (UVI * seconds / 40) * skin_fraction / MED` is capped at ¼ nominal MED as a low-dose exploration only. It does not recommend exposure times, supplement doses, or target IU, nor does it predict blood 25(OH)D correction. Lab records are saved per account, included in JSON backups, and never sent to AI or weather APIs.
