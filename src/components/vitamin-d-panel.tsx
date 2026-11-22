"use client";
import { useState } from "react";
import { FlaskConical, Calculator, Trash2, ExternalLink, Sun } from "lucide-react";
import { VitaminDData, nominalMED, nmol, theoreticalVitaminD } from "@/lib/vitamin-d";
import { useI18n } from "@/lib/i18n";
import MetricChart from "./metric-chart";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function VitaminDPanel({
  data,
  onSave,
  onDeleteLab,
  currentUV,
}: {
  data: VitaminDData;
  onSave: (d: VitaminDData) => Promise<void>;
  onDeleteLab?: (id: string) => void;
  currentUV?: number | null;
}) {
  const { tr, fmt } = useI18n();
  const [result, setResult] = useState<ReturnType<typeof theoreticalVitaminD> | null>(null);
  const [error, setError] = useState("");
  const [uvInput, setUvInput] = useState("");
  const [med, setMed] = useState("");
  const [reference, setReference] = useState("");
  const [outdoors, setOutdoors] = useState(false);

  const labs = [...data.labs].sort((a, b) => a.date.localeCompare(b.date));
  const last = labs.at(-1);

  return (
    <div className="vitamin-d-module">
      <section className="card">
        <span className="eyebrow">
          {tr("EXPLORACIÓN DEL MODELO · NO INDICACIÓN DE EXPOSICIÓN", "MODEL EXPLORATION · NOT EXPOSURE ADVICE")}
        </span>
        <h2>
          <Calculator size={20} /> {tr("Calculadora teórica de vitamina D", "Theoretical Vitamin D calculator")}
        </h2>
        <p className="muted small">
          {tr(
            "Ingresá un escenario para explorar el modelo publicado (Scientific Reports 2024). No recomienda tiempo de sol ni reemplaza un análisis sanguíneo.",
            "Enter a scenario to explore the published model (Scientific Reports 2024). It does not recommend sun duration or replace blood testing."
          )}
        </p>

        {currentUV !== null && currentUV !== undefined && (
          <button
            type="button"
            className="uv-bridge-chip"
            onClick={() => {
              setUvInput(String(Math.round(currentUV * 10) / 10));
              setResult(null);
            }}
          >
            <Sun size={15} /> {tr("Usar UV actual de tu zona", "Use current local UV")} ({fmt(currentUV)})
          </button>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setResult(null);
            if (!outdoors) {
              setError(
                tr(
                  "Este modelo no se aplica a exposición a través de una ventana.",
                  "This model does not apply to sun exposure through window glass."
                )
              );
              return;
            }
            try {
              const f = new FormData(e.currentTarget);
              setResult(
                theoreticalVitaminD(Number(uvInput), Number(f.get("minutes")), Number(f.get("area")), Number(med))
              );
            } catch (err) {
              setError(err instanceof Error ? err.message : tr("Revisá los campos.", "Please check your inputs."));
            }
          }}
          onChange={() => setResult(null)}
        >
          <div className="form-grid">
            <label>
              {tr("Índice UV de referencia", "Reference UV index")}
              <input
                name="uv"
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={uvInput}
                onChange={(e) => setUvInput(e.target.value)}
                placeholder={tr("Ingresá el UV", "Enter UV")}
                required
              />
            </label>
            <label>
              {tr("Duración del escenario (min)", "Scenario duration (min)")}
              <input
                name="minutes"
                type="number"
                min="0"
                max="120"
                step="0.5"
                placeholder={tr("Tiempo a evaluar", "Minutes to evaluate")}
                required
              />
            </label>
            <label>
              {tr("Superficie corporal expuesta (%)", "Exposed body surface (%)")}
              <input
                name="area"
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                placeholder={tr("Porcentaje estimado", "Estimated %")}
                required
              />
            </label>
            <label>
              {tr("Referencia nominal de piel", "Nominal skin reference")}
              <select
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  setMed(nominalMED.find((v) => v.type === e.target.value)?.med.toString() ?? "");
                }}
              >
                <option value="">{tr("Ingresar MED manualmente", "Enter MED manually")}</option>
                {nominalMED.map((v) => (
                  <option key={v.type} value={v.type}>
                    {tr("Tipo", "Type")} {v.type} · {tr("MED nominal", "Nominal MED")} {v.med} J/m²
                  </option>
                ))}
              </select>
            </label>
            <label>
              {tr("MED del escenario (J/m²)", "Scenario MED (J/m²)")}
              <input
                type="number"
                name="med"
                min="100"
                max="2000"
                step="1"
                value={med}
                onChange={(e) => {
                  setMed(e.target.value);
                  setReference("");
                }}
                required
                placeholder={tr("Parámetro del modelo", "Model parameter")}
              />
            </label>
          </div>
          <p className="small muted">
            {tr(
              "MED es la dosis mínima eritematógena. Los valores nominales son referencias publicadas por D-Minder; no son una medición de tu piel ni garantizan un umbral seguro.",
              "MED is the Minimal Erythemal Dose. Nominal values are reference approximations published by D-Minder, not personal skin measurements."
            )}
          </p>
          <label className="inline-check">
            <input type="checkbox" checked={outdoors} onChange={(e) => setOutdoors(e.target.checked)} />
            {tr(
              "El escenario es al aire libre, sin vidrio entre el sol y la piel.",
              "Scenario is outdoors, with no glass between sun and skin."
            )}
          </label>
          <button type="submit" className="secondary vitamin-calculate">
            <Calculator size={16} /> {tr("Calcular escenario teórico", "Calculate theoretical scenario")}
          </button>
        </form>

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        {result && (
          <div className="vitamin-result" role="status">
            {result.withinLowDose ? (
              <>
                <span className="eyebrow">
                  {tr("RESULTADO TEÓRICO · NO MEDICIÓN PERSONAL", "THEORETICAL OUTPUT · NOT PERSONAL MEASUREMENT")}
                </span>
                <strong>
                  ≈ {fmt(Math.round(result.theoreticalIU / 50) * 50, 0)} {tr("UI", "IU")}
                </strong>
                <p>
                  {tr(
                    "Equivalencia del modelo para los parámetros ingresados. No se suma a tus ingestas ni se convierte en un nivel sanguíneo.",
                    "Model equivalence for entered parameters. Not added to dietary intake and does not predict blood levels."
                  )}
                </p>
              </>
            ) : (
              <>
                <strong>{tr("Fuera del rango explorado", "Outside explored range")}</strong>
                <p>
                  {tr(
                    "El escenario supera un cuarto de la MED nominal. Esta calculadora limita la extrapolación a baja dosis y no devuelve UI para ese caso. Ese límite tampoco es un tiempo seguro para exponerse.",
                    "Scenario exceeds ¼ nominal MED. This calculator caps extrapolation at low doses and returns no IU above that threshold; that cap is not a safe exposure limit."
                  )}
                </p>
              </>
            )}
            <small>
              {tr("Dosis UV eritemática teórica", "Theoretical erythemal UV dose")}: {fmt(result.erythemalDose)} J/m² ·{" "}
              {fmt(result.sed, 2)} SED.
            </small>
          </div>
        )}

        <details className="vitamin-method">
          <summary>{tr("Diferencia entre UI y 25(OH)D, fórmula y supuestos", "IU vs 25(OH)D, formula & assumptions")}</summary>
          <div className="vitamin-distinction">
            <div>
              <b>{tr("UI (IU)", "IU")}</b>
              <span>
                {tr(
                  "Cantidad o equivalencia teórica del modelo. No mide tu producción real ni corrige deficiencias.",
                  "Theoretical model output. Does not measure personal synthesis or confirm deficiency correction."
                )}
              </span>
            </div>
            <div>
              <b>nmol/L · ng/mL</b>
              <span>
                {tr(
                  "Concentración sanguínea de 25(OH)D obtenida de un análisis real de laboratorio.",
                  "Blood 25(OH)D concentration obtained from a real clinical lab report."
                )}
              </span>
            </div>
          </div>
          <p className="vitamin-care">
            {tr(
              "Una estimación solar no confirma que se haya corregido una deficiencia. Si tenés un resultado bajo, revisalo con un profesional; no uses el cálculo para decidir tratamiento o prolongar la exposición al sol.",
              "A solar estimate never confirms deficiency correction. Review low lab values with a healthcare professional and do not use this tool to extend sun exposure."
            )}
          </p>
          <p>
            {tr(
              "Modelo publicado en Scientific Reports (2024), ecuación 13: UI teóricas = 21.120 × (UVI × segundos / 40) × fracción de piel expuesta / MED. Limitado a baja dosis (hasta ¼ MED nominal). No reproduce el algoritmo de D-Minder ni ajusta edad, ozono, ángulo solar, protector o ropa.",
              "Published in Scientific Reports (2024), Eq. 13: theoretical IU = 21,120 × (UVI × seconds / 40) × exposed skin fraction / MED. Capped at low dose (≤ ¼ nominal MED). Does not replicate D-Minder's engine or adjust for age, ozone, solar angle, sunscreen, or clothing."
            )}
          </p>
          <p>
            <a href="https://www.nature.com/articles/s41598-024-54188-5" target="_blank" rel="noopener noreferrer">
              {tr("Publicación (ecuación 13)", "Paper (Eq. 13)")}
            </a>{" "}
            ·{" "}
            <a href="https://dminder.info/science" target="_blank" rel="noopener noreferrer">
              {tr("Referencia D-Minder", "D-Minder science reference")}{" "}
              <ExternalLink size={12} style={{ display: "inline" }} />
            </a>
          </p>
        </details>
      </section>

      <section id="vitamin-d-labs" className="card">
        <span className="eyebrow">{tr("SOLO RESULTADOS REALES DE LABORATORIO", "REAL LAB RESULTS ONLY")}</span>
        <h2>
          <FlaskConical size={20} /> {tr("Mis análisis de 25(OH)D", "My 25(OH)D lab results")}
        </h2>
        <p className="muted small">
          {tr(
            "Registrá el valor y la unidad tal como figuran en tu informe (1 ng/mL = 2,5 nmol/L). No se generan diagnósticos ni valores estimados.",
            "Log the value and unit exactly as printed on your lab report (1 ng/mL = 2.5 nmol/L). No diagnoses or synthetic values are generated."
          )}
        </p>

        {last && (
          <div className="vitamin-latest">
            <span>
              {tr("Último análisis", "Latest lab")} · {last.date}
            </span>
            <strong>
              {fmt(last.value, 2)} {last.unit}
            </strong>
            <small>
              {fmt(nmol(last.value, last.unit), 2)} nmol/L · {fmt(nmol(last.value, last.unit) / 2.5, 2)} ng/mL
            </small>
          </div>
        )}

        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onSave({
              labs: [
                ...data.labs,
                {
                  id: crypto.randomUUID(),
                  date: String(f.get("date")),
                  value: Number(f.get("value")),
                  unit: String(f.get("unit")) as "nmol/L" | "ng/mL",
                  note: String(f.get("note") ?? ""),
                },
              ],
            });
            e.currentTarget.reset();
          }}
        >
          <label>
            {tr("Fecha del análisis", "Lab date")}
            <input name="date" type="date" max={today()} defaultValue={today()} required />
          </label>
          <label>
            {tr("Valor de 25(OH)D", "25(OH)D value")}
            <input name="value" type="number" step="0.01" min="0.01" max="2000" required />
          </label>
          <label>
            {tr("Unidad del informe", "Report unit")}
            <select name="unit" defaultValue="nmol/L">
              <option>nmol/L</option>
              <option>ng/mL</option>
            </select>
          </label>
          <label>
            {tr("Nota (opcional)", "Note (optional)")}
            <input name="note" maxLength={300} placeholder={tr("Ej. control de laboratorio", "e.g. annual blood panel")} />
          </label>
          <button className="primary">{tr("Guardar análisis", "Save lab result")}</button>
        </form>

        {labs.length > 0 ? (
          <>
            <MetricChart
              data={labs.map((l) => ({ date: l.date, nmol: Number(nmol(l.value, l.unit).toFixed(2)) }))}
              xKey="date"
              yKey="nmol"
              seriesName={tr("25(OH)D registrada", "Logged 25(OH)D")}
              unit="nmol/L"
              color="var(--accent)"
              height={220}
              yDomain={[0, "auto"]}
            />
            {[...labs].reverse().map((l) => (
              <div className="record" key={l.id}>
                <div>
                  <b>
                    {l.date} · {fmt(l.value, 2)} {l.unit}
                  </b>
                  <p className="small muted" style={{ margin: "4px 0 0" }}>
                    {fmt(nmol(l.value, l.unit), 2)} nmol/L · {fmt(nmol(l.value, l.unit) / 2.5, 2)} ng/mL
                    {l.note ? ` · ${l.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${tr("Eliminar análisis del", "Delete lab result from")} ${l.date}`}
                  onClick={() => {
                    if (onDeleteLab) onDeleteLab(l.id);
                    else onSave({ labs: data.labs.filter((x) => x.id !== l.id) });
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </>
        ) : (
          <p className="empty">
            {tr(
              "Todavía no hay análisis registrados. No se inventan valores de laboratorio.",
              "No lab results logged yet. Lab values are never fabricated."
            )}
          </p>
        )}

        <p className="small muted" style={{ marginTop: 14 }}>
          {tr(
            "Los análisis se guardan en tu cuenta y se incluyen en tus copias JSON. No se envían a Groq, D-Minder ni Open-Meteo.",
            "Lab results are stored in your account and included in JSON exports. They are never sent to Groq, D-Minder, or Open-Meteo."
          )}
        </p>
      </section>

      <p className="uv-source">
        {tr("Información sobre vitamina D y unidades", "Vitamin D reference & units")}:{" "}
        <a
          href="https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/"
          target="_blank"
          rel="noopener noreferrer"
        >
          NIH · Office of Dietary Supplements
        </a>
        .{" "}
        {tr(
          "La producción solar y la concentración sanguínea no tienen una conversión directa universal.",
          "Solar synthesis and blood concentration have no universal direct conversion."
        )}
      </p>
    </div>
  );
}
