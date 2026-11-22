"use client";
import { useEffect, useMemo, useState } from "react";
import { History, Search, ChevronLeft, ChevronRight, Trash2, Download, TrendingUp, Pencil } from "lucide-react";
import { State } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import MetricChart from "./metric-chart";

type Workout = State["workouts"][number];
const timed = (name: string) => /caminata|movilidad|walk|mobility/i.test(name);

export default function WorkoutHistory({
  workouts,
  exercise,
  onExercise,
  remove,
  update,
}: {
  workouts: Workout[];
  exercise: string;
  onExercise: (name: string) => void;
  remove: (id: string) => void;
  update?: (workout: Workout) => void;
}) {
  const { tr, fmt, shortDate, longDate, locale, exerciseName } = useI18n();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [week, setWeek] = useState("");
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState("newest");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Workout | null>(null);
  const [editing, setEditing] = useState<Workout | null>(null);

  const names = useMemo(
    () =>
      [...new Set([...workouts.map((w) => w.exercise), ...(exercise ? [exercise] : [])])].sort((a, b) =>
        exerciseName(a).localeCompare(exerciseName(b), locale)
      ),
    [workouts, exercise, exerciseName, locale]
  );

  const invalid = !!from && !!to && from > to;

  const filtered = useMemo(
    () =>
      invalid
        ? []
        : workouts
            .map((w, index) => ({ ...w, index }))
            .filter(
              (w) =>
                (!exercise || w.exercise === exercise) &&
                (!from || w.date >= from) &&
                (!to || w.date <= to) &&
                (!week || w.week === Number(week)) &&
                (!query ||
                  (w.exercise + " " + exerciseName(w.exercise))
                    .toLocaleLowerCase(locale)
                    .includes(query.toLocaleLowerCase(locale)))
            )
            .sort((a, b) =>
              order === "oldest"
                ? a.date.localeCompare(b.date) || a.index - b.index
                : order === "load"
                  ? b.load - a.load || b.date.localeCompare(a.date) || b.index - a.index
                  : b.date.localeCompare(a.date) || b.index - a.index
            ),
    [workouts, exercise, from, to, week, query, order, invalid, exerciseName, locale]
  );

  useEffect(() => {
    setPage(1);
  }, [exercise, from, to, week, query, order]);

  const pages = Math.max(1, Math.ceil(filtered.length / 15));
  const activePage = Math.min(page, pages);
  const visible = filtered.slice((activePage - 1) * 15, activePage * 15);
  const chronological = [...filtered].sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);
  const last = chronological.at(-1);
  const maxLoad = filtered.length ? Math.max(...filtered.map((w) => w.load)) : 0;
  const chart = Object.values(
    chronological.reduce<Record<string, { date: string; load: number }>>((acc, w) => {
      acc[w.date] ??= { date: w.date, load: 0 };
      acc[w.date].load = Math.max(acc[w.date].load, w.load);
      return acc;
    }, {})
  );

  function clear() {
    onExercise("");
    setFrom("");
    setTo("");
    setWeek("");
    setQuery("");
    setOrder("newest");
  }

  function download() {
    const header = tr(
      "Fecha;Ejercicio;Series;Repeticiones o minutos;Carga externa kg;Semana\n",
      "Date;Exercise;Sets;Reps or minutes;External load kg;Week\n"
    );
    const quote = (s: string) => '"' + s.replace(/"/g, '""') + '"';
    const csv =
      header +
      filtered
        .map((w) => [w.date, quote(exerciseName(w.exercise)), w.sets, w.reps, w.load, w.week].join(";"))
        .join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = tr("ketofit-entrenamiento.csv", "ketofit-workouts.csv");
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section id="exercise-history" className="card exercise-history">
      <div className="history-heading">
        <div>
          <span className="eyebrow">{tr("TU PROGRESO, REGISTRO A REGISTRO", "YOUR PROGRESS, LOG BY LOG")}</span>
          <h2>
            <History size={20} /> {tr("Historial de ejercicios", "Workout history")}
          </h2>
        </div>
        <button type="button" className="secondary" disabled={!filtered.length} onClick={download}>
          <Download size={16} /> {tr("Exportar CSV", "Export CSV")}
        </button>
      </div>
      <p className="muted">
        {tr(
          "Consultá lo que registraste en casa o en el gimnasio. Elegí un ejercicio para analizar su curva de carga.",
          "Browse everything logged at home or at the gym. Pick an exercise to inspect its load progression."
        )}
      </p>

      <div className="history-filters">
        <label>
          {tr("Ejercicio", "Exercise")}
          <select value={exercise} onChange={(e) => onExercise(e.target.value)}>
            <option value="">{tr("Todos los ejercicios", "All exercises")}</option>
            {names.map((name) => (
              <option key={name} value={name}>
                {exerciseName(name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Desde", "From")}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
        </label>
        <label>
          {tr("Hasta", "To")}
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} />
        </label>
        <label>
          {tr("Semana del programa", "Program week")}
          <select value={week} onChange={(e) => setWeek(e.target.value)}>
            <option value="">{tr("Todas las semanas", "All weeks")}</option>
            {Array.from({ length: 8 }, (_, i) => (
              <option key={i} value={i + 1}>
                {tr("Semana", "Week")} {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Buscar por nombre", "Search by name")}
          <input
            type="search"
            placeholder={tr("Ej. press, sentadilla…", "e.g. press, squat…")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          {tr("Ordenar", "Sort")}
          <select value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="newest">{tr("Más recientes", "Newest first")}</option>
            <option value="oldest">{tr("Más antiguos", "Oldest first")}</option>
            <option value="load">{tr("Mayor carga", "Heaviest load")}</option>
          </select>
        </label>
      </div>

      <div className="history-result-count">
        <span>
          {filtered.length} {tr(filtered.length === 1 ? "registro" : "registros", filtered.length === 1 ? "entry" : "entries")} ·{" "}
          {new Set(filtered.map((w) => w.date)).size} {tr("días de entrenamiento", "training days")}
        </span>
        <button type="button" className="text-button" onClick={clear}>
          {tr("Limpiar filtros", "Clear filters")}
        </button>
      </div>

      {invalid && (
        <p role="alert" className="error">
          {tr("La fecha Desde debe ser anterior o igual a Hasta.", "The From date must be on or before To.")}
        </p>
      )}

      {exercise && filtered.length > 0 && (
        <>
          <div className="history-summary">
            <div>
              <span>{tr("Último registro", "Latest log")}</span>
              <b>{last ? longDate(last.date) : "—"}</b>
              <small>
                {last?.sets} × {last?.reps} {timed(exercise) ? "min" : "reps"}
              </small>
            </div>
            <div>
              <span>{tr("Última carga externa", "Latest external load")}</span>
              <b>
                {fmt(last?.load ?? 0)} <small>kg</small>
              </b>
              <small>{tr("Según tu registro más reciente", "From your most recent entry")}</small>
            </div>
            <div>
              <span>{tr("Mayor carga registrada", "Peak recorded load")}</span>
              <b>
                {fmt(maxLoad)} <small>kg</small>
              </b>
              <small>{tr("Dentro de los filtros elegidos", "Within selected filters")}</small>
            </div>
          </div>

          {!timed(exercise) && (
            <div className="history-chart">
              <h3>
                <TrendingUp size={18} /> {tr("Evolución de carga", "Load progression")} · {exerciseName(exercise)}
              </h3>
              <p className="small muted">
                {tr(
                  "Carga externa máxima por día (kg). Cero significa sin carga externa registrada; no incluye peso corporal.",
                  "Max external load per day (kg). Zero means no external load logged; excludes bodyweight."
                )}
              </p>
              <MetricChart
                data={chart}
                xKey="date"
                yKey="load"
                seriesName={tr("Carga externa", "External load")}
                unit="kg"
                color="var(--accent)"
                height={230}
                yDomain={[0, "auto"]}
                xFormatter={(d) => shortDate(String(d))}
                tooltipLabelFormatter={(d) => longDate(String(d))}
              />
            </div>
          )}
        </>
      )}

      {visible.length ? (
        <div className="history-records">
          {visible.map((w) => (
            <article className="history-item" key={w.id}>
              <div className="history-date">
                <strong>{new Date(w.date + "T12:00:00").getDate()}</strong>
                <small>
                  {new Date(w.date + "T12:00:00").toLocaleDateString(locale, { month: "short", year: "numeric" })}
                </small>
              </div>
              <div className="history-exercise">
                <button type="button" className="history-name" onClick={() => onExercise(w.exercise)}>
                  {exerciseName(w.exercise)}
                </button>
                <p>
                  <b>{w.sets}</b> {tr("series", "sets")} · <b>{w.reps}</b>{" "}
                  {timed(w.exercise) ? tr("min por serie", "min per set") : tr("repeticiones", "reps")} ·{" "}
                  <b>{fmt(w.load)} kg</b>
                </p>
                <small>
                  {tr("Semana", "Week")} {w.week}
                </small>
              </div>
              <div className="history-actions">
                <button type="button" className="secondary" onClick={() => setDetail(w)}>
                  {tr("Ver detalle", "Details")}
                </button>
                {update && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`${tr("Editar registro de", "Edit entry for")} ${exerciseName(w.exercise)} ${w.date}`}
                    onClick={() => setEditing(w)}
                  >
                    <Pencil size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${tr("Eliminar registro de", "Delete entry for")} ${exerciseName(w.exercise)} ${w.date}`}
                  onClick={() => remove(w.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Search size={27} />
          <p>
            {workouts.length
              ? tr(
                  "No hay registros con estos filtros. Probá con otro ejercicio o período.",
                  "No entries match these filters. Try another exercise or date range."
                )
              : tr(
                  "Todavía no registraste ejercicios. Guardá tu primera sesión desde la rutina para consultarla acá.",
                  "No workouts logged yet. Log your first session from your routine to view it here."
                )}
          </p>
        </div>
      )}

      {pages > 1 && (
        <div className="history-pagination">
          <button
            type="button"
            className="secondary"
            disabled={activePage === 1}
            onClick={() => setPage(activePage - 1)}
          >
            <ChevronLeft size={16} /> {tr("Anterior", "Previous")}
          </button>
          <span>
            {activePage} {tr("de", "of")} {pages}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={activePage === pages}
            onClick={() => setPage(activePage + 1)}
          >
            {tr("Siguiente", "Next")} <ChevronRight size={16} />
          </button>
        </div>
      )}

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <section
            className="card history-detail"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Detalle de ejercicio", "Workout detail")}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="eyebrow">{tr("REGISTRO DE ENTRENAMIENTO", "WORKOUT ENTRY")}</span>
            <h2>{exerciseName(detail.exercise)}</h2>
            <p>{longDate(detail.date)}</p>
            <dl>
              <div>
                <dt>{tr("Series", "Sets")}</dt>
                <dd>{detail.sets}</dd>
              </div>
              <div>
                <dt>
                  {timed(detail.exercise)
                    ? tr("Minutos por serie", "Minutes per set")
                    : tr("Repeticiones por serie", "Reps per set")}
                </dt>
                <dd>{detail.reps}</dd>
              </div>
              <div>
                <dt>{tr("Carga externa", "External load")}</dt>
                <dd>{fmt(detail.load)} kg</dd>
              </div>
              <div>
                <dt>{tr("Semana del programa", "Program week")}</dt>
                <dd>{detail.week}</dd>
              </div>
            </dl>
            <button type="button" className="primary" autoFocus onClick={() => setDetail(null)}>
              {tr("Cerrar detalle", "Close")}
            </button>
          </section>
        </div>
      )}

      {editing && update && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <section
            className="card history-detail"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Editar registro de entrenamiento", "Edit workout entry")}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="eyebrow">{tr("ACTUALIZAR REGISTRO", "UPDATE ENTRY")}</span>
            <h2>{tr("Editar entrenamiento", "Edit workout")}</h2>
            <form
              className="form-grid"
              style={{ gridTemplateColumns: "1fr 1fr" }}
              onSubmit={(e) => {
                e.preventDefault();
                update(editing);
                setEditing(null);
              }}
            >
              <label className="full-width">
                {tr("Ejercicio", "Exercise")}
                <input
                  value={editing.exercise}
                  maxLength={100}
                  onChange={(e) => setEditing({ ...editing, exercise: e.target.value })}
                  required
                />
              </label>
              <label>
                {tr("Fecha", "Date")}
                <input
                  type="date"
                  value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  required
                />
              </label>
              <label>
                {tr("Semana", "Week")}
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={editing.week}
                  onChange={(e) => setEditing({ ...editing, week: Number(e.target.value) || 1 })}
                  required
                />
              </label>
              <label>
                {tr("Series", "Sets")}
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editing.sets}
                  onChange={(e) => setEditing({ ...editing, sets: Number(e.target.value) || 1 })}
                  required
                />
              </label>
              <label>
                {timed(editing.exercise) ? tr("Minutos", "Minutes") : tr("Repeticiones", "Reps")}
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={editing.reps}
                  onChange={(e) => setEditing({ ...editing, reps: Number(e.target.value) || 1 })}
                  required
                />
              </label>
              <label className="full-width">
                {tr("Carga externa (kg)", "External load (kg)")}
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={1000}
                  value={editing.load}
                  onChange={(e) => setEditing({ ...editing, load: Number(e.target.value) || 0 })}
                  required
                />
              </label>
              <div className="button-row full-width">
                <button type="submit" className="primary">
                  {tr("Guardar cambios", "Save changes")}
                </button>
                <button type="button" className="secondary" onClick={() => setEditing(null)}>
                  {tr("Cancelar", "Cancel")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
