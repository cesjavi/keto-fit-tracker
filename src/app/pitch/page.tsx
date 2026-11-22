"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Cpu,
  Database,
  Dumbbell,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  Lock,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Sun,
  Utensils,
} from "lucide-react";
import Mascot from "@/components/mascot";

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  render: () => React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    id: "cover",
    eyebrow: "PITCH DECK · 2026",
    title: "KetoFit",
    render: () => (
      <div className="pitch-cover">
        <div className="pitch-cover-copy">
          <span className="pill">
            <span className="dot" /> PRIVACY-FIRST PERSONAL WELLNESS PWA
          </span>
          <h1 className="pitch-hero-title">
            Keto<span>Fit</span>
          </h1>
          <p className="pitch-lead">
            One fast, distraction-free workspace for keto macro tracking, customizable home &amp; gym strength training,
            meal planning, fasting, and UV/Vitamin D awareness.
          </p>
          <div className="pitch-badges">
            <span>Next.js 16 + TypeScript</span>
            <span>PostgreSQL + Prisma</span>
            <span>Groq &amp; Fireworks AI</span>
            <span>Auto Browser i18n (EN/ES)</span>
          </div>
          <div className="button-row" style={{ marginTop: 22 }}>
            <a className="cmd-primary" href="/login">
              Open Live App <ExternalLink size={16} />
            </a>
          </div>
        </div>
        <div className="pitch-cover-art">
          <Mascot mood="splash" size={200} label="Paltín, KetoFit mascot" />
        </div>
      </div>
    ),
  },
  {
    id: "problem",
    eyebrow: "01 · THE PROBLEM",
    title: "Daily health tracking breaks under friction & fragmentation.",
    render: () => (
      <div className="pitch-grid-2">
        <div className="pitch-box">
          <h3>Fragmented workflows</h3>
          <p>
            Users bounce between 4–5 disconnected apps: a macro logger, a gym notebook, a recipe manager, a grocery
            checklist, and a UV/weather app.
          </p>
        </div>
        <div className="pitch-box">
          <h3>Misleading generic nutrition UI</h3>
          <p>
            Standard trackers treat all macros identically—missing keto&apos;s core rule where carbs act as a strict
            ceiling while protein is a daily floor.
          </p>
        </div>
        <div className="pitch-box">
          <h3>High friction in real contexts</h3>
          <p>
            Logging weights mid-workout without seeing your last mark—or scrolling past configuration chrome in the
            supermarket aisle—kills consistency.
          </p>
        </div>
        <div className="pitch-box">
          <h3>Opaque data monetization</h3>
          <p>
            Most wellness apps sell behavioral profiles, lock user exports behind paywalls, or send private health data
            to third-party AI APIs without consent.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "solution",
    eyebrow: "02 · THE SOLUTION",
    title: "An action-first, 4-pillar PWA built for real daily execution.",
    render: () => (
      <div className="pitch-grid-4">
        <div className="pitch-pillar">
          <div className="pitch-icon">
            <Activity size={22} />
          </div>
          <h3>1. Today</h3>
          <p>
            Schedule-aware command center showing today&apos;s session or rest day, live carb headroom, fasting timer,
            and UV status above the fold.
          </p>
        </div>
        <div className="pitch-pillar">
          <div className="pitch-icon">
            <Dumbbell size={22} />
          </div>
          <h3>2. Training</h3>
          <p>
            Home &amp; gym routines, 8-week progression, custom per-day exercise editor, session-mode steppers with
            last-mark autofill, and CSV history.
          </p>
        </div>
        <div className="pitch-pillar">
          <div className="pitch-icon">
            <Utensils size={22} />
          </div>
          <h3>3. Nutrition</h3>
          <p>
            Keto threshold macro bars, editable food logs, 7-day planner with live daily macro rollups, AI meal
            assistant, and action-first grocery list.
          </p>
        </div>
        <div className="pitch-pillar">
          <div className="pitch-icon">
            <Sun size={22} />
          </div>
          <h3>4. Body &amp; Sun</h3>
          <p>
            Weight &amp; waist trends, persistent intermittent fasting timer, Open-Meteo UV forecast, exploratory
            Vitamin D model, and 25(OH)D lab log.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "craft",
    eyebrow: "03 · PRODUCT CRAFT",
    title: "Engineered for one-handed speed in the gym, kitchen, and store.",
    render: () => (
      <div className="pitch-grid-2">
        <div className="pitch-feature">
          <Flame size={20} />
          <div>
            <h3>Keto-Aware Macro Semantics</h3>
            <p>
              Proportional progress bars encode carb ceiling alerts (green → amber → over-limit) separately from protein
              floor targets, plus live daily macro totals inside the 7-day planner.
            </p>
          </div>
        </div>
        <div className="pitch-feature">
          <Dumbbell size={20} />
          <div>
            <h3>Session-Mode Workout Memory</h3>
            <p>
              Single session date header, inline &quot;Last mark&quot; chip that pre-fills sets/reps/load, tactile
              ±2.5 kg steppers, and custom routine editing per day and mode.
            </p>
          </div>
        </div>
        <div className="pitch-feature">
          <ShoppingBasket size={20} />
          <div>
            <h3>Action-First Shopping &amp; Local Stores</h3>
            <p>
              Ingredients auto-aggregate from the weekly plan into a live progress checklist with one-tap copy for local
              stores (Coto, Carrefour, Día, or custom HTTPS links).
            </p>
          </div>
        </div>
        <div className="pitch-feature">
          <Globe size={20} />
          <div>
            <h3>Zero-Blocking Optimistic UX + Auto i18n</h3>
            <p>
              Serialized optimistic saves with revision concurrency, floating Undo toasts (no native confirm popups),
              automatic browser language (EN/ES), and reactive mascot Paltín.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "ai-science",
    eyebrow: "04 · CONSENT-GATED AI & EVIDENCE-BASED TOOLS",
    title: "Practical AI & transparent science—zero black-box medical claims.",
    render: () => (
      <div className="pitch-grid-2">
        <div className="pitch-box accent-box">
          <span className="eyebrow">GROQ + FIREWORKS AI</span>
          <h3>
            <Sparkles size={19} style={{ display: "inline", marginRight: 8 }} />
            Validated Meal &amp; Store Assistants
          </h3>
          <ul className="pitch-list">
            <li>
              <Check size={15} /> Explicit opt-in consent before every AI request
            </li>
            <li>
              <Check size={15} /> Sends only diet preferences &amp; recipe catalog—never identity or health logs
            </li>
            <li>
              <Check size={15} /> Strict server-side Zod validation &amp; per-account rate limits
            </li>
            <li>
              <Check size={15} /> Deterministic non-AI generator always available offline-friendly
            </li>
          </ul>
        </div>
        <div className="pitch-box accent-box">
          <span className="eyebrow">OPEN-METEO · WHO · SCIENTIFIC REPORTS 2024</span>
          <h3>
            <Sun size={19} style={{ display: "inline", marginRight: 8 }} />
            UV Forecast → Vitamin D &amp; 25(OH)D Labs
          </h3>
          <ul className="pitch-list">
            <li>
              <Check size={15} /> Geolocation rounded to 2 decimals, kept in memory only, never persisted
            </li>
            <li>
              <Check size={15} /> Hourly UV curve with WHO ≥ 3 threshold &amp; lowest-UV daylight windows
            </li>
            <li>
              <Check size={15} /> One-click UV bridge to published Eq. 13 exploratory Vitamin D model (≤ ¼ MED)
            </li>
            <li>
              <Check size={15} /> Separate clinical 25(OH)D blood lab tracker (nmol/L ↔ ng/mL)
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "architecture",
    eyebrow: "05 · TECHNICAL ARCHITECTURE",
    title: "Modern full-stack TypeScript engineered for reliability & privacy.",
    render: () => (
      <div className="pitch-grid-3">
        <div className="pitch-box">
          <Layers size={20} style={{ color: "#c8db9e", marginBottom: 10 }} />
          <h3>Frontend &amp; Design System</h3>
          <p>
            Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Plus Jakarta Sans with tabular numerals,
            unified dark/light Recharts wrapper, and custom SVG mascot animations.
          </p>
        </div>
        <div className="pitch-box">
          <Database size={20} style={{ color: "#c8db9e", marginBottom: 10 }} />
          <h3>Data &amp; Concurrency</h3>
          <p>
            Neon PostgreSQL + Prisma ORM with strict Zod v4 schema validation, optimistic revision locking (HTTP 409
            conflict protection), and full JSON backup/restore portability.
          </p>
        </div>
        <div className="pitch-box">
          <Cpu size={20} style={{ color: "#c8db9e", marginBottom: 10 }} />
          <h3>Integrations &amp; Security</h3>
          <p>
            Server-side Groq &amp; Fireworks inference, Open-Meteo UV proxy with hourly per-user quotas, salted
            session tokens in PostgreSQL, same-origin CSRF checks, and PWA service worker.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "privacy",
    eyebrow: "06 · PRIVACY & TRUST BY DESIGN",
    title: "Your body data belongs strictly to you.",
    render: () => (
      <div className="pitch-grid-2">
        <div className="pitch-feature">
          <ShieldCheck size={20} />
          <div>
            <h3>Strict Account Isolation</h3>
            <p>
              Even the Admin view lists account metadata only—never another user&apos;s weight, meals, labs, or
              workouts.
            </p>
          </div>
        </div>
        <div className="pitch-feature">
          <Lock size={20} />
          <div>
            <h3>Zero Secret Leakage</h3>
            <p>
              All AI and weather API keys remain server-side in Vercel environment secrets, with strict rate limiting
              and input validation.
            </p>
          </div>
        </div>
        <div className="pitch-feature">
          <Check size={20} />
          <div>
            <h3>No Fabricated Metrics</h3>
            <p>
              Zero synthetic defaults, zero unsolicited calorie prescriptions, and explicit scientific boundaries on UV
              and Vitamin D estimates.
            </p>
          </div>
        </div>
        <div className="pitch-feature">
          <Database size={20} />
          <div>
            <h3>100% Portable JSON Backups</h3>
            <p>
              Export and import your entire account state—including custom routines, stores, and 25(OH)D labs—at any
              time with schema validation.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "cta",
    eyebrow: "07 · LIVE DEMO & ROADMAP",
    title: "Live today on Vercel — ready to try on desktop & mobile.",
    render: () => (
      <div className="pitch-cta">
        <Mascot mood="celebrate" size={140} label="Paltín celebrating" />
        <p className="pitch-lead" style={{ maxWidth: 640, textAlign: "center" }}>
          Create an account in seconds, complete the 2-step onboarding, and test session-mode workouts, keto macro
          tracking, AI meal planning, and live UV insights.
        </p>
        <div className="pitch-roadmap">
          <div>
            <strong>Now live</strong>
            <span>Full-stack PWA · EN/ES auto i18n · Groq/Fireworks AI · Open-Meteo UV</span>
          </div>
          <div>
            <strong>Next up</strong>
            <span>Offline IndexedDB mutation sync · Barcode macro lookup · Doctor-ready PDF lab export</span>
          </div>
        </div>
        <div className="button-row" style={{ marginTop: 22 }}>
          <a className="cmd-primary" href="/login">
            Launch KetoFit Live <ExternalLink size={16} />
          </a>
        </div>
      </div>
    ),
  },
];

export default function PitchDeckPage() {
  const [index, setIndex] = useState(0);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(SLIDES.length - 1, i + 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const slide = SLIDES[index];

  return (
    <div className="pitch-shell">
      <header className="pitch-topbar">
        <a className="pitch-brand" href="/login">
          Keto<span>Fit</span> <small>Pitch Deck</small>
        </a>
        <div className="pitch-progress-dots" role="tablist" aria-label="Slides">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}: ${s.title}`}
              className={i === index ? "active" : ""}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <div className="pitch-nav-actions">
          <span className="tabular">
            {index + 1} / {SLIDES.length}
          </span>
          <a className="pitch-live-link" href="/login">
            Live app <ExternalLink size={14} />
          </a>
        </div>
      </header>

      <main className="pitch-canvas">
        <article className="pitch-slide" key={slide.id}>
          {index > 0 && (
            <div className="pitch-slide-head">
              <span className="pitch-eyebrow">{slide.eyebrow}</span>
              <h2>{slide.title}</h2>
            </div>
          )}
          {slide.render()}
        </article>
      </main>

      <footer className="pitch-footer">
        <button type="button" className="pitch-ctrl" disabled={index === 0} onClick={prev}>
          <ArrowLeft size={16} /> Previous
        </button>
        <span className="pitch-hint">Use ← / → arrow keys to navigate slides</span>
        <button type="button" className="pitch-ctrl primary-ctrl" disabled={index === SLIDES.length - 1} onClick={next}>
          Next <ArrowRight size={16} />
        </button>
      </footer>
    </div>
  );
}
