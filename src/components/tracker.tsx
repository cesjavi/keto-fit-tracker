"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  History,
  LayoutDashboard,
  Leaf,
  Loader2,
  Menu,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Scale,
  Settings,
  Shield,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Timer,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import VitaminDPanel from "./vitamin-d-panel";
import UVPanel from "./uv-panel";
import WorkoutHistory from "./workout-history";
import Supermarkets from "./supermarkets";
import Onboarding from "./onboarding";
import AdminPanel from "./admin-panel";
import MetricChart from "./metric-chart";
import Mascot, { MascotMood } from "./mascot";
import SplashIntro from "./splash-intro";
import { PreferencesEditor, MealGenerator, TrainingConfigEditor, FoodConfigEditor } from "./preferences";
import { training, prescription } from "@/lib/planning";
import { State, initial, days, meals, recipes, phases, shopping, stateSchema, Recipe } from "@/lib/data";
import { useI18n, LangPref } from "@/lib/i18n";

type Pillar = "hoy" | "entrenar" | "alimentacion" | "cuerpo" | "ajustes" | "admin";
type TrainSub = "rutina" | "programa" | "historial";
type FoodSub = "nutricion" | "planificador" | "compras" | "recetario";
type BodySub = "evolucion" | "ayuno" | "uv";

type ToastItem = {
  id: string;
  message: string;
  kind?: "info" | "error";
  undo?: () => void;
};

type SaveOptions = {
  toast?: string;
  undoLabel?: string;
};

function dateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monday(d = new Date()) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dateStr(x);
}

const uid = () => crypto.randomUUID();
const timed = (name: string) => /caminata|movilidad|walk|mobility/i.test(name);

type InstallEvent = Event & { prompt: () => Promise<void> };

export default function Tracker() {
  const {
    lang,
    pref: langPref,
    setPref: setLangPref,
    locale,
    tr,
    fmt,
    shortDate,
    dayLabel,
    mealLabel,
    phaseLabel,
    experienceLabel,
    goalLabel,
    recipeName,
    routineName,
    exerciseName,
  } = useI18n();

  const [data, setData] = useState<State>(initial);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [pillar, setPillar] = useState<Pillar>("hoy");
  const [trainSub, setTrainSub] = useState<TrainSub>("rutina");
  const [foodSub, setFoodSub] = useState<FoodSub>("nutricion");
  const [bodySub, setBodySub] = useState<BodySub>("evolucion");
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [now, setNow] = useState(0);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState(0);
  const [sessionDate, setSessionDate] = useState(() => dateStr());
  const [planWeek, setPlanWeek] = useState(monday());
  const [plannerDrawer, setPlannerDrawer] = useState(false);
  const [trainingDrawer, setTrainingDrawer] = useState(false);
  const [foodDrawer, setFoodDrawer] = useState(false);
  const [editingFood, setEditingFood] = useState<State["foods"][number] | null>(null);
  const [currentUV, setCurrentUV] = useState<number | null>(null);
  const [historyExercise, setHistoryExercise] = useState("");
  const [account, setAccount] = useState<{ name: string; email: string; role: string } | null>(null);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingImport, setPendingImport] = useState<State | null>(null);
  const [replaySplash, setReplaySplash] = useState(false);

  // Optimistic serialized persistence refs
  const revisionRef = useRef(0);
  const latestRef = useRef<State>(initial);
  const committedRef = useRef<State>(initial);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const loadedRef = useRef(false);
  const foodNameRef = useRef<HTMLInputElement | null>(null);
  const weightInputRef = useRef<HTMLInputElement | null>(null);

  const pushToast = useCallback((message: string, opts?: { kind?: "info" | "error"; undo?: () => void }) => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-2), { id, message, kind: opts?.kind, undo: opts?.undo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, opts?.undo ? 6000 : 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    fetch("/api/data")
      .then(async (r) => {
        const b = await r.json();
        if (r.status === 401) {
          location.replace("/login");
          return;
        }
        if (!r.ok) throw Error(b.error);
        const parsed = stateSchema.parse(b.data);
        setAccount(b.user);
        setData(parsed);
        latestRef.current = parsed;
        committedRef.current = parsed;
        revisionRef.current = b.revision;
        loadedRef.current = true;
        setLoaded(true);
      })
      .catch((e) => setError(e.message));

    setDark(localStorage.getItem("ketofit-theme") === "dark");
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
    const fn = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", fn);
    return () => {
      clearInterval(t);
      window.removeEventListener("beforeinstallprompt", fn);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("ketofit-theme", dark ? "dark" : "light");
  }, [dark]);

  const flushSave = useCallback(async () => {
    if (savingRef.current || !dirtyRef.current || !loadedRef.current) return;
    savingRef.current = true;
    setSyncing(true);
    try {
      while (dirtyRef.current) {
        dirtyRef.current = false;
        const snapshot = latestRef.current;
        const res = await fetch("/api/data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: snapshot, revision: revisionRef.current }),
        });
        const body = await res.json();
        if (!res.ok) throw Error(body.error || tr("Error al guardar", "Failed to save"));
        revisionRef.current = body.revision;
        committedRef.current = snapshot;
        setError("");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr("No se pudieron guardar los cambios.", "Could not save changes.");
      latestRef.current = committedRef.current;
      setData(committedRef.current);
      setError(msg);
      pushToast(msg, { kind: "error" });
    } finally {
      savingRef.current = false;
      setSyncing(false);
    }
  }, [pushToast, tr]);

  const save = useCallback(
    async (next: State, options?: SaveOptions) => {
      if (!loadedRef.current) return;
      const valid = stateSchema.safeParse(next);
      if (!valid.success) {
        const msg = tr(
          "Revisá los valores ingresados: hay campos fuera de rango.",
          "Check your inputs: some fields are out of range."
        );
        setError(msg);
        pushToast(msg, { kind: "error" });
        return;
      }
      const prevSnapshot = latestRef.current;
      latestRef.current = valid.data;
      setData(valid.data);
      setError("");
      dirtyRef.current = true;

      if (options?.undoLabel) {
        pushToast(options.undoLabel, {
          undo: () => {
            latestRef.current = prevSnapshot;
            setData(prevSnapshot);
            dirtyRef.current = true;
            flushSave();
            pushToast(tr("Acción deshecha.", "Action undone."));
          },
        });
      } else if (options?.toast) {
        pushToast(options.toast);
      }

      await flushSave();
    },
    [flushSave, pushToast, tr]
  );

  const routines = useMemo(
    () => training(data.preferences, data.customRoutines),
    [data.preferences, data.customRoutines]
  );
  const today = dateStr();
  const todayWeekday = useMemo(() => ((now ? new Date(now) : new Date()).getDay() + 6) % 7, [now]);
  const todayRoutineIdx = data.preferences.trainingDays.indexOf(todayWeekday);
  const isRestDay = todayRoutineIdx === -1;
  const recommendedRoutineIdx = useMemo(() => {
    if (todayRoutineIdx !== -1) return todayRoutineIdx;
    const nextIdx = data.preferences.trainingDays.findIndex((d) => d > todayWeekday);
    return nextIdx !== -1 ? nextIdx : 0;
  }, [todayRoutineIdx, data.preferences.trainingDays, todayWeekday]);

  const syncedInitialDay = useRef(false);
  useEffect(() => {
    if (loaded && !syncedInitialDay.current) {
      syncedInitialDay.current = true;
      setDay(recommendedRoutineIdx);
    }
  }, [loaded, recommendedRoutineIdx]);

  const scheduledRoutine = routines[recommendedRoutineIdx] ?? routines[0];
  const todayFoods = useMemo(() => data.foods.filter((x) => x.date === today), [data.foods, today]);
  const totals = useMemo(
    () =>
      todayFoods.reduce(
        (a, f) => ({
          kcal: a.kcal + f.kcal,
          protein: a.protein + f.protein,
          fat: a.fat + f.fat,
          carbs: a.carbs + f.carbs,
        }),
        { kcal: 0, protein: 0, fat: 0, carbs: 0 }
      ),
    [todayFoods]
  );

  const measurements = useMemo(
    () => [...data.measurements].sort((a, b) => a.date.localeCompare(b.date)),
    [data.measurements]
  );
  const latest = measurements.at(-1);
  const weight = latest?.weight ?? data.profile.weight;
  const activeRoutine = routines[day] ?? routines[0];

  const elapsed = data.fast && now ? Math.max(0, now - new Date(data.fast.start).getTime()) : 0;
  const timer = [
    Math.floor(elapsed / 3600000),
    Math.floor(elapsed / 60000) % 60,
    Math.floor(elapsed / 1000) % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");

  const shoppingItems = useMemo(() => shopping(data.plan, planWeek + "|"), [data.plan, planWeek]);
  const pendingShoppingCount = useMemo(
    () => shoppingItems.filter((item) => !data.checked.includes(`${planWeek}|${item.name}|${item.unit}`)).length,
    [shoppingItems, data.checked, planWeek]
  );

  // Latest workout record per exercise for inline memory in Session Mode
  const lastWorkoutByExercise = useMemo(() => {
    const map: Record<string, State["workouts"][number]> = {};
    data.workouts.forEach((w) => {
      const prev = map[w.exercise];
      if (!prev || w.date >= prev.date) map[w.exercise] = w;
    });
    return map;
  }, [data.workouts]);

  const sessionWorkouts = useMemo(
    () => data.workouts.filter((w) => w.date === sessionDate),
    [data.workouts, sessionDate]
  );

  const completedInSession = useMemo(() => {
    const set = new Set(sessionWorkouts.map((w) => w.exercise));
    return activeRoutine.ex.filter((ex) => set.has(ex)).length;
  }, [sessionWorkouts, activeRoutine]);

  const completedTodayScheduled = useMemo(() => {
    const set = new Set(data.workouts.filter((w) => w.date === today).map((w) => w.exercise));
    return scheduledRoutine.ex.filter((ex) => set.has(ex)).length;
  }, [data.workouts, today, scheduledRoutine]);

  const formattedHeaderDate = useMemo(() => {
    if (!now) return "KetoFit";
    const s = new Date(now).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [now, locale]);

  function num(form: FormData, key: string) {
    return Number(form.get(key));
  }

  function download(content: string, name: string, type = "application/json") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function stageImport(file: File) {
    try {
      if (file.size > 5000000) throw Error();
      const obj = JSON.parse(await file.text());
      if (obj.app !== "KetoFit" || obj.version !== 1) throw Error();
      const parsed = stateSchema.parse(obj.data);
      setPendingImport(parsed);
      setError("");
    } catch {
      setPendingImport(null);
      setError(
        tr(
          "No se pudo leer la copia: archivo incompatible o valores inválidos.",
          "Could not read backup: incompatible file or invalid values."
        )
      );
    }
  }

  function navigate(nextPillar: Pillar, sub?: TrainSub | FoodSub | BodySub) {
    setPillar(nextPillar);
    if (nextPillar === "entrenar" && sub) setTrainSub(sub as TrainSub);
    if (nextPillar === "alimentacion" && sub) setFoodSub(sub as FoodSub);
    if (nextPillar === "cuerpo" && sub) setBodySub(sub as BodySub);
    setMobile(false);
    setSearch("");
  }

  // Breadcrumb & Page Meta
  const viewMeta = useMemo(() => {
    const activePhase = phaseLabel(phases[data.week - 1]);
    if (pillar === "hoy") {
      return {
        crumbGroup: tr("Mi espacio", "Workspace"),
        crumbPage: tr("Hoy", "Today"),
        eyebrow: tr("RESUMEN OPERATIVO", "DAILY OVERVIEW"),
        title: tr("Cada día cuenta.", "Every day counts."),
        subtitle: tr(
          "Tu rutina, macros keto y hábitos activos en una sola vista.",
          "Your workout, keto macros, and active habits in one view."
        ),
        ctaLabel: tr("Ir a entrenar", "Go to training"),
        ctaIcon: <Dumbbell size={16} />,
        ctaAction: () => navigate("entrenar", "rutina"),
      };
    }
    if (pillar === "entrenar") {
      const labels: Record<TrainSub, { page: string; title: string; sub: string }> = {
        rutina: {
          page: tr("Rutina", "Routine"),
          title: tr("Entrenamiento", "Training"),
          sub: tr(
            "Registrá cargas con referencia de tu última marca en cada ejercicio.",
            "Log sets and weights with inline reference to your latest mark."
          ),
        },
        programa: {
          page: tr("Programa 8 sem.", "8-week program"),
          title: tr("Programa de 8 semanas", "8-week program"),
          sub: tr(
            "Elegí tu semana activa para ajustar volumen y descarga.",
            "Pick your active week to adjust volume and deload phases."
          ),
        },
        historial: {
          page: tr("Historial", "History"),
          title: tr("Historial de ejercicios", "Workout history"),
          sub: tr(
            "Analizá evolución de cargas, filtrá por período y exportá a CSV.",
            "Analyze load progression, filter by date range, and export CSV."
          ),
        },
      };
      const meta = labels[trainSub];
      return {
        crumbGroup: tr("Entrenamiento", "Training"),
        crumbPage: meta.page,
        eyebrow: `${tr("SEMANA", "WEEK")} ${data.week} ${tr("DE", "OF")} 8 · ${activePhase.toUpperCase()}`,
        title: meta.title,
        subtitle: meta.sub,
        ctaLabel: tr("Editar entrenamiento", "Edit training"),
        ctaIcon: <SlidersHorizontal size={16} />,
        ctaAction: () => setTrainingDrawer(true),
      };
    }
    if (pillar === "alimentacion") {
      if (foodSub === "nutricion") {
        return {
          crumbGroup: tr("Alimentación", "Nutrition"),
          crumbPage: tr("Registro hoy", "Today's log"),
          eyebrow: tr("CONTROL KETO DIARIO", "DAILY KETO TRACKING"),
          title: tr("Nutrición de hoy", "Today's nutrition"),
          subtitle: tr(
            "Controlá techo de carbohidratos, piso proteico y metas manuales.",
            "Track carb ceiling, protein floor, and custom daily targets."
          ),
          ctaLabel: tr("Registrar alimento", "Log food"),
          ctaIcon: <Plus size={16} />,
          ctaAction: () => {
            foodNameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            foodNameRef.current?.focus();
          },
        };
      }
      if (foodSub === "planificador") {
        return {
          crumbGroup: tr("Alimentación", "Nutrition"),
          crumbPage: tr("Planificador", "Planner"),
          eyebrow: tr("MENÚ SEMANAL CON MACROS EN VIVO", "WEEKLY MENU WITH LIVE MACROS"),
          title: tr("Planificador semanal", "Weekly meal planner"),
          subtitle: tr(
            "Ajustá recetas y porciones viendo el impacto diario de calorías y carbohidratos.",
            "Adjust recipes and servings while watching live daily calories and carbs."
          ),
          ctaLabel: tr("Asistente semanal", "Weekly assistant"),
          ctaIcon: <Sparkles size={16} />,
          ctaAction: () => setPlannerDrawer(true),
        };
      }
      if (foodSub === "compras") {
        return {
          crumbGroup: tr("Alimentación", "Nutrition"),
          crumbPage: tr("Compras", "Shopping"),
          eyebrow: tr("LISTA ACTIVA DEL PLAN", "ACTIVE PLAN LIST"),
          title: tr("Lista de compras", "Shopping list"),
          subtitle: tr(
            "Tachá ingredientes en el súper y copiá pendientes directo a tu tienda.",
            "Check off items as you shop and copy pending ingredients to your store."
          ),
          ctaLabel: tr("Descargar .txt", "Download .txt"),
          ctaIcon: <ArrowDownToLine size={16} />,
          ctaAction: () =>
            download(
              shoppingItems.map((i) => `${fmt(i.qty)} ${i.unit} ${i.name}`).join("\n"),
              `shopping-${planWeek}.txt`,
              "text/plain;charset=utf-8"
            ),
        };
      }
      return {
        crumbGroup: tr("Alimentación", "Nutrition"),
        crumbPage: tr("Recetario keto", "Keto recipes"),
        eyebrow: tr("CATÁLOGO DE RECETAS", "RECIPE CATALOG"),
        title: tr("Recetario keto", "Keto recipes"),
        subtitle: tr(
          "Porciones individuales con macros estimados y registro en un toque.",
          "Single-serving recipes with estimated macros and one-tap logging."
        ),
        ctaLabel: tr("Ver planificador", "Open planner"),
        ctaIcon: <CalendarDays size={16} />,
        ctaAction: () => setFoodSub("planificador"),
      };
    }
    if (pillar === "cuerpo") {
      if (bodySub === "evolucion") {
        return {
          crumbGroup: tr("Cuerpo y entorno", "Body & environment"),
          crumbPage: tr("Evolución", "Progress"),
          eyebrow: tr("SEGUIMIENTO CORPORAL", "BODY TRACKING"),
          title: tr("Mi evolución", "My progress"),
          subtitle: tr(
            "Seguí tendencia de peso y cintura a partir de tus registros reales.",
            "Follow weight and waist trends from your real measurements."
          ),
          ctaLabel: tr("Registrar medida", "Log measurement"),
          ctaIcon: <Plus size={16} />,
          ctaAction: () => {
            weightInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            weightInputRef.current?.focus();
          },
        };
      }
      if (bodySub === "ayuno") {
        return {
          crumbGroup: tr("Cuerpo y entorno", "Body & environment"),
          crumbPage: tr("Ayuno", "Fasting"),
          eyebrow: tr("HÁBITO PERSONAL", "PERSONAL HABIT"),
          title: tr("Ayuno intermitente", "Intermittent fasting"),
          subtitle: tr(
            "Temporizador continuo e historial personal sin prescripciones.",
            "Persistent fasting timer and personal log without prescriptions."
          ),
          ctaLabel: tr("Ver evolución", "View progress"),
          ctaIcon: <Activity size={16} />,
          ctaAction: () => setBodySub("evolucion"),
        };
      }
      return {
        crumbGroup: tr("Cuerpo y entorno", "Body & environment"),
        crumbPage: tr("Sol y Vitamina D", "Sun & Vitamin D"),
        eyebrow: tr("RADIACIÓN Y LABORATORIO", "UV & LAB RESULTS"),
        title: tr("Índice UV y Vitamina D", "UV Index & Vitamin D"),
        subtitle: tr(
          "Pronóstico meteorológico Open-Meteo conectado a la calculadora y tus análisis 25(OH)D.",
          "Open-Meteo UV forecast linked to the exploratory calculator and your 25(OH)D lab log."
        ),
        ctaLabel: tr("Ir a análisis 25(OH)D", "Jump to 25(OH)D labs"),
        ctaIcon: <Activity size={16} />,
        ctaAction: () => document.getElementById("vitamin-d-labs")?.scrollIntoView({ behavior: "smooth" }),
      };
    }
    if (pillar === "admin") {
      return {
        crumbGroup: tr("Sistema", "System"),
        crumbPage: tr("Administración", "Admin"),
        eyebrow: tr("PANEL RESERVADO", "RESTRICTED PANEL"),
        title: tr("Administración", "Administration"),
        subtitle: tr(
          "Cuentas registradas y roles. Los datos personales de cada usuario permanecen privados.",
          "Registered accounts and roles. Personal user records remain private."
        ),
        ctaLabel: tr("Volver a Hoy", "Back to Today"),
        ctaIcon: <LayoutDashboard size={16} />,
        ctaAction: () => navigate("hoy"),
      };
    }
    return {
      crumbGroup: tr("Sistema", "System"),
      crumbPage: tr("Ajustes y datos", "Settings & data"),
      eyebrow: tr("PERFIL Y PORTABILIDAD", "PROFILE & PORTABILITY"),
      title: tr("Ajustes y datos", "Settings & data"),
      subtitle: tr(
        "Idioma, preferencias de entrenamiento, alimentación, copias JSON y sesión.",
        "Language, training & nutrition preferences, JSON backups, and account."
      ),
      ctaLabel: tr("Exportar JSON", "Export JSON"),
      ctaIcon: <ArrowDownToLine size={16} />,
      ctaAction: () =>
        download(
          JSON.stringify({ app: "KetoFit", version: 1, exportedAt: new Date().toISOString(), data }, null, 2),
          `ketofit-${today}.json`
        ),
    };
  }, [pillar, trainSub, foodSub, bodySub, data, planWeek, shoppingItems, today, tr, fmt, phaseLabel]);

  if (loaded && !data.preferences.onboardingComplete) {
    return <Onboarding data={data} busy={syncing} error={error} onSave={save} name={account?.name ?? ""} />;
  }

  const carbTarget = data.targets.carbs;
  const carbRemaining = carbTarget > 0 ? carbTarget - totals.carbs : null;
  const dashboardMood: MascotMood =
    !isRestDay && scheduledRoutine.ex.length > 0 && completedTodayScheduled >= scheduledRoutine.ex.length
      ? "celebrate"
      : isRestDay
        ? "rest"
        : "train";

  const sessionTimeText = `${data.preferences.minutes} ${tr("minutos disponibles", "minutes available")}`;

  return (
    <div className="app">
      <SplashIntro forceShow={replaySplash} onDone={() => setReplaySplash(false)} />
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a className="brand" href="/">
          <span className="brand-icon">
            <Leaf size={22} />
          </span>
          Keto<span>Fit</span>
          <small>PERSONAL TRACKER</small>
        </a>

        <div className="nav-group">
          <div className="nav-caption">{tr("Diario", "Daily")}</div>
          <nav aria-label={tr("Navegación principal", "Main navigation")}>
            <button className={pillar === "hoy" ? "nav active" : "nav"} onClick={() => navigate("hoy")}>
              <LayoutDashboard size={18} />
              <span>{tr("Hoy", "Today")}</span>
              {pillar === "hoy" && <span className="nav-dot" />}
            </button>

            <button
              className={pillar === "entrenar" ? "nav active" : "nav"}
              onClick={() => navigate("entrenar", trainSub)}
            >
              <Dumbbell size={18} />
              <span>{tr("Entrenamiento", "Training")}</span>
              <span className="nav-badge">
                {tr("S", "W")}
                {data.week}
              </span>
            </button>

            <button
              className={pillar === "alimentacion" ? "nav active" : "nav"}
              onClick={() => navigate("alimentacion", foodSub)}
            >
              <Utensils size={18} />
              <span>{tr("Alimentación", "Nutrition")}</span>
              {pendingShoppingCount > 0 && <span className="nav-badge">{pendingShoppingCount}</span>}
            </button>

            <button
              className={pillar === "cuerpo" ? "nav active" : "nav"}
              onClick={() => navigate("cuerpo", bodySub)}
            >
              <Activity size={18} />
              <span>{tr("Cuerpo y entorno", "Body & sun")}</span>
              {data.fast && <span className="nav-dot" />}
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-utility">
            <button className={pillar === "ajustes" ? "nav active" : "nav"} onClick={() => navigate("ajustes")}>
              <Settings size={18} />
              <span>{tr("Ajustes y datos", "Settings & data")}</span>
            </button>
            {account?.role === "ADMIN" && (
              <button className={pillar === "admin" ? "nav active" : "nav"} onClick={() => navigate("admin")}>
                <Shield size={18} />
                <span>{tr("Administración", "Admin")}</span>
              </button>
            )}
          </div>

          <div className="profile-badge">
            <span>{account?.name.slice(0, 2).toUpperCase() ?? "YO"}</span>
            <div>
              <b>{account?.name ?? tr("Mi perfil", "My profile")}</b>
              <small>
                {tr("Nivel", "Level")} {experienceLabel(data.profile.experience).toLowerCase()}
              </small>
            </div>
            <button aria-label={tr("Editar perfil", "Edit profile")} onClick={() => navigate("ajustes")}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </aside>

      {mobile && <button className="scrim" aria-label={tr("Cerrar menú", "Close menu")} onClick={() => setMobile(false)} />}

      <main>
        <header>
          <div className="breadcrumb">
            <button className="mobile-toggle" aria-label={tr("Abrir menú", "Open menu")} onClick={() => setMobile(true)}>
              <Menu size={21} />
            </button>
            <span>{viewMeta.crumbGroup}</span>
            <ChevronRight size={14} />
            <b>{viewMeta.crumbPage}</b>
          </div>

          <div className="header-actions">
            {syncing && (
              <span className="sync-pill syncing" role="status">
                <Loader2 size={13} className="spin" /> {tr("Guardando…", "Saving…")}
              </span>
            )}
            <span className="date">{formattedHeaderDate}</span>
            <button className="icon-button" aria-label={tr("Cambiar tema", "Toggle theme")} onClick={() => setDark(!dark)}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="avatar">{account?.name.slice(0, 2).toUpperCase() ?? "YO"}</span>
          </div>
        </header>

        <div className="content">
          <div className="page-title">
            <div>
              <div className="eyebrow">{viewMeta.eyebrow}</div>
              <h1>{viewMeta.title}</h1>
              <p>{viewMeta.subtitle}</p>
            </div>
            <button type="button" className="primary" onClick={viewMeta.ctaAction}>
              {viewMeta.ctaIcon} {viewMeta.ctaLabel}
            </button>
          </div>

          {/* Domain Sub-Navigation Bars */}
          {pillar === "entrenar" && (
            <div className="subtabs" role="tablist" aria-label={tr("Secciones de entrenamiento", "Training sections")}>
              <button
                type="button"
                role="tab"
                aria-selected={trainSub === "rutina"}
                className={trainSub === "rutina" ? "active" : ""}
                onClick={() => setTrainSub("rutina")}
              >
                <Dumbbell size={15} /> {tr("Rutina", "Routine")}
                <span className="subtabs-count">
                  {completedInSession}/{activeRoutine.ex.length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={trainSub === "programa"}
                className={trainSub === "programa" ? "active" : ""}
                onClick={() => setTrainSub("programa")}
              >
                <CalendarDays size={15} /> {tr("Programa 8 sem.", "8-week program")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={trainSub === "historial"}
                className={trainSub === "historial" ? "active" : ""}
                onClick={() => setTrainSub("historial")}
              >
                <History size={15} /> {tr("Historial", "History")}
                {data.workouts.length > 0 && <span className="subtabs-count">{data.workouts.length}</span>}
              </button>
            </div>
          )}

          {pillar === "alimentacion" && (
            <div className="subtabs" role="tablist" aria-label={tr("Secciones de alimentación", "Nutrition sections")}>
              <button
                type="button"
                role="tab"
                aria-selected={foodSub === "nutricion"}
                className={foodSub === "nutricion" ? "active" : ""}
                onClick={() => setFoodSub("nutricion")}
              >
                <Flame size={15} /> {tr("Registro hoy", "Today's log")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={foodSub === "planificador"}
                className={foodSub === "planificador" ? "active" : ""}
                onClick={() => setFoodSub("planificador")}
              >
                <CalendarDays size={15} /> {tr("Planificador", "Planner")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={foodSub === "compras"}
                className={foodSub === "compras" ? "active" : ""}
                onClick={() => setFoodSub("compras")}
              >
                <ShoppingBasket size={15} /> {tr("Compras", "Shopping")}
                {pendingShoppingCount > 0 && <span className="subtabs-count">{pendingShoppingCount}</span>}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={foodSub === "recetario"}
                className={foodSub === "recetario" ? "active" : ""}
                onClick={() => setFoodSub("recetario")}
              >
                <Utensils size={15} /> {tr("Recetario keto", "Keto recipes")}
              </button>
            </div>
          )}

          {pillar === "cuerpo" && (
            <div className="subtabs" role="tablist" aria-label={tr("Secciones de cuerpo y entorno", "Body & environment sections")}>
              <button
                type="button"
                role="tab"
                aria-selected={bodySub === "evolucion"}
                className={bodySub === "evolucion" ? "active" : ""}
                onClick={() => setBodySub("evolucion")}
              >
                <Scale size={15} /> {tr("Evolución", "Progress")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={bodySub === "ayuno"}
                className={bodySub === "ayuno" ? "active" : ""}
                onClick={() => setBodySub("ayuno")}
              >
                <Timer size={15} /> {tr("Ayuno", "Fasting")}
                {data.fast && <span className="subtabs-count">{tr("Activo", "Active")}</span>}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={bodySub === "uv"}
                className={bodySub === "uv" ? "active" : ""}
                onClick={() => setBodySub("uv")}
              >
                <Sun size={15} /> {tr("Sol y Vit. D", "Sun & Vit. D")}
              </button>
            </div>
          )}

          {error && (
            <div role="alert" className="error">
              <span>{error}</span>
              <button type="button" onClick={() => location.reload()}>
                {tr("Recargar", "Reload")}
              </button>
            </div>
          )}

          {/* Only block workspace before initial load; never dim/block on optimistic mutations */}
          <fieldset disabled={!loaded} className="workspace">
            {/* ==================== TODAY (DASHBOARD) ==================== */}
            {pillar === "hoy" && (
              <>
                <section className="today-command">
                  <div className="today-command-main">
                    <div className="today-command-lead">
                      <Mascot
                        mood={dashboardMood}
                        size={86}
                        className="today-mascot"
                        label={
                          dashboardMood === "rest"
                            ? tr("Paltín descansando en tu día libre", "Paltín resting on your recovery day")
                            : dashboardMood === "celebrate"
                              ? tr("Paltín celebrando tu sesión completa", "Paltín celebrating your completed workout")
                              : tr("Paltín listo para entrenar", "Paltín ready to train")
                        }
                      />
                      <div>
                        <span className="pill">
                          <span className="dot" /> {tr("SEMANA", "WEEK")} {data.week} {tr("DE", "OF")} 8 ·{" "}
                          {phaseLabel(phases[data.week - 1])}
                        </span>
                        <h2>
                          {isRestDay
                            ? `${tr("Descanso", "Rest day")} · ${dayLabel(days[todayWeekday])}`
                            : routineName(scheduledRoutine.name)}
                          <br />
                          <em>
                            {isRestDay
                              ? `${tr("Próxima sesión", "Next session")}: ${dayLabel(scheduledRoutine.day)} · ${routineName(scheduledRoutine.name)}`
                              : completedTodayScheduled > 0
                                ? `${completedTodayScheduled} ${tr("de", "of")} ${scheduledRoutine.ex.length} ${tr("ejercicios cargados hoy", "exercises logged today")}`
                                : `${tr("Hoy", "Today")} (${dayLabel(days[todayWeekday])}) · ${sessionTimeText}`}
                          </em>
                        </h2>
                      </div>
                    </div>
                    <p className="today-command-sub">
                      {isRestDay
                        ? tr(
                            `Hoy no tenés sesión programada (${sessionTimeText} en tu próximo entrenamiento). Podés descansar o registrar actividad igual.`,
                            `No workout scheduled today (${sessionTimeText} on your next session). Rest up or log activity anytime.`
                          )
                        : `${goalLabel(data.profile.goal)}. ${
                            data.preferences.gym ? tr("Modo gimnasio", "Gym mode") : tr("Modo casa", "Home mode")
                          } · ${tr("Nivel", "Level")} ${experienceLabel(data.profile.experience).toLowerCase()}.`}
                    </p>
                    <div className="today-command-actions">
                      <button
                        type="button"
                        className="cmd-primary"
                        onClick={() => {
                          setDay(recommendedRoutineIdx);
                          navigate("entrenar", "rutina");
                        }}
                      >
                        <Dumbbell size={16} />{" "}
                        {isRestDay
                          ? tr(
                              `Ver sesión del ${dayLabel(scheduledRoutine.day).toLowerCase()}`,
                              `Preview ${dayLabel(scheduledRoutine.day)} session`
                            )
                          : completedTodayScheduled > 0
                            ? tr("Continuar sesión", "Continue session")
                            : tr("Iniciar entrenamiento", "Start workout")}{" "}
                        <ChevronRight size={16} />
                      </button>
                      <button type="button" className="cmd-ghost" onClick={() => navigate("alimentacion", "nutricion")}>
                        <Plus size={16} /> {tr("Cargar comida", "Log meal")}
                      </button>
                    </div>
                  </div>

                  <div className="today-signals">
                    <button
                      type="button"
                      className="signal-tile"
                      onClick={() => navigate("alimentacion", "nutricion")}
                    >
                      <span className="signal-icon">
                        <Flame size={17} />
                      </span>
                      <span className="signal-copy">
                        <small>{tr("Carbohidratos hoy", "Carbs today")}</small>
                        <strong className="tabular">
                          {fmt(totals.carbs)} g
                          {carbRemaining !== null
                            ? carbRemaining >= 0
                              ? ` · ${tr("Quedan", "Left")} ${fmt(carbRemaining)} g`
                              : ` · ${tr("Excedido", "Over by")} ${fmt(Math.abs(carbRemaining))} g`
                            : ` · ${tr("Sin techo definido", "No ceiling set")}`}
                        </strong>
                      </span>
                      <ChevronRight size={16} />
                    </button>

                    <button type="button" className="signal-tile" onClick={() => navigate("cuerpo", "ayuno")}>
                      <span className="signal-icon">
                        <Timer size={17} />
                      </span>
                      <span className="signal-copy">
                        <small>{tr("Ayuno intermitente", "Intermittent fasting")}</small>
                        <strong className="tabular">
                          {data.fast ? `${timer} / ${data.fast.hours} h` : tr("Sin ayuno activo", "Not fasting")}
                        </strong>
                      </span>
                      <ChevronRight size={16} />
                    </button>

                    <button type="button" className="signal-tile" onClick={() => navigate("cuerpo", "uv")}>
                      <span className="signal-icon">
                        <Sun size={17} />
                      </span>
                      <span className="signal-copy">
                        <small>{tr("Índice UV y Vitamina D", "UV Index & Vitamin D")}</small>
                        <strong className="tabular">
                          {currentUV !== null
                            ? `UV ${fmt(currentUV)} ${tr("consultado", "checked")}`
                            : tr("Consultar radiación en tu zona", "Check local UV forecast")}
                        </strong>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </section>

                <div className="stats">
                  <Stat
                    label={tr("PESO ACTUAL", "CURRENT WEIGHT")}
                    value={fmt(weight)}
                    unit="kg"
                    icon={<Scale size={18} />}
                    note={
                      latest
                        ? `${tr("Registro del", "Logged")} ${shortDate(latest.date)}`
                        : tr("Peso inicial registrado", "Starting weight")
                    }
                  />
                  <Stat
                    label={tr("ENERGÍA DE HOY", "TODAY'S ENERGY")}
                    value={fmt(totals.kcal)}
                    unit="kcal"
                    icon={<Flame size={18} />}
                    note={
                      data.targets.kcal
                        ? `${tr("Meta", "Target")}: ${fmt(data.targets.kcal)} kcal`
                        : tr("Sin meta configurada", "No target set")
                    }
                    status={
                      data.targets.kcal > 0
                        ? totals.kcal > data.targets.kcal
                          ? { tone: "warn", text: `+${fmt(totals.kcal - data.targets.kcal)} kcal` }
                          : { tone: "ok", text: `${tr("Restan", "Left")} ${fmt(data.targets.kcal - totals.kcal)} kcal` }
                        : undefined
                    }
                  />
                  <Stat
                    label={tr("ENTRENAMIENTOS", "WORKOUTS")}
                    value={String(new Set(data.workouts.map((w) => w.date)).size)}
                    unit={tr("días", "days")}
                    icon={<Dumbbell size={18} />}
                    note={`${data.workouts.length} ${tr("ejercicios registrados", "logged exercises")}`}
                  />
                  <Stat
                    label={tr("COMPRAS PENDIENTES", "PENDING GROCERIES")}
                    value={String(pendingShoppingCount)}
                    unit={tr("ítems", "items")}
                    icon={<ShoppingBasket size={18} />}
                    note={
                      shoppingItems.length
                        ? `${tr("Semana del", "Week of")} ${shortDate(planWeek)}`
                        : tr("Generá un plan semanal", "Create a weekly plan")
                    }
                  />
                </div>

                <div className="dashboard-grid">
                  <section className="card">
                    <Section
                      title={tr("Nutrición de hoy", "Today's nutrition")}
                      label={tr("SEMÁNTICA KETO", "KETO THRESHOLDS")}
                      action={
                        data.targets.carbs || data.targets.protein
                          ? tr("Registrar", "Log food")
                          : tr("Definir metas", "Set targets")
                      }
                      onClick={() => navigate("alimentacion", "nutricion")}
                    />
                    <MacroProgressBars totals={totals} targets={data.targets} />
                    <p className="muted small" style={{ margin: 0 }}>
                      {tr(
                        `Valores sumados de tus alimentos registrados hoy (${todayFoods.length} registros).`,
                        `Summed from your food entries logged today (${todayFoods.length} entries).`
                      )}
                    </p>
                  </section>

                  <section className="card">
                    <Section
                      title={isRestDay ? tr("Tu próxima sesión", "Your next session") : tr("Tu sesión de hoy", "Today's session")}
                      label={
                        isRestDay
                          ? `${tr("PRÓXIMO", "UP NEXT")} · ${dayLabel(scheduledRoutine.day).toUpperCase()}`
                          : `${tr("HOY", "TODAY")} · ${dayLabel(days[todayWeekday]).toUpperCase()}`
                      }
                      action={tr("Abrir sesión", "Open session")}
                      onClick={() => {
                        setDay(recommendedRoutineIdx);
                        navigate("entrenar", "rutina");
                      }}
                    />
                    <div className="workout-preview">
                      <div className="workout-symbol">
                        <Dumbbell size={30} />
                      </div>
                      <div>
                        <span className="tag">
                          {tr("SEMANA", "WEEK")} {data.week} · {scheduledRoutine.ex.length} {tr("ejercicios", "exercises")}
                        </span>
                        <h3>{routineName(scheduledRoutine.name)}</h3>
                        <p>
                          {dayLabel(scheduledRoutine.day)} · {sessionTimeText}
                        </p>
                      </div>
                    </div>
                    <div className="session-footer">
                      <span>
                        {!isRestDay && completedTodayScheduled > 0
                          ? `${completedTodayScheduled}/${scheduledRoutine.ex.length} ${tr("completados hoy", "completed today")}`
                          : tr("Adaptá las cargas dejando 2–3 reps en reserva", "Choose loads leaving 2–3 reps in reserve")}
                      </span>
                      <span className="green">
                        {tr("Nivel", "Level")} {experienceLabel(data.profile.experience).toLowerCase()}
                      </span>
                    </div>
                  </section>

                  <section className="card">
                    <Section
                      title={tr("Tu evolución", "Your progress")}
                      label={tr("PESO CORPORAL", "BODY WEIGHT")}
                      action={tr("Ver detalle", "View details")}
                      onClick={() => navigate("cuerpo", "evolucion")}
                    />
                    <EvolutionChart entries={measurements} />
                  </section>

                  <section className="card">
                    <Section
                      title={tr("Algo rico para hoy", "Meal inspiration")}
                      label={tr("INSPIRACIÓN KETO", "KETO IDEA")}
                      action={tr("Ver recetario", "Browse recipes")}
                      onClick={() => navigate("alimentacion", "recetario")}
                    />
                    <button
                      type="button"
                      className="feature-image"
                      onClick={() => setRecipe(recipes[1])}
                      style={{
                        backgroundImage: `linear-gradient(0deg,rgba(12,26,21,.82) 10%,rgba(12,26,21,.15) 70%),url(https://images.unsplash.com/${recipes[1].photo}?auto=format&fit=crop&w=800&q=80)`,
                      }}
                    >
                      <span className="photo-caption">
                        <span>
                          {tr("FRESCO", "FRESH")} · {recipes[1].carbs} g {tr("CARB", "CARBS")} · {recipes[1].protein} g{" "}
                          {tr("PROT", "PROTEIN")}
                        </span>
                        <b>{recipeName(recipes[1])}</b>
                        <small>
                          {recipes[1].minutes} min · 1 {tr("porción", "serving")} · {tr("Ver preparación →", "View recipe →")}
                        </small>
                      </span>
                    </button>
                  </section>
                </div>
              </>
            )}

            {/* ==================== TRAINING ==================== */}
            {pillar === "entrenar" && trainSub === "rutina" && (
              <>
                <div className="day-tabs">
                  {routines.map((r, i) => (
                    <button
                      type="button"
                      className={day === i ? "selected" : ""}
                      onClick={() => setDay(i)}
                      key={r.day}
                    >
                      {dayLabel(r.day)}
                      <small>{sessionTimeText}</small>
                    </button>
                  ))}
                </div>

                <section className="card">
                  <Section
                    title={routineName(activeRoutine.name)}
                    label={`${tr("SEMANA", "WEEK")} ${data.week} · ${phaseLabel(phases[data.week - 1])}${
                      activeRoutine.isCustom ? ` · ${tr("PERSONALIZADA", "CUSTOM")}` : ""
                    }`}
                    action={tr("Cambiar rutina y días", "Edit routine & days")}
                    onClick={() => setTrainingDrawer(true)}
                  />

                  <div className="session-bar">
                    <div className="session-bar-meta">
                      <span className="session-progress-pill tabular">
                        <Check size={14} /> {completedInSession} {tr("de", "of")} {activeRoutine.ex.length}{" "}
                        {tr("registrados el", "logged on")} {shortDate(sessionDate)}
                      </span>
                      <span className="small muted">
                        {data.preferences.gym
                          ? tr(
                              "Entrenamiento en gimnasio. Calentá 5–10 min y dejá 2–3 reps en reserva.",
                              "Gym workout. Warm up 5–10 min and leave 2–3 reps in reserve."
                            )
                          : tr(
                              "Entrenamiento en casa sin máquinas. Usá superficie despejada y apoyos firmes.",
                              "Home bodyweight workout. Use a clear floor area and stable supports."
                            )}
                      </span>
                    </div>
                    <label>
                      {tr("Fecha de sesión", "Session date")}
                      <input
                        aria-label={tr("Fecha de la sesión", "Session date")}
                        type="date"
                        value={sessionDate}
                        onChange={(e) => {
                          if (e.target.value) setSessionDate(e.target.value);
                        }}
                      />
                    </label>
                  </div>

                  <div className="exercise-list">
                    {activeRoutine.ex.map((ex, i) => {
                      const guide = prescription(ex, data.profile.experience, data.week);
                      const lastMark = lastWorkoutByExercise[ex] ?? null;
                      const loggedToday = sessionWorkouts.filter((w) => w.exercise === ex);
                      const historyCount = data.workouts.filter((w) => w.exercise === ex).length;
                      return (
                        <ExerciseCard
                          key={`${activeRoutine.day}-${ex}-${lastMark?.id ?? "none"}`}
                          index={i + 1}
                          exercise={ex}
                          guide={guide}
                          lastMark={lastMark}
                          loggedToday={loggedToday}
                          historyCount={historyCount}
                          onOpenHistory={() => {
                            setHistoryExercise(ex);
                            setTrainSub("historial");
                          }}
                          onLog={(sets, reps, load) =>
                            save(
                              {
                                ...data,
                                workouts: [
                                  ...data.workouts,
                                  {
                                    id: uid(),
                                    date: sessionDate,
                                    exercise: ex,
                                    sets,
                                    reps,
                                    load,
                                    week: data.week,
                                  },
                                ],
                              },
                              {
                                toast: `${exerciseName(ex)} ${tr("registrado", "logged")} (${sets}×${reps} · ${fmt(
                                  load
                                )} kg).`,
                              }
                            )
                          }
                        />
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {pillar === "entrenar" && trainSub === "programa" && (
              <>
                <section className="card intro">
                  <h2>{tr("Ocho semanas para construir constancia", "Eight weeks to build consistency")}</h2>
                  <p>
                    {tr(
                      "La distribución respeta tus horarios. Es una propuesta general ajustable con un entrenador según tu recuperación y técnica. No aumenta cargas automáticamente.",
                      "The split respects your schedule. It's a general framework you can adapt with a coach based on recovery and technique. Loads never increase automatically."
                    )}
                  </p>
                </section>
                <div className="week-grid">
                  {phases.map((phase, i) => (
                    <section className={`card week-card ${data.week === i + 1 ? "current" : ""}`} key={phase}>
                      <span className="eyebrow">
                        {tr("SEMANA", "WEEK")} {i + 1}
                      </span>
                      <h3>{phaseLabel(phase)}</h3>
                      <p>
                        {i === 4
                          ? tr(
                              "Reducí el volumen y priorizá la recuperación.",
                              "Reduce training volume and prioritize recovery."
                            )
                          : i === 7
                            ? tr(
                                "Compará registros, técnica y sensaciones para planificar el próximo ciclo.",
                                "Review your logs, technique, and energy to plan the next cycle."
                              )
                            : tr(
                                "Completá las sesiones con buena técnica. Si dominás el rango, evaluá un pequeño aumento de carga.",
                                "Complete sessions with clean form. Once comfortable across the rep range, consider a small load increase."
                              )}
                      </p>
                      <button
                        type="button"
                        className={data.week === i + 1 ? "primary" : "secondary"}
                        onClick={() =>
                          save(
                            { ...data, week: i + 1 },
                            { toast: `${tr("Semana activa", "Active week")}: ${i + 1} (${phaseLabel(phase)}).` }
                          )
                        }
                      >
                        {data.week === i + 1
                          ? tr("Semana actual", "Current week")
                          : tr("Seleccionar semana", "Select week")}
                      </button>
                    </section>
                  ))}
                </div>
              </>
            )}

            {pillar === "entrenar" && trainSub === "historial" && (
              <WorkoutHistory
                workouts={data.workouts}
                exercise={historyExercise}
                onExercise={setHistoryExercise}
                update={(updated) =>
                  save(
                    {
                      ...data,
                      workouts: data.workouts.map((w) => (w.id === updated.id ? updated : w)),
                    },
                    { toast: `${exerciseName(updated.exercise)} ${tr("actualizado", "updated")}.` }
                  )
                }
                remove={(id) =>
                  save(
                    { ...data, workouts: data.workouts.filter((w) => w.id !== id) },
                    { undoLabel: tr("Registro de entrenamiento eliminado.", "Workout entry deleted.") }
                  )
                }
              />
            )}

            {/* ==================== NUTRITION & MEALS ==================== */}
            {pillar === "alimentacion" && foodSub === "nutricion" && (
              <>
                <div className="stats">
                  {(
                    [
                      ["kcal", tr("CALORÍAS", "CALORIES"), "kcal", "range"],
                      ["carbs", tr("CARBOHIDRATOS", "CARBS"), "g", "ceiling"],
                      ["protein", tr("PROTEÍNAS", "PROTEIN"), "g", "floor"],
                      ["fat", tr("GRASAS", "FAT"), "g", "range"],
                    ] as const
                  ).map(([key, label, unit, mode]) => {
                    const val = totals[key];
                    const target = data.targets[key];
                    let status: { tone: "ok" | "warn" | "over"; text: string } | undefined;
                    if (target > 0) {
                      if (mode === "ceiling") {
                        status =
                          val > target
                            ? { tone: "over", text: `${tr("Excedido", "Over")} +${fmt(val - target)} ${unit}` }
                            : val >= target * 0.85
                              ? { tone: "warn", text: `${tr("Quedan", "Left")} ${fmt(target - val)} ${unit}` }
                              : { tone: "ok", text: `${tr("Quedan", "Left")} ${fmt(target - val)} ${unit}` };
                      } else if (mode === "floor") {
                        status =
                          val >= target
                            ? { tone: "ok", text: tr("Piso cumplido", "Target met") }
                            : { tone: "warn", text: `${tr("Faltan", "Need")} ${fmt(target - val)} ${unit}` };
                      } else {
                        status =
                          val > target * 1.05
                            ? { tone: "warn", text: `+${fmt(val - target)} ${unit}` }
                            : { tone: "ok", text: `${tr("Restan", "Left")} ${fmt(Math.max(0, target - val))} ${unit}` };
                      }
                    }
                    return (
                      <Stat
                        key={key}
                        label={label}
                        value={fmt(val)}
                        unit={unit}
                        icon={<Flame size={17} />}
                        note={
                          target ? `${tr("Meta", "Target")}: ${fmt(target)} ${unit}` : tr("Sin meta configurada", "No target set")
                        }
                        status={status}
                      />
                    );
                  })}
                </div>

                <section className="card">
                  <h2>{tr("Registrar alimento", "Log food")}</h2>
                  <form
                    className="form-grid"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const f = new FormData(form);
                      const foodName = String(f.get("name"));
                      save(
                        {
                          ...data,
                          foods: [
                            ...data.foods,
                            {
                              id: uid(),
                              date: String(f.get("date")),
                              name: foodName,
                              kcal: num(f, "kcal"),
                              protein: num(f, "protein"),
                              fat: num(f, "fat"),
                              carbs: num(f, "carbs"),
                            },
                          ],
                        },
                        { toast: `${foodName} ${tr("guardado", "saved")}.` }
                      );
                      form.reset();
                    }}
                  >
                    <label>
                      {tr("Fecha", "Date")}
                      <input name="date" type="date" defaultValue={today} required />
                    </label>
                    <label>
                      {tr("Alimento y porción", "Food & serving")}
                      <input
                        ref={foodNameRef}
                        name="name"
                        placeholder={tr("Ej. 150 g de yogur", "e.g. 150 g Greek yogurt")}
                        maxLength={150}
                        required
                      />
                    </label>
                    {[
                      ["kcal", tr("Calorías (kcal)", "Calories (kcal)")],
                      ["protein", tr("Proteínas (g)", "Protein (g)")],
                      ["fat", tr("Grasas (g)", "Fat (g)")],
                      ["carbs", tr("Carbohidratos totales (g)", "Total carbs (g)")],
                    ].map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          name={key}
                          type="number"
                          step="0.1"
                          min="0"
                          max={key === "kcal" ? 10000 : 1000}
                          required
                        />
                      </label>
                    ))}
                    <button className="primary">
                      <Plus size={16} /> {tr("Guardar alimento", "Save food")}
                    </button>
                  </form>
                  <p className="muted small" style={{ margin: 0 }}>
                    {tr(
                      "Ingresá los valores de la etiqueta o una fuente nutricional que uses.",
                      "Enter values from your nutrition label or preferred database."
                    )}
                  </p>
                </section>

                <section className="card">
                  <Section
                    title={tr("Mis metas y alimentación", "My targets & diet")}
                    label={`${
                      data.preferences.diet === "vegetariana"
                        ? tr("VEGETARIANA", "VEGETARIAN")
                        : tr("KETO VARIADA", "VARIED KETO")
                    } · ${tr("HASTA", "UP TO")} ${data.preferences.maxMinutes} MIN`}
                    action={tr("Cambiar alimentación", "Edit diet")}
                    onClick={() => setFoodDrawer(true)}
                  />
                  <p className="muted small">
                    {tr(
                      "Configuración manual (0 = sin meta). En keto, Carbohidratos funciona como techo y Proteínas como piso objetivo. Tu metabolismo basal no equivale al gasto total diario.",
                      "Manual setup (0 = no target). In keto, Carbs acts as a ceiling and Protein as a floor target. Recorded BMR does not equal total daily expenditure."
                    )}
                  </p>
                  <form
                    className="form-grid"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      save(
                        {
                          ...data,
                          targets: {
                            kcal: num(f, "kcal"),
                            protein: num(f, "protein"),
                            fat: num(f, "fat"),
                            carbs: num(f, "carbs"),
                          },
                        },
                        { toast: tr("Metas diarias actualizadas.", "Daily targets updated.") }
                      );
                    }}
                  >
                    {[
                      ["kcal", tr("Calorías · kcal", "Calories · kcal")],
                      ["protein", tr("Proteínas (piso) · g", "Protein (floor) · g")],
                      ["fat", tr("Grasas · g", "Fat · g")],
                      ["carbs", tr("Carbohidratos (techo) · g", "Carbs (ceiling) · g")],
                    ].map(([k, l]) => (
                      <label key={k}>
                        {l}
                        <input
                          name={k}
                          type="number"
                          min="0"
                          max={k === "kcal" ? 10000 : 1000}
                          step="0.1"
                          defaultValue={data.targets[k as keyof State["targets"]]}
                          required
                        />
                      </label>
                    ))}
                    <button className="secondary">{tr("Guardar metas", "Save targets")}</button>
                  </form>
                </section>

                <Records
                  title={tr("Alimentos registrados", "Logged foods")}
                  rows={[...data.foods].reverse().map((f) => ({
                    id: f.id,
                    text: `${f.date} · ${f.name} · ${f.kcal} kcal · P ${f.protein} / ${tr("G", "F")} ${f.fat} / C ${f.carbs} g`,
                  }))}
                  edit={(id) => {
                    const found = data.foods.find((f) => f.id === id);
                    if (found) setEditingFood(found);
                  }}
                  remove={(id) =>
                    save(
                      { ...data, foods: data.foods.filter((f) => f.id !== id) },
                      { undoLabel: tr("Alimento eliminado.", "Food entry deleted.") }
                    )
                  }
                />
              </>
            )}

            {pillar === "alimentacion" && (foodSub === "planificador" || foodSub === "compras") && (
              <div className="toolbar">
                <label>
                  {tr("Semana del lunes", "Week starting Monday")}
                  <input
                    type="date"
                    value={planWeek}
                    onChange={(e) => {
                      if (e.target.value) setPlanWeek(monday(new Date(e.target.value + "T12:00:00")));
                    }}
                  />
                </label>
                {foodSub === "planificador" ? (
                  <div className="button-row">
                    <button type="button" className="secondary" onClick={() => setFoodDrawer(true)}>
                      <SlidersHorizontal size={15} /> {tr("Cambiar alimentación", "Edit diet")}
                    </button>
                    <button type="button" className="secondary" onClick={() => setFoodSub("compras")}>
                      <ShoppingBasket size={15} /> {tr("Compras", "Shopping")} ({pendingShoppingCount})
                    </button>
                    <button type="button" className="primary" onClick={() => setPlannerDrawer(true)}>
                      <Sparkles size={15} /> {tr("Generar con asistente / IA", "Generate with Assistant / AI")}
                    </button>
                  </div>
                ) : (
                  <p className="muted">
                    {tr(
                      `Calculada automáticamente desde tu Planificador para la semana del ${planWeek}.`,
                      `Automatically calculated from your Planner for the week of ${planWeek}.`
                    )}
                  </p>
                )}
              </div>
            )}

            {pillar === "alimentacion" && foodSub === "planificador" && (
              <div className="planner">
                {days.map((d, i) => {
                  const dayTotals = meals.reduce(
                    (acc, m) => {
                      const item = data.plan[`${planWeek}|${i}|${m}`];
                      if (!item) return acc;
                      const rec = recipes.find((r) => r.id === item.recipe);
                      if (!rec) return acc;
                      return {
                        kcal: acc.kcal + rec.kcal * item.servings,
                        protein: acc.protein + rec.protein * item.servings,
                        carbs: acc.carbs + rec.carbs * item.servings,
                        count: acc.count + 1,
                      };
                    },
                    { kcal: 0, protein: 0, carbs: 0, count: 0 }
                  );
                  const carbOver = data.targets.carbs > 0 && dayTotals.carbs > data.targets.carbs;

                  return (
                    <section className="card planner-day" key={d}>
                      <div className="planner-day-head">
                        <h3>{dayLabel(d)}</h3>
                        <span className="small muted tabular">
                          {dayTotals.count}/4 {tr("comidas", "meals")}
                        </span>
                      </div>

                      {meals.map((m) => {
                        const key = `${planWeek}|${i}|${m}`;
                        const item = data.plan[key];
                        return (
                          <div className="meal-slot" key={m}>
                            <label>
                              {mealLabel(m)}
                              <select
                                value={item?.recipe ?? ""}
                                onChange={(e) => {
                                  const plan = { ...data.plan };
                                  if (e.target.value) plan[key] = { recipe: e.target.value, servings: item?.servings ?? 1 };
                                  else delete plan[key];
                                  save({ ...data, plan });
                                }}
                              >
                                <option value="">{tr("Sin planificar", "Unplanned")}</option>
                                {recipes.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {recipeName(r)} ({r.carbs} g C)
                                  </option>
                                ))}
                              </select>
                            </label>
                            {item && (
                              <label>
                                {tr("Porciones", "Servings")}
                                <input
                                  type="number"
                                  min="0.5"
                                  max="20"
                                  step="0.5"
                                  value={item.servings}
                                  onChange={(e) => {
                                    const n = Number(e.target.value);
                                    if (n >= 0.5 && n <= 20) {
                                      save({ ...data, plan: { ...data.plan, [key]: { ...item, servings: n } } });
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}

                      <div className="day-macros">
                        <span>{tr("Estimado del día", "Daily estimate")}</span>
                        {dayTotals.count > 0 ? (
                          <div className="day-macros-pills">
                            <span className="day-macro-pill">{Math.round(dayTotals.kcal)} kcal</span>
                            <span className={`day-macro-pill ${carbOver ? "over" : "ok"}`}>
                              {fmt(dayTotals.carbs)} g C
                            </span>
                            <span className="day-macro-pill">{fmt(dayTotals.protein)} g P</span>
                          </div>
                        ) : (
                          <span>{tr("Sin comidas", "No meals")}</span>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {pillar === "alimentacion" && foodSub === "compras" && (
              <section className="card">
                <Supermarkets
                  config={data.shopping}
                  onConfigSave={(s) => save({ ...data, shopping: s }, { toast: tr("Tiendas guardadas.", "Stores saved.") })}
                  items={shoppingItems}
                  week={planWeek}
                  checked={data.checked}
                  onToggle={(key) =>
                    save({
                      ...data,
                      checked: data.checked.includes(key)
                        ? data.checked.filter((c) => c !== key)
                        : [...data.checked, key],
                    })
                  }
                  onNotify={(msg) => pushToast(msg)}
                />
              </section>
            )}

            {pillar === "alimentacion" && foodSub === "recetario" && (
              <>
                <div className="toolbar">
                  <input
                    aria-label={tr("Buscar receta", "Search recipe")}
                    placeholder={tr("Buscar receta o ingrediente…", "Search recipe or ingredient…")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <span className="muted">{tr("Porciones individuales · Valores estimados", "Single servings · Estimated values")}</span>
                </div>
                <div className="recipe-grid">
                  {recipes
                    .filter((r) =>
                      (r.name + " " + recipeName(r) + " " + r.ingredients.map((i) => i.name).join(" "))
                        .toLowerCase()
                        .includes(search.toLowerCase())
                    )
                    .map((r) => (
                      <button type="button" className="card recipe-card" key={r.id} onClick={() => setRecipe(r)}>
                        <img
                          src={`https://images.unsplash.com/${r.photo}?auto=format&fit=crop&w=700&q=80`}
                          alt={recipeName(r)}
                        />
                        <div>
                          <span className="tag">
                            {mealLabel(r.tag)} · {r.minutes} min
                          </span>
                          <h3>{recipeName(r)}</h3>
                          <p className="tabular">
                            {r.kcal} kcal · {r.carbs} g {tr("carb", "carbs")} · {r.protein} g {tr("prot", "protein")}
                          </p>
                          <span className="green">{tr("Ver preparación →", "View recipe →")}</span>
                        </div>
                      </button>
                    ))}
                </div>
                <p className="muted small">
                  {tr(
                    "Fotografías ilustrativas de Unsplash. Macros estimados por porción: varían según marcas, ingredientes y preparación. No son mediciones médicas.",
                    "Illustrative photos from Unsplash. Estimated macros per serving vary by brand and preparation; not clinical measurements."
                  )}
                </p>
              </>
            )}

            {/* ==================== BODY & ENVIRONMENT ==================== */}
            {pillar === "cuerpo" && bodySub === "evolucion" && (
              <>
                <section className="card">
                  <h2>{tr("Registrar medidas", "Log measurements")}</h2>
                  <form
                    className="form-grid"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const f = new FormData(form);
                      save(
                        {
                          ...data,
                          measurements: [
                            ...data.measurements,
                            {
                              id: uid(),
                              date: String(f.get("date")),
                              weight: num(f, "weight"),
                              waist: f.get("waist") ? num(f, "waist") : null,
                            },
                          ],
                        },
                        { toast: tr("Medida registrada.", "Measurement saved.") }
                      );
                      form.reset();
                    }}
                  >
                    <label>
                      {tr("Fecha", "Date")}
                      <input name="date" type="date" defaultValue={today} required />
                    </label>
                    <label>
                      {tr("Peso (kg)", "Weight (kg)")}
                      <input
                        ref={weightInputRef}
                        name="weight"
                        type="number"
                        min="20"
                        max="400"
                        step="0.1"
                        placeholder={tr("Tu peso actual", "Current weight")}
                        required
                      />
                    </label>
                    <label>
                      {tr("Cintura (cm, opcional)", "Waist (cm, optional)")}
                      <input name="waist" type="number" min="20" max="300" step="0.1" />
                    </label>
                    <button className="primary">{tr("Guardar registro", "Save entry")}</button>
                  </form>
                </section>
                <div className="two-cols">
                  <section className="card">
                    <h2>{tr("Peso · kg", "Weight · kg")}</h2>
                    <EvolutionChart entries={measurements} />
                  </section>
                  <section className="card">
                    <h2>{tr("Cintura · cm", "Waist · cm")}</h2>
                    <EvolutionChart entries={measurements.filter((m) => m.waist !== null)} metric="waist" />
                  </section>
                </div>
                <Records
                  title={tr("Mis registros", "My entries")}
                  rows={[...measurements].reverse().map((m) => ({
                    id: m.id,
                    text: `${m.date} · ${fmt(m.weight)} kg${
                      m.waist !== null ? ` · ${tr("Cintura", "Waist")}: ${fmt(m.waist)} cm` : ""
                    }`,
                  }))}
                  remove={(id) =>
                    save(
                      { ...data, measurements: data.measurements.filter((m) => m.id !== id) },
                      { undoLabel: tr("Registro corporal eliminado.", "Measurement deleted.") }
                    )
                  }
                />
              </>
            )}

            {pillar === "cuerpo" && bodySub === "ayuno" && (
              <>
                <section className="card fasting">
                  <span className="eyebrow">{tr("UN HÁBITO A TU RITMO", "A HABIT AT YOUR PACE")}</span>
                  <h2>{data.fast ? tr("Ayuno en curso", "Fasting in progress") : tr("Tu temporizador de ayuno", "Your fasting timer")}</h2>
                  <div
                    className="timer-ring"
                    style={{
                      background: `conic-gradient(var(--accent) ${
                        data.fast ? Math.min(100, (elapsed / (data.fast.hours * 3600000)) * 100) : 0
                      }%, var(--line) 0)`,
                    }}
                  >
                    <div>
                      <Timer size={26} />
                      <strong>{data.fast ? timer : "00:00:00"}</strong>
                      <span>
                        {data.fast
                          ? tr(`de ${data.fast.hours} horas elegidas`, `of ${data.fast.hours} hours chosen`)
                          : tr("Sin ayuno activo", "No active fast")}
                      </span>
                    </div>
                  </div>
                  {data.fast ? (
                    <>
                      <p>
                        {tr("Inicio", "Started")}: {new Date(data.fast.start).toLocaleString(locale)}
                      </p>
                      <p>
                        {elapsed >= data.fast.hours * 3600000
                          ? tr("Se cumplió el tiempo que elegiste.", "You reached your chosen duration.")
                          : tr(
                              "El temporizador continúa aunque cierres la aplicación.",
                              "The timer keeps running even if you close the app."
                            )}
                      </p>
                      <button
                        type="button"
                        className="primary"
                        onClick={() =>
                          save(
                            {
                              ...data,
                              fast: null,
                              fastHistory: [...data.fastHistory, { start: data.fast!.start, end: new Date().toISOString() }],
                            },
                            { toast: tr("Ayuno guardado en tu historial.", "Fast saved to history.") }
                          )
                        }
                      >
                        {tr("Finalizar y guardar", "End and save")}
                      </button>
                    </>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        save(
                          { ...data, fast: { start: new Date().toISOString(), hours: num(f, "hours") } },
                          { toast: tr("Temporizador de ayuno iniciado.", "Fasting timer started.") }
                        );
                      }}
                    >
                      <label>
                        {tr("Duración elegida (horas)", "Chosen duration (hours)")}
                        <input name="hours" type="number" min="1" max="24" defaultValue="12" required />
                      </label>
                      <button className="primary">{tr("Iniciar temporizador", "Start timer")}</button>
                    </form>
                  )}
                  <p className="muted">
                    {tr(
                      "La duración es una elección personal. El temporizador no prescribe ayunos ni evalúa tu salud.",
                      "Duration is a personal choice. This timer does not prescribe fasting or evaluate health."
                    )}
                  </p>
                </section>
                <Records
                  title={tr("Historial de ayunos", "Fasting history")}
                  rows={data.fastHistory.map((f, i) => ({
                    id: String(i),
                    text: `${new Date(f.start).toLocaleString(locale)} · ${fmt(
                      (new Date(f.end).getTime() - new Date(f.start).getTime()) / 3600000
                    )} ${tr("horas", "hours")}`,
                  }))}
                  remove={(id) =>
                    save(
                      { ...data, fastHistory: data.fastHistory.filter((_, i) => String(i) !== id) },
                      { undoLabel: tr("Registro de ayuno eliminado.", "Fasting entry deleted.") }
                    )
                  }
                />
              </>
            )}

            {pillar === "cuerpo" && bodySub === "uv" && (
              <>
                <UVPanel onCurrentUV={setCurrentUV} />
                <VitaminDPanel
                  data={data.vitaminD}
                  currentUV={currentUV}
                  onSave={(vitaminD) =>
                    save({ ...data, vitaminD }, { toast: tr("Análisis 25(OH)D guardado.", "25(OH)D lab result saved.") })
                  }
                  onDeleteLab={(id) =>
                    save(
                      { ...data, vitaminD: { labs: data.vitaminD.labs.filter((x) => x.id !== id) } },
                      { undoLabel: tr("Análisis de 25(OH)D eliminado.", "25(OH)D lab result deleted.") }
                    )
                  }
                />
              </>
            )}

            {/* ==================== SETTINGS & ADMIN ==================== */}
            {pillar === "ajustes" && (
              <>
                <section className="card">
                  <h2>{tr("Idioma de la aplicación", "Application language")}</h2>
                  <p className="muted small">
                    {tr(
                      "De forma predeterminada sigue el idioma configurado en tu navegador.",
                      "Follows your browser's language preference by default."
                    )}
                  </p>
                  <div className="form-grid" style={{ maxWidth: 380 }}>
                    <label>
                      {tr("Idioma", "Language")}
                      <select value={langPref} onChange={(e) => setLangPref(e.target.value as LangPref)}>
                        <option value="auto">
                          {tr(
                            `Automático (navegador · ${lang === "en" ? "Inglés" : "Español"})`,
                            `Auto (browser · ${lang === "en" ? "English" : "Spanish"})`
                          )}
                        </option>
                        <option value="es">Español</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                  </div>
                </section>

                <PreferencesEditor
                  data={data}
                  onSave={async (next) => {
                    setDay(0);
                    await save(next, { toast: tr("Preferencias guardadas.", "Preferences saved.") });
                  }}
                />
                <section className="card">
                  <h2>{tr("Tu punto de partida", "Your starting point")}</h2>
                  <form
                    className="form-grid"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      save(
                        {
                          ...data,
                          profile: {
                            ...data.profile,
                            weight: num(f, "weight"),
                            height: num(f, "height"),
                            bmr: f.get("bmr") ? num(f, "bmr") : null,
                            goal: String(f.get("goal")),
                            experience: String(f.get("experience")),
                          },
                        },
                        { toast: tr("Perfil actualizado.", "Profile updated.") }
                      );
                    }}
                  >
                    {[
                      ["weight", tr("Peso inicial · kg", "Starting weight · kg")],
                      ["height", tr("Altura · cm", "Height · cm")],
                      ["bmr", tr("Metabolismo basal registrado · kcal", "Recorded BMR · kcal")],
                    ].map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          name={key}
                          type="number"
                          step="0.1"
                          min={key === "weight" ? 20 : key === "height" ? 80 : 1}
                          max={key === "weight" ? 400 : key === "height" ? 250 : 6000}
                          defaultValue={data.profile[key as "weight" | "height" | "bmr"] ?? ""}
                          required={key !== "bmr"}
                        />
                      </label>
                    ))}
                    <label>
                      {tr("Objetivo", "Goal")}
                      <input name="goal" maxLength={200} defaultValue={data.profile.goal} required />
                    </label>
                    <label>
                      {tr("Experiencia", "Experience")}
                      <select name="experience" defaultValue={data.profile.experience}>
                        <option value="Inicial">{tr("Inicial", "Beginner")}</option>
                        <option value="Intermedia">{tr("Intermedia", "Intermediate")}</option>
                        <option value="Avanzada">{tr("Avanzada", "Advanced")}</option>
                      </select>
                    </label>
                    <button className="primary">{tr("Guardar perfil", "Save profile")}</button>
                  </form>
                </section>

                <section className="card">
                  <h2>{tr("Tus datos te pertenecen", "You own your data")}</h2>
                  <p className="muted">
                    {tr(
                      "Las copias incluyen perfil, comidas, planificación, medidas, cargas, supermercados, ayunos y análisis 25(OH)D.",
                      "Backups include profile, meals, planner, body measurements, workouts, supermarkets, fasting, and 25(OH)D labs."
                    )}
                  </p>
                  <div className="button-row">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        download(
                          JSON.stringify(
                            { app: "KetoFit", version: 1, exportedAt: new Date().toISOString(), data },
                            null,
                            2
                          ),
                          `ketofit-${today}.json`
                        )
                      }
                    >
                      <ArrowDownToLine size={17} /> {tr("Exportar JSON", "Export JSON")}
                    </button>
                    <label className="secondary upload">
                      {tr("Importar copia", "Import backup")}
                      <input
                        type="file"
                        accept="application/json,.json"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) stageImport(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {pendingImport && (
                    <div className="inline-confirm" role="alert">
                      <span>
                        {tr(
                          "¿Reemplazar tus datos actuales por esta copia? Exportá una copia antes si querés conservar el estado actual.",
                          "Replace your current data with this backup? Export a backup first if you want to keep your current state."
                        )}
                      </span>
                      <div className="button-row">
                        <button
                          type="button"
                          className="primary"
                          onClick={async () => {
                            const next = pendingImport;
                            setPendingImport(null);
                            await save(next, {
                              toast: tr("Copia importada correctamente.", "Backup imported successfully."),
                            });
                          }}
                        >
                          {tr("Confirmar importación", "Confirm import")}
                        </button>
                        <button type="button" className="secondary" onClick={() => setPendingImport(null)}>
                          {tr("Cancelar", "Cancel")}
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="card">
                  <h2>{tr("KetoFit en tu Android", "KetoFit on Android")}</h2>
                  <p className="muted">
                    {tr(
                      "La instalación requiere abrir la aplicación por HTTPS en Chrome. El servidor local en esta PC usa HTTP y no es accesible desde Android mediante localhost.",
                      "Installation requires opening the app over HTTPS in Chrome. The local server uses HTTP and is not reachable from Android via localhost."
                    )}
                  </p>
                  {install ? (
                    <button type="button" className="primary" onClick={() => install.prompt()}>
                      {tr("Instalar KetoFit", "Install KetoFit")}
                    </button>
                  ) : (
                    <p className="muted small">
                      {tr(
                        "Una vez publicada con HTTPS: menú de Chrome → Agregar a la pantalla principal → Instalar.",
                        "Over HTTPS: Chrome menu → Add to Home screen → Install."
                      )}
                    </p>
                  )}
                </section>

                <section className="card">
                  <h2>{tr("Mi cuenta", "My account")}</h2>
                  <p>
                    {account?.email} ·{" "}
                    {account?.role === "ADMIN" ? tr("Administrador", "Admin") : tr("Usuario", "User")}
                  </p>
                  <div className="button-row">
                    <button type="button" className="secondary" onClick={() => setReplaySplash(true)}>
                      <Sparkles size={15} /> {tr("Ver intro de bienvenida", "Replay splash intro")}
                    </button>
                    <form method="post" action="/api/logout">
                      <button className="secondary">{tr("Cerrar sesión", "Sign out")}</button>
                    </form>
                  </div>
                </section>
              </>
            )}

            {pillar === "admin" && account?.role === "ADMIN" && <AdminPanel />}
          </fieldset>

          <footer>
            <Leaf size={15} />
            <span>{tr("KetoFit · Progreso real, a tu ritmo.", "KetoFit · Real progress, at your pace.")}</span>
            <span className="footer-status">
              <span className="dot" />
              {loaded
                ? syncing
                  ? tr("Sincronizando…", "Syncing…")
                  : tr("Cuenta conectada", "Account connected")
                : tr("Conectando…", "Connecting…")}
            </span>
          </footer>
        </div>
      </main>

      {/* Mobile Bottom Navigation mapped 1:1 to 4 Pillars + More */}
      <nav className="mobile-bottom" aria-label={tr("Navegación inferior", "Bottom navigation")}>
        {(
          [
            { id: "hoy", label: tr("Hoy", "Today"), icon: LayoutDashboard },
            { id: "entrenar", label: tr("Entrenar", "Train"), icon: Dumbbell },
            { id: "alimentacion", label: tr("Comidas", "Meals"), icon: Utensils },
            { id: "cuerpo", label: tr("Cuerpo", "Body"), icon: Activity },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={pillar === id ? "active" : ""}
            onClick={() => navigate(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" onClick={() => setMobile(true)}>
          <Menu size={20} />
          <span>{tr("Más", "More")}</span>
        </button>
      </nav>

      {/* Training Config & Custom Routine Drawer */}
      {trainingDrawer && (
        <div className="drawer-backdrop" onClick={() => setTrainingDrawer(false)}>
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Actualizar entrenamiento", "Update training")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <div>
                <span className="eyebrow">{tr("ACTUALIZAR PLAN DE ENTRENAMIENTO", "UPDATE TRAINING PLAN")}</span>
                <h2>{tr("Modalidad, días y ejercicios", "Mode, schedule & exercises")}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={tr("Cerrar editor de entrenamiento", "Close training editor")}
                onClick={() => setTrainingDrawer(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="drawer-body">
              <TrainingConfigEditor
                data={data}
                activeDayIndex={activeRoutine.dayIndex}
                onSave={async (next) => {
                  const nextRoutines = training(next.preferences, next.customRoutines);
                  const keepIdx = nextRoutines.findIndex((r) => r.dayIndex === activeRoutine.dayIndex);
                  setDay(keepIdx !== -1 ? keepIdx : 0);
                  await save(next, { toast: tr("Entrenamiento actualizado.", "Training updated.") });
                }}
                onClose={() => setTrainingDrawer(false)}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Food Preferences & Targets Drawer */}
      {foodDrawer && (
        <div className="drawer-backdrop" onClick={() => setFoodDrawer(false)}>
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Actualizar alimentación", "Update nutrition")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <div>
                <span className="eyebrow">{tr("ACTUALIZAR ALIMENTACIÓN", "UPDATE NUTRITION")}</span>
                <h2>{tr("Preferencias, exclusiones y metas", "Preferences, exclusions & targets")}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={tr("Cerrar editor de alimentación", "Close nutrition editor")}
                onClick={() => setFoodDrawer(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="drawer-body">
              <FoodConfigEditor
                data={data}
                onSave={(next) =>
                  save(next, { toast: tr("Alimentación y metas actualizadas.", "Nutrition and targets updated.") })
                }
                onClose={() => setFoodDrawer(false)}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Edit Existing Food Modal */}
      {editingFood && (
        <div className="modal-backdrop" onClick={() => setEditingFood(null)}>
          <section
            className="card history-detail"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Editar alimento", "Edit food")}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="eyebrow">{tr("ACTUALIZAR ALIMENTO", "UPDATE FOOD ENTRY")}</span>
            <h2>{tr("Editar registro", "Edit entry")}</h2>
            <form
              className="form-grid"
              style={{ gridTemplateColumns: "1fr 1fr" }}
              onSubmit={(e) => {
                e.preventDefault();
                const updated = editingFood;
                setEditingFood(null);
                save(
                  { ...data, foods: data.foods.map((f) => (f.id === updated.id ? updated : f)) },
                  { toast: `${updated.name} ${tr("actualizado", "updated")}.` }
                );
              }}
            >
              <label className="full-width">
                {tr("Alimento y porción", "Food & serving")}
                <input
                  value={editingFood.name}
                  maxLength={150}
                  onChange={(e) => setEditingFood({ ...editingFood, name: e.target.value })}
                  required
                />
              </label>
              <label>
                {tr("Fecha", "Date")}
                <input
                  type="date"
                  value={editingFood.date}
                  onChange={(e) => setEditingFood({ ...editingFood, date: e.target.value })}
                  required
                />
              </label>
              <label>
                {tr("Calorías (kcal)", "Calories (kcal)")}
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={10000}
                  value={editingFood.kcal}
                  onChange={(e) => setEditingFood({ ...editingFood, kcal: Number(e.target.value) || 0 })}
                  required
                />
              </label>
              <label>
                {tr("Proteínas (g)", "Protein (g)")}
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={1000}
                  value={editingFood.protein}
                  onChange={(e) => setEditingFood({ ...editingFood, protein: Number(e.target.value) || 0 })}
                  required
                />
              </label>
              <label>
                {tr("Grasas (g)", "Fat (g)")}
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={1000}
                  value={editingFood.fat}
                  onChange={(e) => setEditingFood({ ...editingFood, fat: Number(e.target.value) || 0 })}
                  required
                />
              </label>
              <label className="full-width">
                {tr("Carbohidratos totales (g)", "Total carbs (g)")}
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={1000}
                  value={editingFood.carbs}
                  onChange={(e) => setEditingFood({ ...editingFood, carbs: Number(e.target.value) || 0 })}
                  required
                />
              </label>
              <div className="button-row full-width">
                <button type="submit" className="primary">
                  {tr("Guardar cambios", "Save changes")}
                </button>
                <button type="button" className="secondary" onClick={() => setEditingFood(null)}>
                  {tr("Cancelar", "Cancel")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Planner Assistant Drawer */}
      {plannerDrawer && (
        <div className="drawer-backdrop" onClick={() => setPlannerDrawer(false)}>
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Asistente semanal de comidas", "Weekly meal assistant")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <div>
                <span className="eyebrow">{tr("ASISTENTE SEMANAL", "WEEKLY ASSISTANT")}</span>
                <h2>
                  {tr("Generar semana del", "Generate week of")} {planWeek}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={tr("Cerrar asistente", "Close assistant")}
                onClick={() => setPlannerDrawer(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="drawer-body">
              <MealGenerator
                key={planWeek}
                data={data}
                week={planWeek}
                onSave={(next) =>
                  save(next, {
                    toast: tr(`Plan aplicado a la semana del ${planWeek}.`, `Plan applied to week of ${planWeek}.`),
                  })
                }
                onApplied={() => setPlannerDrawer(false)}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {recipe && (
        <div className="modal-backdrop" onClick={() => setRecipe(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={recipeName(recipe)}
            className="modal card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="close icon-button"
              aria-label={tr("Cerrar receta", "Close recipe")}
              onClick={() => setRecipe(null)}
            >
              <X size={19} />
            </button>
            <img
              src={`https://images.unsplash.com/${recipe.photo}?auto=format&fit=crop&w=900&q=80`}
              alt={recipeName(recipe)}
            />
            <div className="modal-content">
              <span className="tag">
                {mealLabel(recipe.tag)} · {recipe.minutes} min · 1 {tr("porción", "serving")}
              </span>
              <h2>{recipeName(recipe)}</h2>
              <p className="tabular">
                {recipe.kcal} kcal · {tr("Proteínas", "Protein")} {recipe.protein} g · {tr("Grasas", "Fat")}{" "}
                {recipe.fat} g · {tr("Carbohidratos", "Carbs")} {recipe.carbs} g{" "}
                <small className="muted">({tr("estimados", "estimated")})</small>
              </p>
              <h3>{tr("Ingredientes", "Ingredients")}</h3>
              <ul>
                {recipe.ingredients.map((i) => (
                  <li key={i.name}>
                    {i.qty} {i.unit} · {i.name}
                  </li>
                ))}
              </ul>
              <h3>{tr("Preparación", "Preparation")}</h3>
              <ol>
                {recipe.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <button
                type="button"
                disabled={!loaded}
                className="primary"
                onClick={() => {
                  save(
                    {
                      ...data,
                      foods: [
                        ...data.foods,
                        {
                          id: uid(),
                          date: today,
                          name: `${recipeName(recipe)} · 1 ${tr("porción (estimada)", "serving (est.)")}`,
                          kcal: recipe.kcal,
                          protein: recipe.protein,
                          fat: recipe.fat,
                          carbs: recipe.carbs,
                        },
                      ],
                    },
                    { toast: `${recipeName(recipe)} ${tr("registrado hoy", "logged today")}.` }
                  );
                  setRecipe(null);
                }}
              >
                <Plus size={16} /> {tr("Registrar una porción hoy", "Log one serving today")}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Non-blocking Floating Toasts with Undo */}
      {toasts.length > 0 && (
        <div className="toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.kind === "error" ? "error-toast" : ""}`} role="status">
              <Check size={16} />
              <span>{t.message}</span>
              {t.undo && (
                <button
                  type="button"
                  className="toast-undo"
                  onClick={() => {
                    dismissToast(t.id);
                    t.undo?.();
                  }}
                >
                  {tr("Deshacer", "Undo")}
                </button>
              )}
              <button
                type="button"
                className="toast-close"
                aria-label={tr("Cerrar notificación", "Dismiss notification")}
                onClick={() => dismissToast(t.id)}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== SUBCOMPONENTS ==================== */

function Stat({
  label,
  value,
  unit,
  icon,
  note,
  status,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  note: string;
  status?: { tone: "ok" | "warn" | "over"; text: string };
}) {
  return (
    <section className="card stat">
      <div className="stat-top">
        <span>{label}</span>
        <div>{icon}</div>
      </div>
      <strong>
        {value}
        {unit ? <small> {unit}</small> : null}
      </strong>
      <p>{note}</p>
      {status && <span className={`stat-status ${status.tone}`}>{status.text}</span>}
    </section>
  );
}

function Section({
  title,
  label,
  action,
  onClick,
}: {
  title: string;
  label?: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-head">
      <div>
        {label && <span className="eyebrow">{label}</span>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button type="button" className="text-button" onClick={onClick}>
          {action}
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

function MacroProgressBars({
  totals,
  targets,
}: {
  totals: { kcal: number; protein: number; fat: number; carbs: number };
  targets: State["targets"];
}) {
  const { tr, fmt } = useI18n();
  const rows = [
    {
      key: "carbs" as const,
      label: tr("Carbohidratos", "Carbs"),
      role: tr("Techo keto", "Keto ceiling"),
      tone: "carbs",
      mode: "ceiling" as const,
    },
    {
      key: "protein" as const,
      label: tr("Proteínas", "Protein"),
      role: tr("Piso objetivo", "Floor target"),
      tone: "protein",
      mode: "floor" as const,
    },
    {
      key: "fat" as const,
      label: tr("Grasas", "Fat"),
      role: tr("Energía", "Energy"),
      tone: "fat",
      mode: "range" as const,
    },
  ];

  return (
    <div className="macro-bars">
      {rows.map((r) => {
        const value = totals[r.key];
        const target = targets[r.key];
        const ratio = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
        let fillClass = r.tone;
        let statusNode: React.ReactNode = <span>{tr("Sin meta configurada", "No target set")}</span>;

        if (target > 0) {
          if (r.mode === "ceiling") {
            if (value > target) {
              fillClass = "over";
              statusNode = (
                <span className="over-text">
                  {tr("Excedido por", "Over by")} {fmt(value - target)} g
                </span>
              );
            } else if (value >= target * 0.85) {
              fillClass = "warn";
              statusNode = (
                <span className="warn-text">
                  {tr("Quedan", "Left")} {fmt(target - value)} g {tr("para el techo", "to ceiling")}
                </span>
              );
            } else {
              statusNode = (
                <span className="ok-text">
                  {tr("Quedan", "Left")} {fmt(target - value)} g
                </span>
              );
            }
          } else if (r.mode === "floor") {
            if (value >= target) {
              fillClass = "ok";
              statusNode = <span className="ok-text">{tr("Meta alcanzada ✓", "Target met ✓")}</span>;
            } else {
              statusNode = (
                <span>
                  {tr("Faltan", "Need")} {fmt(target - value)} g
                </span>
              );
            }
          } else {
            statusNode =
              value > target ? (
                <span className="warn-text">
                  +{fmt(value - target)} g {tr("sobre la referencia", "above reference")}
                </span>
              ) : (
                <span>
                  {tr("Restan", "Left")} {fmt(target - value)} g
                </span>
              );
          }
        }

        return (
          <div key={r.key}>
            <div className="macro-row-head">
              <div className="macro-row-title">
                <span>{r.label}</span>
                <span className="macro-role">· {r.role}</span>
              </div>
              <div className="macro-value">
                {fmt(value)}
                <small>{target > 0 ? ` / ${fmt(target)} g` : " g"}</small>
              </div>
            </div>
            <div className="macro-track">
              <div className={`macro-fill ${fillClass}`} style={{ width: `${ratio}%` }} />
            </div>
            <div className="macro-meta">
              {statusNode}
              {target > 0 && <span className="tabular">{Math.round((value / target) * 100)}%</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExerciseCard({
  index,
  exercise,
  guide,
  lastMark,
  loggedToday,
  historyCount,
  onOpenHistory,
  onLog,
}: {
  index: number;
  exercise: string;
  guide: { sets: number; reps: number; label: string; hint: string };
  lastMark: State["workouts"][number] | null;
  loggedToday: State["workouts"][number][];
  historyCount: number;
  onOpenHistory: () => void;
  onLog: (sets: number, reps: number, load: number) => void;
}) {
  const { tr, fmt, shortDate, exerciseName, lang } = useI18n();
  const isTimed = timed(exercise);
  const [sets, setSets] = useState(lastMark?.sets ?? guide.sets);
  const [reps, setReps] = useState(lastMark?.reps ?? guide.reps);
  const [load, setLoad] = useState(lastMark?.load ?? 0);

  const doneToday = loggedToday.length > 0;
  const latestToday = loggedToday.at(-1);
  const displayEx = exerciseName(exercise);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const guideText =
    lang === "en"
      ? isTimed
        ? `${guide.reps}–${guide.reps * 2} min at a comfortable pace`
        : `${guide.sets} sets · 8–12 reps · Rest 60–120 s`
      : guide.label;

  return (
    <article className={`exercise-card ${doneToday ? "logged" : ""}`}>
      <div className="exercise-card-top">
        <div className="exercise-index" aria-hidden="true">
          {doneToday ? <Check size={18} /> : String(index).padStart(2, "0")}
        </div>

        <div className="exercise-info">
          <div className="exercise-title-row">
            <h3>{displayEx}</h3>
            {doneToday && latestToday && (
              <span className="done-badge tabular">
                <Check size={13} /> {tr("Registrado", "Logged")}: {latestToday.sets}×{latestToday.reps} ·{" "}
                {fmt(latestToday.load)} kg
              </span>
            )}
          </div>
          <p className="exercise-guide">{guideText}</p>
          {lang === "es" && <p className="exercise-hint">{guide.hint}</p>}

          <div className="exercise-meta-bar">
            {lastMark ? (
              <button
                type="button"
                className="last-mark-chip"
                onClick={() => {
                  setSets(lastMark.sets);
                  setReps(lastMark.reps);
                  setLoad(lastMark.load);
                }}
              >
                <RotateCcw size={13} />
                {tr("Última marca", "Last mark")} ({shortDate(lastMark.date)}):{" "}
                <span>
                  {lastMark.sets}×{lastMark.reps} · {fmt(lastMark.load)} kg
                </span>
              </button>
            ) : (
              <span className="small muted">{tr("Sin registros previos de este ejercicio", "No previous logs for this exercise")}</span>
            )}

            <button type="button" className="text-button" onClick={onOpenHistory}>
              {tr("Historial", "History")} ({historyCount}) <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <form
        className="exercise-controls"
        onSubmit={(e) => {
          e.preventDefault();
          onLog(sets, reps, load);
        }}
      >
        <div className="stepper-field">
          <span>{tr("Series", "Sets")}</span>
          <div className="stepper">
            <button
              type="button"
              aria-label={`${tr("Restar series de", "Decrease sets for")} ${displayEx}`}
              onClick={() => setSets((v) => clamp(v - 1, 1, 20))}
            >
              −
            </button>
            <input
              aria-label={`${tr("Series", "Sets")} ${displayEx}`}
              type="number"
              min={1}
              max={20}
              value={sets}
              onChange={(e) => setSets(clamp(Number(e.target.value) || 1, 1, 20))}
              required
            />
            <button
              type="button"
              aria-label={`${tr("Sumar series de", "Increase sets for")} ${displayEx}`}
              onClick={() => setSets((v) => clamp(v + 1, 1, 20))}
            >
              +
            </button>
          </div>
        </div>

        <div className="stepper-field">
          <span>{isTimed ? tr("Minutos", "Minutes") : "Reps"}</span>
          <div className="stepper">
            <button
              type="button"
              aria-label={`${tr("Restar", "Decrease")} ${isTimed ? tr("minutos", "minutes") : "reps"} ${displayEx}`}
              onClick={() => setReps((v) => clamp(v - 1, 1, 100))}
            >
              −
            </button>
            <input
              aria-label={`${isTimed ? tr("Minutos", "Minutes") : "Reps"} ${displayEx}`}
              type="number"
              min={1}
              max={100}
              value={reps}
              onChange={(e) => setReps(clamp(Number(e.target.value) || 1, 1, 100))}
              required
            />
            <button
              type="button"
              aria-label={`${tr("Sumar", "Increase")} ${isTimed ? tr("minutos", "minutes") : "reps"} ${displayEx}`}
              onClick={() => setReps((v) => clamp(v + 1, 1, 100))}
            >
              +
            </button>
          </div>
        </div>

        <div className="stepper-field">
          <span>{tr("Carga (kg)", "Load (kg)")}</span>
          <div className="stepper">
            <button
              type="button"
              aria-label={`${tr("Restar 2,5 kg a", "Decrease 2.5 kg for")} ${displayEx}`}
              onClick={() => setLoad((v) => clamp(Math.round((v - 2.5) * 10) / 10, 0, 1000))}
            >
              −
            </button>
            <input
              aria-label={`${tr("Carga", "Load")} ${displayEx}`}
              type="number"
              step="0.5"
              min={0}
              max={1000}
              value={load}
              onChange={(e) => setLoad(clamp(Number(e.target.value) || 0, 0, 1000))}
              required
            />
            <button
              type="button"
              aria-label={`${tr("Sumar 2,5 kg a", "Increase 2.5 kg for")} ${displayEx}`}
              onClick={() => setLoad((v) => clamp(Math.round((v + 2.5) * 10) / 10, 0, 1000))}
            >
              +
            </button>
          </div>
        </div>

        <button type="submit" className={doneToday ? "secondary" : "primary"}>
          {doneToday ? tr("Registrar otra", "Log another") : tr("Registrar", "Log")}
        </button>
      </form>
    </article>
  );
}

function EvolutionChart({
  entries,
  metric = "weight",
}: {
  entries: State["measurements"];
  metric?: "weight" | "waist";
}) {
  const { tr, shortDate } = useI18n();
  if (!entries.length) {
    return (
      <div className="empty">
        <Activity size={26} />
        <p>
          {tr(
            "Tu historia empieza con el primer registro. Agregá una medida para ver la evolución.",
            "Your trend starts with your first entry. Add a measurement to see your progress."
          )}
        </p>
      </div>
    );
  }
  return (
    <MetricChart
      data={entries}
      xKey="date"
      yKey={metric}
      seriesName={metric === "weight" ? tr("Peso", "Weight") : tr("Cintura", "Waist")}
      unit={metric === "weight" ? "kg" : "cm"}
      color="var(--accent)"
      height={224}
      xFormatter={(d) => shortDate(String(d))}
    />
  );
}

function Records({
  title,
  rows,
  remove,
  edit,
}: {
  title: string;
  rows: { id: string; text: string }[];
  remove: (id: string) => void;
  edit?: (id: string) => void;
}) {
  const { tr } = useI18n();
  return (
    <section className="card">
      <h2>{title}</h2>
      {rows.length ? (
        rows.map((row) => (
          <div className="record" key={row.id}>
            <span className="tabular">{row.text}</span>
            <div className="record-actions">
              {edit && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${tr("Editar", "Edit")} ${row.text}`}
                  onClick={() => edit(row.id)}
                >
                  <Pencil size={15} />
                </button>
              )}
              <button
                type="button"
                className="icon-button"
                aria-label={`${tr("Eliminar", "Delete")} ${row.text}`}
                onClick={() => remove(row.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="muted">{tr("Todavía no hay registros.", "No entries yet.")}</p>
      )}
    </section>
  );
}
