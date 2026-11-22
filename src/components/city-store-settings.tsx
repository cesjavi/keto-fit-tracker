"use client";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Sparkles, Check, Trash2 } from "lucide-react";
import { ShoppingConfig, CityLocation, storeCatalog, normalize, cityLocationSchema, customStoreSchema } from "@/lib/stores";
import { useI18n } from "@/lib/i18n";

const empty = (): CityLocation => ({
  id: "",
  country: "Argentina",
  region: "",
  city: "",
  storeIds: ["coto", "carrefour", "dia"],
  customStores: [],
  preferredId: "coto",
});

export default function CityStoreSettings({
  config,
  onSave,
}: {
  config: ShoppingConfig;
  onSave: (config: ShoppingConfig) => Promise<void>;
}) {
  const { tr } = useI18n();
  const active = config.locations.find((l) => l.id === config.activeId) ?? null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CityLocation>(empty);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  useEffect(() => {
    setEditing(false);
    setError("");
  }, [config]);

  useEffect(() => {
    fetch("/api/ai")
      .then((r) => r.json())
      .then((b) => setReady(b.enabled === true && b.providers?.includes("groq")))
      .catch(() => {});
  }, []);

  const catalog = useMemo(
    () => storeCatalog.filter((s) => normalize(s.country) === normalize(draft.country)),
    [draft.country]
  );
  const available = [...catalog, ...draft.customStores];
  const selected = available.filter((s) => draft.storeIds.includes(s.id));

  function begin(location: CityLocation | null) {
    setDraft(location ? structuredClone(location) : empty());
    setError("");
    setSuggestions(null);
    setConsent(false);
    setCustomName("");
    setCustomUrl("");
    setEditing(true);
  }

  function changeLocation(field: "country" | "region" | "city", value: string) {
    setDraft({ ...draft, [field]: value });
    setSuggestions(null);
    setConsent(false);
    setError("");
  }

  function toggle(id: string) {
    const ids = draft.storeIds.includes(id) ? draft.storeIds.filter((x) => x !== id) : [...draft.storeIds, id];
    setDraft({ ...draft, storeIds: ids, preferredId: ids.includes(draft.preferredId) ? draft.preferredId : ids[0] ?? "" });
  }

  return (
    <section className="city-store-settings">
      <div className="city-setting-heading">
        <div>
          <span className="eyebrow">{tr("SUPERMERCADOS POR UBICACIÓN", "SUPERMARKETS BY LOCATION")}</span>
          <h3>
            <MapPin size={19} />
            {active ? `${active.city}${active.region ? `, ${active.region}` : ""}` : tr("Configurá tu ciudad", "Set your city")}
          </h3>
          <p>
            {active
              ? `${active.country} · ${active.storeIds.length} ${tr("supermercados elegidos", "selected stores")}`
              : tr("Guardá dónde estás y elegí las tiendas que querés usar.", "Save your city and pick the stores you shop at.")}
          </p>
        </div>
        <button type="button" className="secondary" onClick={() => begin(active)}>
          {active ? tr("Editar ubicación", "Edit location") : tr("Configurar ciudad", "Configure city")}
        </button>
      </div>

      {config.locations.length > 0 && (
        <div className="city-picker">
          <label>
            {tr("Estoy comprando en", "Shopping in")}
            <select
              aria-label={tr("Ciudad para comprar", "City for shopping")}
              value={config.activeId ?? ""}
              onChange={(e) => onSave({ ...config, activeId: e.target.value || null })}
            >
              <option value="">{tr("Sin ciudad seleccionada", "No city selected")}</option>
              {config.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.city}
                  {l.region ? `, ${l.region}` : ""} · {l.country}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="secondary"
            disabled={config.locations.length >= 20}
            onClick={() => begin(null)}
          >
            <Plus size={16} /> {tr("Agregar ciudad", "Add city")}
          </button>
        </div>
      )}

      {editing && (
        <form
          className="city-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const ids = selected.map((s) => s.id);
            const existing = config.locations.find(
              (l) =>
                normalize(l.country) === normalize(draft.country) &&
                normalize(l.region) === normalize(draft.region) &&
                normalize(l.city) === normalize(draft.city)
            );
            if (existing && draft.id && existing.id !== draft.id) {
              setError(
                tr(
                  "Ya hay una ubicación con esa ciudad y provincia. Elegila desde Estoy comprando en para editarla.",
                  "A location with that city and region already exists. Select it above to edit."
                )
              );
              return;
            }
            const id = draft.id || existing?.id || crypto.randomUUID();
            const valid = cityLocationSchema.safeParse({
              ...draft,
              id,
              storeIds: ids,
              preferredId: ids.includes(draft.preferredId) ? draft.preferredId : ids[0] ?? "",
            });
            if (!valid.success) {
              setError(
                tr(
                  "Completá país y ciudad y elegí al menos un supermercado con una dirección HTTPS válida.",
                  "Fill in country and city and select at least one store with a valid HTTPS URL."
                )
              );
              return;
            }
            const locations = config.locations.some((l) => l.id === id)
              ? config.locations.map((l) => (l.id === id ? valid.data : l))
              : [...config.locations, valid.data];
            if (locations.length > 20) {
              setError(tr("Podés guardar hasta 20 ubicaciones.", "You can save up to 20 locations."));
              return;
            }
            await onSave({ activeId: id, locations });
          }}
        >
          <fieldset disabled={busy}>
            <div className="form-grid">
              <label>
                {tr("País", "Country")}
                <input
                  value={draft.country}
                  onChange={(e) => changeLocation("country", e.target.value)}
                  minLength={2}
                  maxLength={60}
                  required
                  autoComplete="country-name"
                />
              </label>
              <label>
                {tr("Provincia o región", "State or region")}
                <input
                  value={draft.region}
                  onChange={(e) => changeLocation("region", e.target.value)}
                  maxLength={80}
                  placeholder={tr("Ej. CABA, Córdoba…", "e.g. CA, NY, CABA…")}
                  autoComplete="address-level1"
                />
              </label>
              <label>
                {tr("Ciudad o localidad", "City")}
                <input
                  value={draft.city}
                  onChange={(e) => changeLocation("city", e.target.value)}
                  minLength={2}
                  maxLength={80}
                  placeholder={tr("Ej. Buenos Aires, Rosario…", "e.g. Austin, Buenos Aires…")}
                  autoComplete="address-level2"
                  required
                />
              </label>
            </div>
            <p className="small muted">
              {tr("No necesitás ingresar calle, altura ni ubicación GPS.", "No street address or GPS location required.")}
            </p>

            <h4>{tr("Tus supermercados", "Your supermarkets")}</h4>
            <p className="small muted">
              {tr(
                "Marcá los que usás en esta ciudad. El catálogo no confirma sucursales ni entregas en tu zona.",
                "Select the stores you use in this city. The catalog does not verify local branches or delivery coverage."
              )}
            </p>
            <div className="city-store-choices">
              {available.map((s) => (
                <label key={s.id}>
                  <input type="checkbox" checked={draft.storeIds.includes(s.id)} onChange={() => toggle(s.id)} />
                  <span>{s.name}</span>
                  {s.id.startsWith("custom-") && (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`${tr("Quitar", "Remove")} ${s.name}`}
                      onClick={() => {
                        const ids = draft.storeIds.filter((x) => x !== s.id);
                        setDraft({
                          ...draft,
                          customStores: draft.customStores.filter((c) => c.id !== s.id),
                          storeIds: ids,
                          preferredId: ids.includes(draft.preferredId) ? draft.preferredId : ids[0] ?? "",
                        });
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </label>
              ))}
            </div>
            {!available.length && (
              <p className="muted">
                {tr(
                  "Todavía no hay tiendas precargadas para este país. Agregá las tuyas abajo.",
                  "No preloaded stores for this country yet. Add your own below."
                )}
              </p>
            )}

            <div className="custom-store-form">
              <h4>{tr("Agregar otro supermercado", "Add custom supermarket")}</h4>
              <div className="form-grid">
                <label>
                  {tr("Nombre de la tienda", "Store name")}
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    maxLength={80}
                    placeholder={tr("Supermercado de tu ciudad", "Your local supermarket")}
                  />
                </label>
                <label>
                  {tr("Sitio web oficial (HTTPS)", "Official website (HTTPS)")}
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    maxLength={500}
                    placeholder="https://…"
                  />
                </label>
                <button
                  type="button"
                  className="secondary"
                  disabled={draft.customStores.length >= 12}
                  onClick={() => {
                    const parsed = customStoreSchema.safeParse({
                      id: "custom-" + crypto.randomUUID(),
                      name: customName,
                      home: customUrl.trim(),
                    });
                    if (!parsed.success) {
                      setError(
                        tr(
                          "Ingresá el nombre y una URL HTTPS válida, sin usuario ni contraseña.",
                          "Enter a store name and a valid HTTPS URL without credentials."
                        )
                      );
                      return;
                    }
                    if (available.some((s) => normalize(s.name) === normalize(parsed.data.name))) {
                      setError(tr("Ya hay un supermercado con ese nombre.", "A store with that name already exists."));
                      return;
                    }
                    setDraft({
                      ...draft,
                      customStores: [...draft.customStores, parsed.data],
                      storeIds: [...draft.storeIds, parsed.data.id],
                      preferredId: draft.preferredId || parsed.data.id,
                    });
                    setCustomName("");
                    setCustomUrl("");
                    setError("");
                  }}
                >
                  <Plus size={16} /> {tr("Agregar tienda", "Add store")}
                </button>
              </div>
            </div>

            <div className="city-ai">
              <span className="eyebrow">{tr("AYUDA OPCIONAL", "OPTIONAL ASSISTANT")}</span>
              <h4>
                <Sparkles size={17} /> {tr("Sugerir supermercados con Groq", "Suggest stores with Groq")}
              </h4>
              <p>
                {tr(
                  "Groq puede estimar qué cadenas del catálogo serían relevantes para tu ciudad. No consulta mapas ni cobertura en tiempo real.",
                  "Groq can estimate which catalog chains may be relevant for your city. It does not check maps or live delivery coverage."
                )}
              </p>
              <label className="inline-check">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                {tr(
                  "Autorizo enviar a Groq solo país, provincia y ciudad para recibir sugerencias.",
                  "I authorize sending only country, region, and city to Groq for suggestions."
                )}
              </label>
              <button
                type="button"
                className="secondary"
                disabled={!consent || !ready || busy || draft.city.trim().length < 2 || draft.country.trim().length < 2}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  setSuggestions(null);
                  try {
                    const res = await fetch("/api/supermarkets/suggest", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        country: draft.country.trim(),
                        region: draft.region.trim(),
                        city: draft.city.trim(),
                        consent: true,
                      }),
                    });
                    const b = await res.json();
                    if (!res.ok) throw Error(b.error);
                    setSuggestions(b.storeIds);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : tr("No se pudo consultar Groq.", "Could not query Groq."));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Sparkles size={16} />
                {busy ? tr("Consultando Groq…", "Querying Groq…") : tr("Sugerir para esta ciudad", "Suggest for this city")}
              </button>
              {!ready && (
                <p className="small muted">
                  {tr("Groq no está habilitado. La configuración manual sigue disponible.", "Groq is disabled. Manual setup remains available.")}
                </p>
              )}
              <p className="small muted">
                {tr(
                  "Consume una solicitud del límite diario compartido de IA. No se envían dirección exacta, email, medidas ni historial.",
                  "Counts toward the shared daily AI limit. No exact address, email, metrics, or history is sent."
                )}
              </p>
              {suggestions !== null && (
                <div className="city-suggestions">
                  <strong>{tr("Sugerencias de IA · cobertura sin verificar", "AI suggestions · coverage unverified")}</strong>
                  {suggestions.length ? (
                    <>
                      <p>{tr("Podés agregar estas opciones a tu selección, después de revisar si te sirven.", "Review and add any matching stores to your selection.")}</p>
                      {suggestions.map((id) => {
                        const s = storeCatalog.find((x) => x.id === id);
                        return s ? (
                          <div className="city-suggestion" key={id}>
                            <span>{s.name}</span>
                            <a href={s.home} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                              {tr("Ver tienda", "Visit store")}
                            </a>
                            <button
                              type="button"
                              className="secondary"
                              disabled={draft.storeIds.includes(id)}
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  storeIds: [...draft.storeIds, id],
                                  preferredId: draft.preferredId || id,
                                })
                              }
                            >
                              {draft.storeIds.includes(id) ? (
                                <>
                                  <Check size={14} /> {tr("Elegido", "Selected")}
                                </>
                              ) : (
                                tr("Agregar", "Add")
                              )}
                            </button>
                          </div>
                        ) : null;
                      })}
                    </>
                  ) : (
                    <p>
                      {tr(
                        "Groq no identificó opciones del catálogo con suficiente certeza. Podés seleccionarlas o agregar tiendas manualmente.",
                        "Groq did not find confident catalog matches. You can pick or add custom stores manually."
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            <label className="preferred-store">
              {tr("Supermercado preferido", "Preferred supermarket")}
              <select
                value={selected.some((s) => s.id === draft.preferredId) ? draft.preferredId : selected[0]?.id ?? ""}
                onChange={(e) => setDraft({ ...draft, preferredId: e.target.value })}
                required
              >
                <option value="" disabled>
                  {tr("Elegí al menos un supermercado", "Choose at least one supermarket")}
                </option>
                {selected.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}

            <div className="button-row">
              <button className="primary">{tr("Guardar ciudad y supermercados", "Save city & supermarkets")}</button>
              <button type="button" className="secondary" onClick={() => setEditing(false)}>
                {tr("Cancelar", "Cancel")}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
