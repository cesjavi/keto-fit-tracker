"use client";
import { useEffect, useState, useRef } from "react";
import { Copy, ExternalLink, ShoppingBasket, Check, MapPin, SlidersHorizontal, X } from "lucide-react";
import CityStoreSettings from "./city-store-settings";
import { ShoppingConfig, resolveStores } from "@/lib/stores";
import { useI18n } from "@/lib/i18n";

type Item = { name: string; qty: number; unit: string };

export default function Supermarkets({
  items,
  week,
  checked,
  onToggle,
  config,
  onConfigSave,
  onNotify,
}: {
  items: Item[];
  week: string;
  checked: string[];
  onToggle: (key: string) => void;
  config: ShoppingConfig;
  onConfigSave: (config: ShoppingConfig) => Promise<void>;
  onNotify?: (message: string) => void;
}) {
  const { tr, fmt } = useI18n();
  const [selected, setSelected] = useState<string>("");
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = config.locations.find((l) => l.id === config.activeId) ?? null;
  const stores = resolveStores(active);

  useEffect(() => {
    setSelected(active?.preferredId ?? "coto");
  }, [active?.id, active?.preferredId]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const store = stores.find((s) => s.id === selected) ?? stores[0];

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setManual("");
      if (onNotify) {
        onNotify(message);
      } else {
        setStatus(message);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setStatus(""), 4000);
      }
    } catch {
      setManual(text);
      setStatus(tr("Seleccioná el texto de abajo para copiarlo manualmente.", "Select the text below to copy manually."));
    }
  }

  const pending = items.filter((item) => !checked.includes(`${week}|${item.name}|${item.unit}`));
  const doneCount = items.length - pending.length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <>
      <div className="shopping-context-bar">
        <div className="shopping-context-top">
          <div className="shopping-city-pill">
            <MapPin size={17} style={{ color: "var(--accent)" }} />
            <span>
              {active
                ? `${active.city}${active.region ? `, ${active.region}` : ""}`
                : tr("Supermercados generales", "Default supermarkets")}
              <small style={{ display: "block" }}>
                {active
                  ? `${active.country} · ${stores.length} ${tr("tiendas", "stores")}`
                  : tr("Configurá tu ciudad para guardar tiendas", "Configure your city to save local stores")}
              </small>
            </span>
          </div>
          <div className="button-row">
            <a
              className="primary"
              href={store.home}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              <ExternalLink size={15} /> {tr("Abrir", "Open")} {store.name}
            </a>
            <button
              className="secondary"
              type="button"
              disabled={!pending.length}
              onClick={() =>
                copy(
                  pending.map((i) => `${fmt(i.qty)} ${i.unit} · ${i.name}`).join("\n"),
                  tr(
                    `Copiados ${pending.length} pendientes para ${store.name}.`,
                    `Copied ${pending.length} pending items for ${store.name}.`
                  )
                )
              }
            >
              <Copy size={15} /> {tr("Copiar pendientes", "Copy pending")} ({pending.length})
            </button>
            <button className="secondary" type="button" onClick={() => setDrawerOpen(true)}>
              <SlidersHorizontal size={15} /> {tr("Configurar ciudad", "Configure city")}
            </button>
          </div>
        </div>

        <div className="shopping-store-strip" role="group" aria-label={tr("Supermercado preferido", "Preferred store")}>
          {stores.map((s) => (
            <button
              type="button"
              key={s.id}
              aria-pressed={selected === s.id}
              className={selected === s.id ? "store-chip selected" : "store-chip"}
              onClick={() => {
                setSelected(s.id);
                if (active) {
                  onConfigSave({
                    ...config,
                    locations: config.locations.map((l) => (l.id === active.id ? { ...l, preferredId: s.id } : l)),
                  });
                }
              }}
            >
              <span className="supermarket-mark" style={{ background: s.color }}>
                {s.mark}
              </span>
              <span>{s.name}</span>
              {selected === s.id && <Check size={15} style={{ color: "var(--accent)" }} />}
            </button>
          ))}
        </div>
      </div>

      {status && (
        <p className="notice" role="status">
          {status}
        </p>
      )}

      {manual && (
        <label className="copy-fallback">
          {tr("Texto para copiar", "Text to copy")}
          <textarea
            readOnly
            rows={Math.min(8, manual.split("\n").length + 1)}
            value={manual}
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <ShoppingBasket size={28} />
          <p>
            {tr(
              "Agregá recetas en el Planificador para generar automáticamente tu lista de compras.",
              "Add recipes in the Planner to automatically generate your shopping list."
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="shopping-progress">
            <div className="shopping-progress-head">
              <span>{tr("Progreso de compra", "Shopping progress")}</span>
              <span className="tabular">
                {doneCount} {tr("de", "of")} {items.length} ({pct}%)
              </span>
            </div>
            <div className="macro-track">
              <div className={`macro-fill ${pct === 100 ? "ok" : ""}`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="supermarket-items">
            {items.map((item) => {
              const key = `${week}|${item.name}|${item.unit}`;
              const done = checked.includes(key);
              return (
                <div key={key} className={`store-item ${done ? "done" : ""}`}>
                  <label className="store-item-check">
                    <input type="checkbox" checked={done} onChange={() => onToggle(key)} />
                    <span>
                      <b>{item.name}</b>
                      <small>
                        {fmt(item.qty)} {item.unit} {tr("para tu plan", "for your plan")}
                      </small>
                    </span>
                  </label>
                  <button
                    className="secondary copy-item"
                    type="button"
                    aria-label={`${tr("Copiar ingrediente", "Copy ingredient")} ${item.name}`}
                    onClick={() =>
                      copy(
                        item.name,
                        tr(
                          `${item.name} copiado para buscar en ${store.name}.`,
                          `${item.name} copied to search in ${store.name}.`
                        )
                      )
                    }
                  >
                    <Copy size={14} />
                    <span>{tr("Copiar", "Copy")}</span>
                  </button>
                </div>
              );
            })}
          </div>
          <p className="small muted">
            {tr(
              "Acceso directo a las tiendas oficiales. KetoFit no carga el carrito ni consulta precios o stock; elegís productos, envío y pago en el supermercado.",
              "Direct links to official stores. KetoFit does not populate carts or check prices/stock; you choose products, delivery, and payment directly in the store."
            )}
          </p>
        </>
      )}

      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Configurar ciudad y supermercados", "Configure city and supermarkets")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <div>
                <span className="eyebrow">{tr("CONFIGURACIÓN DE TIENDAS", "STORE SETTINGS")}</span>
                <h2>{tr("Ciudad y supermercados", "City & supermarkets")}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={tr("Cerrar configuración", "Close settings")}
                onClick={() => setDrawerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="drawer-body">
              <CityStoreSettings
                config={config}
                onSave={async (next) => {
                  await onConfigSave(next);
                  setDrawerOpen(false);
                }}
              />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
