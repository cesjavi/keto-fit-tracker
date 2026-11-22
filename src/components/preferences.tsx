"use client";
import { useEffect, useState } from "react";
import { Dumbbell, House, Plus, RotateCcw, Trash2 } from "lucide-react";
import { State, recipes, days, meals } from "@/lib/data";
import { exclusions, generatePlan, mergeWeek, training } from "@/lib/planning";
import { useI18n } from "@/lib/i18n";
import AiPanel from "./ai-panel";
import { PreferencesFields } from "./onboarding";

export function PreferencesEditor({ data, onSave }: { data: State; onSave: (s: State) => Promise<void> }) {
  const { tr } = useI18n();
  const [prefs, setPrefs] = useState(data.preferences);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setPrefs(data.preferences);
  }, [data.preferences]);

  return (
    <section className="card">
      <h2>{tr("Tu entrenamiento y alimentación", "Your training & nutrition")}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!prefs.trainingDays.length) {
            setLocalError(tr("Elegí al menos un día para entrenar.", "Select at least one training day."));
            return;
          }
          setLocalError("");
          onSave({ ...data, preferences: prefs });
        }}
      >
        <PreferencesFields prefs={prefs} setPrefs={setPrefs} />
        {localError && (
          <p role="alert" className="error" style={{ marginTop: 12 }}>
            {localError}
          </p>
        )}
        <button className="primary" style={{ marginTop: 18 }}>
          {tr("Guardar preferencias", "Save preferences")}
        </button>
      </form>
    </section>
  );
}

export function TrainingConfigEditor({
  data,
  activeDayIndex,
  onSave,
  onClose,
}: {
  data: State;
  activeDayIndex: number;
  onSave: (s: State) => Promise<void>;
  onClose: () => void;
}) {
  const { tr, dayLabel } = useI18n();
  const [gym, setGym] = useState(data.preferences.gym);
  const [minutes, setMinutes] = useState(data.preferences.minutes);
  const [trainingDays, setTrainingDays] = useState(data.preferences.trainingDays);
  const [experience, setExperience] = useState(data.profile.experience);
  const [error, setError] = useState("");

  // Routine editor for selected day
  const mode = gym ? "gym" : "home";
  const [editDayIdx, setEditDayIdx] = useState(
    trainingDays.includes(activeDayIndex) ? activeDayIndex : trainingDays[0] ?? 0
  );
  const resolvedList = training({ ...data.preferences, gym, trainingDays, minutes }, data.customRoutines);
  const selectedRoutine = resolvedList.find((r) => r.dayIndex === editDayIdx) ?? resolvedList[0];

  const [routineName, setRoutineName] = useState(selectedRoutine?.name ?? "");
  const [exercises, setExercises] = useState<string[]>(selectedRoutine?.ex ?? []);
  const [newExercise, setNewExercise] = useState("");
  const [routineDirty, setRoutineDirty] = useState(false);

  useEffect(() => {
    const nextList = training({ ...data.preferences, gym, trainingDays, minutes }, data.customRoutines);
    const match = nextList.find((r) => r.dayIndex === editDayIdx) ?? nextList[0];
    if (match) {
      setEditDayIdx(match.dayIndex);
      setRoutineName(match.name);
      setExercises(match.ex);
      setRoutineDirty(false);
    }
  }, [gym, editDayIdx, data.customRoutines, data.preferences, minutes, trainingDays]);

  const routineKey = `${mode}-${editDayIdx}`;
  const hasCustomOverride = Boolean(data.customRoutines[routineKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trainingDays.length) {
      setError(tr("Seleccioná al menos un día para entrenar.", "Select at least one training day."));
      return;
    }
    const cleanExercises = exercises.map((x) => x.trim()).filter(Boolean);
    if (routineDirty && (!routineName.trim() || !cleanExercises.length)) {
      setError(
        tr(
          "La rutina del día necesita un nombre y al menos un ejercicio.",
          "The daily routine needs a name and at least one exercise."
        )
      );
      return;
    }
    setError("");
    const nextCustom = { ...data.customRoutines };
    if (routineDirty) {
      nextCustom[routineKey] = { name: routineName.trim(), ex: cleanExercises };
    }
    await onSave({
      ...data,
      profile: { ...data.profile, experience },
      preferences: { ...data.preferences, gym, minutes, trainingDays },
      customRoutines: nextCustom,
    });
    onClose();
  }

  async function resetCurrentDay() {
    const nextCustom = { ...data.customRoutines };
    delete nextCustom[routineKey];
    await onSave({ ...data, customRoutines: nextCustom });
    setRoutineDirty(false);
  }

  return (
    <form onSubmit={handleSubmit} className="editor-stack">
      <div className="editor-section">
        <span className="eyebrow">{tr("MODALIDAD Y FRECUENCIA", "MODE & SCHEDULE")}</span>
        <div className="location-choices">
          <button type="button" className={!gym ? "selected" : ""} onClick={() => setGym(false)}>
            <House size={20} />
            <strong>{tr("En casa", "At home")}</strong>
            <small>{tr("Peso corporal y apoyos estables.", "Bodyweight and stable supports.")}</small>
          </button>
          <button type="button" className={gym ? "selected" : ""} onClick={() => setGym(true)}>
            <Dumbbell size={20} />
            <strong>{tr("En gimnasio", "At the gym")}</strong>
            <small>{tr("Máquinas y pesos libres.", "Machines and free weights.")}</small>
          </button>
        </div>

        <div className="form-grid">
          <label>
            {tr("Tiempo por sesión", "Time per session")}
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
              {[20, 30, 45, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} {tr("minutos", "minutes")}
                </option>
              ))}
            </select>
          </label>
          <label>
            {tr("Nivel de experiencia", "Experience level")}
            <select value={experience} onChange={(e) => setExperience(e.target.value)}>
              <option value="Inicial">{tr("Inicial", "Beginner")}</option>
              <option value="Intermedia">{tr("Intermedia", "Intermediate")}</option>
              <option value="Avanzada">{tr("Avanzada", "Advanced")}</option>
            </select>
          </label>
        </div>

        <label>{tr("Días de entrenamiento", "Training days")}</label>
        <div className="day-choices">
          {days.map((d, i) => (
            <button
              key={d}
              type="button"
              aria-pressed={trainingDays.includes(i)}
              className={trainingDays.includes(i) ? "selected" : ""}
              onClick={() =>
                setTrainingDays((prev) => (prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i].sort()))
              }
            >
              {dayLabel(d).slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {trainingDays.length > 0 && (
        <div className="editor-section">
          <div className="section-head" style={{ marginBottom: 10 }}>
            <div>
              <span className="eyebrow">
                {tr(
                  `PERSONALIZAR EJERCICIOS (${gym ? "GIMNASIO" : "CASA"})`,
                  `CUSTOMIZE EXERCISES (${gym ? "GYM" : "HOME"})`
                )}
              </span>
              <h3 style={{ margin: "4px 0 0" }}>{tr("Editar rutina del día", "Edit day routine")}</h3>
            </div>
            {hasCustomOverride && (
              <button type="button" className="text-button" onClick={resetCurrentDay}>
                <RotateCcw size={14} /> {tr("Restaurar sugerida", "Restore default")}
              </button>
            )}
          </div>

          <div className="form-grid" style={{ marginTop: 8 }}>
            <label>
              {tr("Día a editar", "Day to edit")}
              <select value={editDayIdx} onChange={(e) => setEditDayIdx(Number(e.target.value))}>
                {trainingDays.map((idx) => (
                  <option key={idx} value={idx}>
                    {dayLabel(days[idx])}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {tr("Nombre de la sesión", "Session title")}
              <input
                value={routineName}
                maxLength={100}
                onChange={(e) => {
                  setRoutineName(e.target.value);
                  setRoutineDirty(true);
                }}
                required
              />
            </label>
          </div>

          <div className="custom-ex-list">
            {exercises.map((ex, idx) => (
              <div className="custom-ex-row" key={`${editDayIdx}-${idx}`}>
                <input
                  aria-label={`${tr("Ejercicio", "Exercise")} ${idx + 1}`}
                  value={ex}
                  maxLength={100}
                  onChange={(e) => {
                    const next = [...exercises];
                    next[idx] = e.target.value;
                    setExercises(next);
                    setRoutineDirty(true);
                  }}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${tr("Quitar", "Remove")} ${ex}`}
                  disabled={exercises.length <= 1}
                  onClick={() => {
                    setExercises(exercises.filter((_, i) => i !== idx));
                    setRoutineDirty(true);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="add-ex-row">
            <input
              value={newExercise}
              maxLength={100}
              placeholder={tr("Nuevo ejercicio (ej. Dominadas asistidas)", "New exercise (e.g. Assisted pull-ups)")}
              onChange={(e) => setNewExercise(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (newExercise.trim() && exercises.length < 20) {
                    setExercises([...exercises, newExercise.trim()]);
                    setNewExercise("");
                    setRoutineDirty(true);
                  }
                }
              }}
            />
            <button
              type="button"
              className="secondary"
              disabled={!newExercise.trim() || exercises.length >= 20}
              onClick={() => {
                if (!newExercise.trim()) return;
                setExercises([...exercises, newExercise.trim()]);
                setNewExercise("");
                setRoutineDirty(true);
              }}
            >
              <Plus size={15} /> {tr("Agregar", "Add")}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <div className="button-row" style={{ marginTop: 8 }}>
        <button type="submit" className="primary">
          {tr("Guardar cambios de entrenamiento", "Save training changes")}
        </button>
        <button type="button" className="secondary" onClick={onClose}>
          {tr("Cancelar", "Cancel")}
        </button>
      </div>
    </form>
  );
}

export function FoodConfigEditor({
  data,
  onSave,
  onClose,
}: {
  data: State;
  onSave: (s: State) => Promise<void>;
  onClose: () => void;
}) {
  const { tr, exclusionLabel } = useI18n();
  const [diet, setDiet] = useState(data.preferences.diet);
  const [maxMinutes, setMaxMinutes] = useState(data.preferences.maxMinutes);
  const [servings, setServings] = useState(data.preferences.servings);
  const [selectedExclusions, setSelectedExclusions] = useState(data.preferences.exclusions);
  const [targets, setTargets] = useState(data.targets);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      ...data,
      preferences: {
        ...data.preferences,
        diet,
        maxMinutes,
        servings,
        exclusions: selectedExclusions,
      },
      targets,
    });
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="editor-stack">
      <div className="editor-section">
        <span className="eyebrow">{tr("PREFERENCIAS DE MENÚ Y PLANIFICADOR", "MENU & PLANNER PREFERENCES")}</span>
        <div className="form-grid">
          <label>
            {tr("Tipo de alimentación", "Diet type")}
            <select value={diet} onChange={(e) => setDiet(e.target.value as "omnivora" | "vegetariana")}>
              <option value="omnivora">{tr("Keto variada", "Varied keto")}</option>
              <option value="vegetariana">{tr("Vegetariana · huevos y lácteos", "Vegetarian · eggs & dairy")}</option>
            </select>
          </label>
          <label>
            {tr("Tiempo máximo por receta", "Max prep time per recipe")}
            <select value={maxMinutes} onChange={(e) => setMaxMinutes(Number(e.target.value))}>
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
              value={servings}
              onChange={(e) => setServings(Number(e.target.value) || 1)}
              required
            />
          </label>
        </div>

        <label>{tr("Ingredientes a excluir del generador", "Ingredients to exclude from generator")}</label>
        <div className="exclusion-choices">
          {exclusions.map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={selectedExclusions.includes(item)}
                onChange={(e) =>
                  setSelectedExclusions((prev) =>
                    e.target.checked ? [...prev, item] : prev.filter((x) => x !== item)
                  )
                }
              />
              {exclusionLabel(item)}
            </label>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          {tr(
            "Ante alergias alimentarias verificá siempre etiquetas y trazas en cada producto.",
            "For food allergies, always verify product labels and cross-contamination traces."
          )}
        </p>
      </div>

      <div className="editor-section">
        <span className="eyebrow">{tr("METAS DIARIAS MANUALES (0 = SIN META)", "MANUAL DAILY TARGETS (0 = NO TARGET)")}</span>
        <div className="form-grid">
          <label>
            {tr("Calorías (kcal)", "Calories (kcal)")}
            <input
              type="number"
              min="0"
              max="10000"
              step="1"
              value={targets.kcal}
              onChange={(e) => setTargets({ ...targets, kcal: Number(e.target.value) || 0 })}
              required
            />
          </label>
          <label>
            {tr("Carbohidratos · techo (g)", "Carbs · ceiling (g)")}
            <input
              type="number"
              min="0"
              max="1000"
              step="0.5"
              value={targets.carbs}
              onChange={(e) => setTargets({ ...targets, carbs: Number(e.target.value) || 0 })}
              required
            />
          </label>
          <label>
            {tr("Proteínas · piso (g)", "Protein · floor (g)")}
            <input
              type="number"
              min="0"
              max="1000"
              step="0.5"
              value={targets.protein}
              onChange={(e) => setTargets({ ...targets, protein: Number(e.target.value) || 0 })}
              required
            />
          </label>
          <label>
            {tr("Grasas (g)", "Fat (g)")}
            <input
              type="number"
              min="0"
              max="1000"
              step="0.5"
              value={targets.fat}
              onChange={(e) => setTargets({ ...targets, fat: Number(e.target.value) || 0 })}
              required
            />
          </label>
        </div>
      </div>

      <div className="button-row" style={{ marginTop: 8 }}>
        <button type="submit" className="primary">
          {tr("Guardar alimentación y metas", "Save nutrition & targets")}
        </button>
        <button type="button" className="secondary" onClick={onClose}>
          {tr("Cancelar", "Cancel")}
        </button>
      </div>
    </form>
  );
}

export function MealGenerator({
  data,
  week,
  onSave,
  onApplied,
}: {
  data: State;
  week: string;
  onSave: (s: State) => Promise<void>;
  onApplied?: () => void;
}) {
  const { tr, dayLabel, mealLabel, exclusionLabel, recipeName } = useI18n();
  const [draft, setDraft] = useState<State["plan"] | null>(null);
  const [error, setError] = useState("");
  const [variation, setVariation] = useState(0);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const hasExisting = Object.keys(data.plan).some((k) => k.startsWith(week + "|"));

  async function applyDraft() {
    if (!draft) return;
    await onSave({ ...data, plan: mergeWeek(data.plan, week, draft) });
    setDraft(null);
    setConfirmReplace(false);
    onApplied?.();
  }

  return (
    <section className="generator">
      <span className="eyebrow">{tr("MENOS DECISIONES, MÁS ORGANIZACIÓN", "FEWER DECISIONS, BETTER PLANNING")}</span>
      <h2>{tr("Tu semana de comidas, en un paso.", "Your weekly menu in one step.")}</h2>
      <p className="muted">
        {data.preferences.diet === "vegetariana" ? tr("Vegetariana", "Vegetarian") : tr("Keto variada", "Varied keto")}{" "}
        · {tr(`hasta ${data.preferences.maxMinutes} minutos`, `up to ${data.preferences.maxMinutes} min`)} ·{" "}
        {data.preferences.servings} {tr("porciones", "servings")}.{" "}
        {data.preferences.exclusions.length
          ? `${tr("Sin", "Excluding")}: ${data.preferences.exclusions.map(exclusionLabel).join(", ")}.`
          : ""}
      </p>
      <button
        type="button"
        className="primary"
        onClick={() => {
          try {
            setDraft(generatePlan(week, data.preferences, variation));
            setVariation(variation + 1);
            setError("");
            setConfirmReplace(false);
          } catch (e) {
            setDraft(null);
            setError(e instanceof Error ? e.message : tr("No se pudo generar el menú.", "Could not generate menu."));
          }
        }}
      >
        {draft
          ? tr("Probar otra combinación", "Try another combination")
          : tr("Generar plan semanal sin IA", "Generate weekly plan (no AI)")}
      </button>

      <AiPanel
        key={week}
        week={week}
        onDraft={(plan) => {
          setDraft(plan);
          setError("");
          setConfirmReplace(false);
        }}
      />

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {draft && (
        <>
          <div className="plan-preview">
            {days.map((d, i) => {
              const entries = meals.map((meal) => ({ meal, item: draft[`${week}|${i}|${meal}`] }));
              const kcal = entries.reduce(
                (n, { item }) => n + (recipes.find((r) => r.id === item.recipe)?.kcal ?? 0) * item.servings,
                0
              );
              const carbs = entries.reduce(
                (n, { item }) => n + (recipes.find((r) => r.id === item.recipe)?.carbs ?? 0) * item.servings,
                0
              );
              return (
                <div key={d}>
                  <h3>{dayLabel(d)}</h3>
                  {entries.map(({ meal, item }) => {
                    const rec = recipes.find((r) => r.id === item.recipe);
                    return (
                      <p key={meal}>
                        <b>{mealLabel(meal)}</b>
                        <span>
                          {rec ? recipeName(rec) : ""} · {item.servings} {tr("porción/es", "serving(s)")}
                        </span>
                      </p>
                    );
                  })}
                  <small className="tabular">
                    {Math.round(kcal)} kcal · {Math.round(carbs)} g {tr("carb estimados", "carbs est.")}
                  </small>
                </div>
              );
            })}
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            {tr(
              `Vista previa para la semana del ${week}. Aplicar reemplaza únicamente esa semana y recalcula su lista de compras. No registra alimentos consumidos ni fija metas de calorías.`,
              `Preview for week of ${week}. Applying replaces only that week and recalculates its shopping list. Does not log consumed food or set calorie targets.`
            )}
          </p>

          {confirmReplace ? (
            <div className="inline-confirm" role="alert">
              <span>
                {tr(
                  `Ya tenés comidas cargadas en la semana del ${week}. ¿Querés reemplazarlas por esta propuesta?`,
                  `You already have meals planned for week of ${week}. Replace them with this proposal?`
                )}
              </span>
              <div className="button-row">
                <button type="button" className="primary" onClick={applyDraft}>
                  {tr("Sí, reemplazar semana", "Yes, replace week")}
                </button>
                <button type="button" className="secondary" onClick={() => setConfirmReplace(false)}>
                  {tr("Cancelar", "Cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="button-row" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  if (hasExisting) setConfirmReplace(true);
                  else applyDraft();
                }}
              >
                {tr("Aplicar a esta semana", "Apply to this week")}
              </button>
              <button type="button" className="secondary" onClick={() => setDraft(null)}>
                {tr("Descartar", "Discard")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
