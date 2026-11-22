"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Recipe } from "./data";

export type Lang = "es" | "en";
export type LangPref = "auto" | Lang;

const STORAGE_KEY = "ketofit-lang";

export function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "es";
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of candidates) {
    if (!tag) continue;
    const base = tag.toLowerCase().split("-")[0];
    if (base === "es") return "es";
    if (base === "en") return "en";
  }
  return "en";
}

const DAYS_EN: Record<string, string> = {
  Lunes: "Monday",
  Martes: "Tuesday",
  Miércoles: "Wednesday",
  Jueves: "Thursday",
  Viernes: "Friday",
  Sábado: "Saturday",
  Domingo: "Sunday",
};

const MEALS_EN: Record<string, string> = {
  Desayuno: "Breakfast",
  Almuerzo: "Lunch",
  Merienda: "Snack",
  Cena: "Dinner",
};

const PHASES_EN: Record<string, string> = {
  "Adaptación técnica": "Technical adaptation",
  "Consolidar técnica": "Consolidate technique",
  "Sumar repeticiones": "Add repetitions",
  "Progresión gradual": "Gradual progression",
  "Descarga: reducir series": "Deload: reduce sets",
  "Retomar progresión": "Resume progression",
  "Consolidar cargas": "Consolidate loads",
  "Evaluar y registrar": "Evaluate and log",
};

const EXCLUSIONS_EN: Record<string, string> = {
  Huevos: "Eggs",
  Lácteos: "Dairy",
  "Frutos secos": "Nuts",
  Pescado: "Fish",
};

const EXPERIENCE_EN: Record<string, string> = {
  Inicial: "Beginner",
  Intermedia: "Intermediate",
  Avanzada: "Advanced",
};

const GOALS_EN: Record<string, string> = {
  "Perder grasa y ganar músculo": "Lose fat and build muscle",
  "Mejorar mi fuerza": "Improve strength",
  "Mantener hábitos saludables": "Maintain healthy habits",
};

const UV_LEVELS_EN: Record<string, string> = {
  Bajo: "Low",
  Moderado: "Moderate",
  Alto: "High",
  "Muy alto": "Very high",
  Extremo: "Extreme",
};

const RECIPE_NAMES_EN: Record<string, string> = {
  huevos: "Eggs with avocado",
  pollo: "Green chicken bowl",
  yogur: "Greek yogurt with walnuts",
  salmon: "Salmon with broccoli",
  omelette: "Spinach omelette",
  carne: "Beef with zucchini",
  chia: "Chia & coconut pudding",
  "palta-snack": "Avocado & cucumber",
  tofu: "Tofu with zucchini",
  "ensalada-tofu": "Tofu & avocado salad",
  queso: "Cheese with olives",
  "revuelto-tofu": "Tofu scramble",
};

const ROUTINE_NAMES_EN: Record<string, string> = {
  "Torso · fuerza": "Upper body · strength",
  "Piernas · fuerza": "Legs · strength",
  "Movimiento y core": "Movement & core",
  "Torso · volumen": "Upper body · volume",
  "Piernas · volumen": "Legs · volume",
  "Recuperación opcional": "Optional recovery",
  "Casa · fuerza de cuerpo completo": "Home · full-body strength",
  "Casa · movilidad y caminata": "Home · mobility & walk",
  "Casa · fuerza y control": "Home · strength & control",
  "Casa · movimiento suave": "Home · gentle movement",
  "Casa · recuperación opcional": "Home · optional recovery",
  "Casa · movimiento libre": "Home · free movement",
};

const EXERCISES_EN: Record<string, string> = {
  "Press de pecho": "Chest press",
  "Remo sentado": "Seated row",
  "Press de hombros": "Shoulder press",
  "Jalón al pecho": "Lat pulldown",
  "Curl de bíceps": "Biceps curl",
  "Prensa de piernas": "Leg press",
  "Peso muerto rumano": "Romanian deadlift",
  "Curl femoral": "Leg curl",
  "Elevación de gemelos": "Calf raise",
  Plancha: "Plank",
  "Caminata en cinta": "Treadmill walk",
  "Pallof press": "Pallof press",
  "Dead bug": "Dead bug",
  "Movilidad de cadera": "Hip mobility",
  "Movilidad de hombros": "Shoulder mobility",
  "Press inclinado": "Incline press",
  "Elevaciones laterales": "Lateral raises",
  "Extensión de tríceps": "Triceps extension",
  "Sentadilla goblet": "Goblet squat",
  "Hip thrust": "Hip thrust",
  "Caminata suave": "Easy walk",
  "Caminata a ritmo cómodo": "Comfortable-pace walk",
  "Sentarse y levantarse de una silla": "Sit-to-stand from chair",
  "Sentadilla a una silla": "Box/chair squat",
  "Flexiones contra la pared": "Wall push-ups",
  "Flexiones con apoyo elevado estable": "Incline push-ups (stable support)",
  "Puente de glúteos": "Glute bridge",
  "Bird dog": "Bird dog",
  "Elevación de gemelos de pie": "Standing calf raise",
};

type I18nContextValue = {
  lang: Lang;
  pref: LangPref;
  setPref: (next: LangPref) => void;
  locale: string;
  tr: (es: string, en: string) => string;
  fmt: (n: number | null, digits?: number) => string;
  shortDate: (iso: string) => string;
  longDate: (iso: string) => string;
  dayLabel: (day: string) => string;
  mealLabel: (meal: string) => string;
  phaseLabel: (phase: string) => string;
  exclusionLabel: (ex: string) => string;
  experienceLabel: (exp: string) => string;
  goalLabel: (goal: string) => string;
  uvLevelLabel: (name: string) => string;
  recipeName: (r: Recipe) => string;
  routineName: (name: string) => string;
  exerciseName: (name: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<LangPref>("auto");
  const [browserLang, setBrowserLang] = useState<Lang>("es");

  useEffect(() => {
    setBrowserLang(detectBrowserLang());
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "es" || saved === "en" || saved === "auto") setPrefState(saved);
    } catch {
      // Ignore storage errors in restricted environments
    }

    const onLanguageChange = () => setBrowserLang(detectBrowserLang());
    window.addEventListener("languagechange", onLanguageChange);
    return () => window.removeEventListener("languagechange", onLanguageChange);
  }, []);

  const setPref = useCallback((next: LangPref) => {
    setPrefState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const lang: Lang = pref === "auto" ? browserLang : pref;
  const locale = lang === "en" ? "en-US" : "es-AR";

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => {
    const tr = (es: string, en: string) => (lang === "en" ? en : es);
    return {
      lang,
      pref,
      setPref,
      locale,
      tr,
      fmt: (n, digits = 1) =>
        n === null ? "—" : new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n),
      shortDate: (iso) =>
        new Date(iso + "T12:00:00").toLocaleDateString(locale, { day: "numeric", month: "short" }),
      longDate: (iso) =>
        new Date(iso + "T12:00:00").toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      dayLabel: (d) => (lang === "en" ? DAYS_EN[d] ?? d : d),
      mealLabel: (m) => (lang === "en" ? MEALS_EN[m] ?? m : m),
      phaseLabel: (p) => (lang === "en" ? PHASES_EN[p] ?? p : p),
      exclusionLabel: (ex) => (lang === "en" ? EXCLUSIONS_EN[ex] ?? ex : ex),
      experienceLabel: (exp) => (lang === "en" ? EXPERIENCE_EN[exp] ?? exp : exp),
      goalLabel: (goal) => (lang === "en" ? GOALS_EN[goal] ?? goal : goal),
      uvLevelLabel: (name) => (lang === "en" ? UV_LEVELS_EN[name] ?? name : name),
      recipeName: (r) => (lang === "en" ? RECIPE_NAMES_EN[r.id] ?? r.name : r.name),
      routineName: (name) => (lang === "en" ? ROUTINE_NAMES_EN[name] ?? name : name),
      exerciseName: (name) => (lang === "en" ? EXERCISES_EN[name] ?? name : name),
    };
  }, [lang, pref, setPref, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
