"use client";
import { useEffect, useState } from "react";
import { State } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

export default function AiPanel({ week, onDraft }: { week: string; onDraft: (plan: State["plan"]) => void }) {
  const { tr } = useI18n();
  const [config, setConfig] = useState<{ enabled: boolean; providers: string[]; dailyLimit: number }>({
    enabled: false,
    providers: [],
    dailyLimit: 5,
  });
  const [provider, setProvider] = useState("groq");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");

  useEffect(() => {
    fetch("/api/ai")
      .then((r) => r.json())
      .then((b) => {
        if (b.providers) setConfig(b);
      })
      .catch(() => {});
  }, []);

  const targetName =
    provider === "auto"
      ? tr("Groq y/o Fireworks", "Groq and/or Fireworks")
      : provider === "groq"
        ? "Groq"
        : "Fireworks";

  return (
    <div className="ai-generator">
      <span className="eyebrow">{tr("ASISTENTE DE COMIDAS", "MEAL ASSISTANT")}</span>
      <h3>{tr("Una propuesta con inteligencia artificial", "An AI-assisted proposal")}</h3>
      <p className="small muted">
        {tr(
          "Se envían únicamente tus preferencias de alimentación, exclusiones, tiempo, porciones y el catálogo de recetas. No se envían tu email, medidas ni historial. Cada solicitud puede consumir crédito del proveedor.",
          "Only your diet preferences, exclusions, prep time, servings, and recipe catalog are sent. Your email, body metrics, and history are never sent. Each request may consume provider credits."
        )}
      </p>
      <label>
        {tr("Proveedor", "Provider")}
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setConsent(false);
          }}
        >
          <option value="groq">Groq</option>
          <option value="fireworks">Fireworks</option>
          <option value="auto">{tr("Automático: proveedores disponibles", "Auto: available providers")}</option>
        </select>
      </label>
      <label className="inline-check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        {tr(
          `Autorizo enviar esas preferencias a ${targetName} para generar esta propuesta.`,
          `I authorize sending these preferences to ${targetName} to generate this proposal.`
        )}
      </label>
      {!config.enabled || !config.providers.length ? (
        <p className="muted small">
          {tr("IA pendiente de configuración. El generador sin IA está disponible.", "AI is not configured yet. The non-AI generator is available.")}
        </p>
      ) : provider !== "auto" && !config.providers.includes(provider) ? (
        <p className="muted small">
          {tr("Este proveedor todavía no está configurado.", "This provider is not configured yet.")}
        </p>
      ) : (
        <button
          type="button"
          disabled={!consent || busy}
          className="secondary"
          onClick={async () => {
            setError("");
            setSource("");
            setBusy(true);
            try {
              const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ week, provider, consent }),
              });
              const b = await res.json();
              if (!res.ok) throw Error(b.error);
              onDraft(b.plan);
              setSource(
                tr(
                  `Propuesta recibida de ${b.provider === "groq" ? "Groq" : "Fireworks"}. Revisala antes de aplicar.`,
                  `Proposal received from ${b.provider === "groq" ? "Groq" : "Fireworks"}. Review before applying.`
                )
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : tr("No se pudo conectar.", "Could not connect."));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? tr("Preparando propuesta…", "Preparing proposal…") : tr("Generar con IA", "Generate with AI")}
        </button>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {source && (
        <p role="status" className="green">
          {source}
        </p>
      )}
      <p className="small muted">
        {tr(
          `Límite: ${config.dailyLimit} solicitudes diarias por cuenta. Se validan las recetas y exclusiones antes de mostrar la propuesta.`,
          `Limit: ${config.dailyLimit} daily requests per account. Recipes and exclusions are validated before showing the preview.`
        )}
      </p>
    </div>
  );
}
