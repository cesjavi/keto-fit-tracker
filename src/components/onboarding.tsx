"use client";
import { useState } from "react";
import { Leaf, Dumbbell, House, Check, ArrowRight } from "lucide-react";
import { State, days } from "@/lib/data";
import { generatePlan, mergeWeek, exclusions } from "@/lib/planning";
import { useI18n } from "@/lib/i18n";

export function PreferencesFields({
  prefs,
  setPrefs,
}: {
  prefs: State["preferences"];
  setPrefs: (p: State["preferences"]) => void;
}) {
  const { tr, dayLabel, exclusionLabel } = useI18n();
  return (
    <>
      <div className="location-choices">
        <button type="button" className={!prefs.gym ? "selected" : ""} onClick={() => setPrefs({ ...prefs, gym: false })}>
          <House />
          <strong>{tr("En casa", "At home")}</strong>
          <small>{tr("Sin máquinas. Peso corporal.", "No machines. Bodyweight.")}</small>
        </button>
        <button type="button" className={prefs.gym ? "selected" : ""} onClick={() => setPrefs({ ...prefs, gym: true })}>
          <Dumbbell />
          <strong>{tr("En gimnasio", "At the gym")}</strong>
          <small>{tr("Máquinas y pesos libres.", "Machines and free weights.")}</small>
        </button>
      </div>
      <div className="form-grid">
        <label>
          {tr("Tiempo por sesión", "Time per session")}
          <select
            value={prefs.minutes}
            onChange={(e) => setPrefs({ ...prefs, minutes: Number(e.target.value) })}
          >
            {[20, 30, 45, 60, 90].map((n) => (
              <option key={n} value={n}>
                {n} {tr("minutos", "minutes")}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Alimentación", "Diet")}
          <select
            value={prefs.diet}
            onChange={(e) => setPrefs({ ...prefs, diet: e.target.value as "omnivora" | "vegetariana" })}
          >
            <option value="omnivora">{tr("Keto variada", "Varied keto")}</option>
            <option value="vegetariana">{tr("Vegetariana · huevos y lácteos", "Vegetarian · eggs & dairy")}</option>
          </select>
        </label>
        <label>
          {tr("Tiempo máximo por receta", "Max prep time per recipe")}
          <select
            value={prefs.maxMinutes}
            onChange={(e) => setPrefs({ ...prefs, maxMinutes: Number(e.target.value) })}
          >
            {[10, 15, 20, 30, 45, 60].map((n) => (
              <option key={n} value={n}>
                {n} {tr("minutos", "minutes")}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Porciones por comida", "Servings per meal")}
          <input
            type="number"
            min="0.5"
            max="10"
            step="0.5"
            value={prefs.servings}
            onChange={(e) => setPrefs({ ...prefs, servings: Number(e.target.value) })}
            required
          />
        </label>
      </div>
      <label>{tr("Días para entrenar", "Training days")}</label>
      <div className="day-choices">
        {days.map((d, i) => (
          <button
            key={d}
            type="button"
            aria-pressed={prefs.trainingDays.includes(i)}
            className={prefs.trainingDays.includes(i) ? "selected" : ""}
            onClick={() =>
              setPrefs({
                ...prefs,
                trainingDays: prefs.trainingDays.includes(i)
                  ? prefs.trainingDays.filter((n) => n !== i)
                  : [...prefs.trainingDays, i].sort(),
              })
            }
          >
            {dayLabel(d).slice(0, 3)}
          </button>
        ))}
      </div>
      <p className="small muted">
        {tr(
          "Elegí al menos un día. Alterná fuerza y recuperación según tus sensaciones.",
          "Pick at least one day. Alternate strength and recovery based on how you feel."
        )}
      </p>
      <label>{tr("Ingredientes a excluir del generador", "Ingredients to exclude from generator")}</label>
      <div className="exclusion-choices">
        {exclusions.map((item) => (
          <label key={item}>
            <input
              type="checkbox"
              checked={prefs.exclusions.includes(item)}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  exclusions: e.target.checked
                    ? [...prefs.exclusions, item]
                    : prefs.exclusions.filter((x) => x !== item),
                })
              }
            />
            {exclusionLabel(item)}
          </label>
        ))}
      </div>
      <p className="small muted">
        {tr(
          "Se excluyen las recetas que los contienen. Para alergias, verificá etiquetas y contaminación cruzada: este catálogo no puede garantizar ausencia de trazas.",
          "Recipes containing these ingredients are excluded. For allergies, verify product labels and cross-contamination."
        )}
      </p>
    </>
  );
}

export default function Onboarding({
  data,
  busy,
  error,
  onSave,
  name,
}: {
  data: State;
  busy: boolean;
  error: string;
  onSave: (s: State) => Promise<void>;
  name: string;
}) {
  const { tr } = useI18n();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState({ ...data.preferences });
  const [generate, setGenerate] = useState(true);
  const [localError, setLocalError] = useState("");

  return (
    <div className="onboarding-shell">
      <div className="onboarding-top">
        <span className="auth-brand">
          <Leaf /> KetoFit
        </span>
        <form method="post" action="/api/logout">
          <button className="text-button">{tr("Salir", "Sign out")}</button>
        </form>
      </div>
      <div className="onboarding-intro">
        <span className="eyebrow">{tr("HECHO A TU MEDIDA", "TAILORED TO YOU")}</span>
        <h1>
          {tr(`Empecemos por vos, ${name.split(" ")[0]}.`, `Let's start with you, ${name.split(" ")[0]}.`)}
        </h1>
        <p>
          {tr(
            "Unos datos para organizar tu espacio. Podés cambiarlos después.",
            "A few details to set up your workspace. You can change them anytime."
          )}
        </p>
        <div className="step-progress">
          {[
            tr("Tu punto de partida", "Your starting point"),
            tr("Tu entrenamiento y comidas", "Your training & meals"),
          ].map((s, i) => (
            <span className={step >= i ? "active" : ""} key={s}>
              <b>{step > i ? <Check size={15} /> : i + 1}</b>
              {s}
            </span>
          ))}
        </div>
      </div>

      <section className="card onboarding-card">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLocalError("");
            const f = new FormData(e.currentTarget);
            if (step === 0) {
              setStep(1);
              return;
            }
            try {
              if (!prefs.trainingDays.length) {
                throw Error(tr("Seleccioná al menos un día de entrenamiento.", "Select at least one training day."));
              }
              const week = new Date();
              week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
              const weekKey = `${week.getFullYear()}-${String(week.getMonth() + 1).padStart(2, "0")}-${String(
                week.getDate()
              ).padStart(2, "0")}`;
              const preferences = { ...prefs, onboardingComplete: true };
              const draft = generate ? generatePlan(weekKey, preferences) : {};
              await onSave({
                ...data,
                profile: {
                  ...data.profile,
                  weight: Number(f.get("weight")),
                  height: Number(f.get("height")),
                  bmr: f.get("bmr") ? Number(f.get("bmr")) : null,
                  goal: String(f.get("goal")),
                  experience: String(f.get("experience")),
                },
                preferences,
                plan: generate ? mergeWeek(data.plan, weekKey, draft) : data.plan,
              });
            } catch (err) {
              setLocalError(err instanceof Error ? err.message : tr("Revisá los datos.", "Please check your inputs."));
            }
          }}
        >
          <fieldset disabled={busy}>
            <div hidden={step !== 0}>
              <h2>{tr("Tu punto de partida", "Your starting point")}</h2>
              <p className="muted">
                {tr(
                  "Tus medidas quedan en tu cuenta. El metabolismo basal es opcional y no se calcula ni se usa como meta de ingesta.",
                  "Your measurements stay in your account. Basal metabolic rate is optional and is never used as a calorie prescription."
                )}
              </p>
              <div className="form-grid">
                <label>
                  {tr("Peso actual (kg)", "Current weight (kg)")}
                  <input
                    name="weight"
                    type="number"
                    min="20"
                    max="400"
                    step="0.1"
                    defaultValue={data.profile.weight ?? ""}
                    required
                  />
                </label>
                <label>
                  {tr("Altura (cm)", "Height (cm)")}
                  <input
                    name="height"
                    type="number"
                    min="80"
                    max="250"
                    step="0.1"
                    defaultValue={data.profile.height ?? ""}
                    required
                  />
                </label>
                <label>
                  {tr("Metabolismo basal registrado (kcal, opcional)", "Recorded BMR (kcal, optional)")}
                  <input
                    name="bmr"
                    type="number"
                    min="1"
                    max="6000"
                    step="0.1"
                    defaultValue={data.profile.bmr ?? ""}
                  />
                </label>
                <label>
                  {tr("Experiencia", "Experience")}
                  <select name="experience" defaultValue={data.profile.experience}>
                    <option value="Inicial">{tr("Inicial", "Beginner")}</option>
                    <option value="Intermedia">{tr("Intermedia", "Intermediate")}</option>
                    <option value="Avanzada">{tr("Avanzada", "Advanced")}</option>
                  </select>
                </label>
                <label className="full-width">
                  {tr("Objetivo", "Goal")}
                  <select name="goal" defaultValue={data.profile.goal}>
                    <option value="Perder grasa y ganar músculo">
                      {tr("Perder grasa y ganar músculo", "Lose fat and build muscle")}
                    </option>
                    <option value="Mejorar mi fuerza">{tr("Mejorar mi fuerza", "Improve strength")}</option>
                    <option value="Mantener hábitos saludables">
                      {tr("Mantener hábitos saludables", "Maintain healthy habits")}
                    </option>
                  </select>
                </label>
              </div>
            </div>

            <div hidden={step !== 1}>
              <h2>{tr("¿Dónde vas a entrenar?", "Where will you train?")}</h2>
              <PreferencesFields prefs={prefs} setPrefs={setPrefs} />
              <label className="inline-check">
                <input type="checkbox" checked={generate} onChange={(e) => setGenerate(e.target.checked)} />
                {tr("Generar mi primera semana de comidas", "Generate my first weekly meal plan")}
              </label>
              <p className="small muted">
                {tr(
                  "Menú orientativo según tus preferencias, tiempo y porciones. No prescribe calorías ni reemplaza una planificación nutricional individual.",
                  "Reference menu based on your preferences, prep time, and servings. Does not prescribe calories or replace individualized nutrition advice."
                )}
              </p>
            </div>

            {(localError || error) && (
              <p role="alert" className="error">
                {localError || error}
              </p>
            )}

            <div className="wizard-actions">
              {step === 1 && (
                <button type="button" className="secondary" onClick={() => setStep(0)}>
                  {tr("Volver", "Back")}
                </button>
              )}
              <button className="primary">
                {busy
                  ? tr("Guardando…", "Saving…")
                  : step === 0
                    ? tr("Continuar", "Continue")
                    : tr("Crear mi espacio", "Create my workspace")}
                <ArrowRight size={17} />
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </div>
  );
}
