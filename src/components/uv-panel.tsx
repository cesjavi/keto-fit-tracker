"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sun, MapPin, RefreshCw, ShieldCheck, Moon, Clock, Navigation, LocateOff } from "lucide-react";
import { UVForecast, daylight, uvLevel, zoneDate } from "@/lib/uv";
import { useI18n } from "@/lib/i18n";
import MetricChart from "./metric-chart";

type Coordinates = { latitude: number; longitude: number };

export default function UVPanel({ onCurrentUV }: { onCurrentUV?: (uv: number | null) => void }) {
  const { tr, fmt, locale, uvLevelLabel } = useI18n();
  const [consent, setConsent] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [forecast, setForecast] = useState<UVForecast | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [day, setDay] = useState(0);
  const [now, setNow] = useState(Date.now());
  const abort = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const geoSequence = useRef(0);
  const busy = useRef(false);

  const load = useCallback(
    async (coords: Coordinates) => {
      const seq = ++sequence.current;
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      busy.current = true;
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/uv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...coords, consent: true }),
          signal: controller.signal,
          cache: "no-store",
        });
        const body = await res.json();
        if (!res.ok) throw Error(body.error);
        if (seq === sequence.current) {
          setForecast(body);
          setNow(Date.now());
        }
      } catch (e) {
        if (seq === sequence.current && !(e instanceof Error && e.name === "AbortError")) {
          setError(
            e instanceof Error
              ? e.message
              : tr("No se pudo consultar el pronóstico.", "Could not fetch UV forecast.")
          );
        }
      } finally {
        if (seq === sequence.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [tr]
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      clearInterval(t);
      ++sequence.current;
      ++geoSequence.current;
      abort.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!coordinates) return;
    load(coordinates);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !busy.current) load(coordinates);
    }, 15 * 60000);
    return () => clearInterval(timer);
  }, [coordinates, load]);

  function clearLocation() {
    ++geoSequence.current;
    ++sequence.current;
    abort.current?.abort();
    setCoordinates(null);
    setForecast(null);
    setError("");
    setLocating(false);
    setLoading(false);
    busy.current = false;
    setDay(0);
  }

  function locate() {
    if (!consent) {
      setError(
        tr(
          "Autorizá primero el envío de coordenadas aproximadas a Open-Meteo.",
          "First authorize sending approximate coordinates to Open-Meteo."
        )
      );
      return;
    }
    clearLocation();
    if (!window.isSecureContext) {
      setError(
        tr(
          "La ubicación requiere HTTPS o localhost. Abrí la dirección HTTPS de KetoFit.",
          "Location requires HTTPS or localhost. Open KetoFit over HTTPS."
        )
      );
      return;
    }
    if (!navigator.geolocation) {
      setError(
        tr(
          "Este navegador no permite consultar la ubicación. Abrí KetoFit en Chrome o en un navegador compatible.",
          "This browser does not support geolocation. Open KetoFit in a compatible browser."
        )
      );
      return;
    }
    const request = ++geoSequence.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (request !== geoSequence.current) return;
        setCoordinates({
          latitude: Math.round(position.coords.latitude * 100) / 100,
          longitude: Math.round(position.coords.longitude * 100) / 100,
        });
        setLocating(false);
      },
      (e) => {
        if (request !== geoSequence.current) return;
        setLocating(false);
        setError(
          e.code === 1
            ? tr(
                "No se autorizó la ubicación. Podés habilitarla en los permisos del sitio y volver a tocar Usar mi ubicación.",
                "Location permission was denied. Enable it in site permissions and try again."
              )
            : e.code === 3
              ? tr(
                  "No se pudo obtener la ubicación a tiempo. Revisá que la ubicación del celular esté activada y volvé a intentar.",
                  "Location request timed out. Make sure device location is enabled and retry."
                )
              : tr(
                  "No se pudo determinar tu ubicación. Activá la ubicación del celular y reintentá.",
                  "Could not determine your location. Enable device location and retry."
                )
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  const timezone = forecast?.timezone ?? "America/Argentina/Buenos_Aires";
  const time = (ts: number) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(ts));
  const today = zoneDate(now, timezone);
  const dayDates = forecast
    ? [...new Set(forecast.hours.map((h) => zoneDate(h.endAt, timezone)))].filter((d) => d >= today).slice(0, 2)
    : [];
  const selectedDate = dayDates[day] ?? today;
  const hours = forecast?.hours.filter((h) => zoneDate(h.endAt - 1, timezone) === selectedDate) ?? [];
  const current = forecast?.hours.filter((h) => h.endAt <= now && now - h.endAt <= 90 * 60000).at(-1) ?? null;
  const sun = forecast?.sun.find((s) => s.rise !== null && zoneDate(s.rise, timezone) === today) ?? null;
  const isDay = sun && sun.rise !== null && sun.set !== null ? now >= sun.rise && now < sun.set : current?.isDay ?? null;
  const uv = current?.uv ?? null;
  const level = uv === null ? null : uvLevel(uv);
  const max = hours.reduce<number | null>((acc, h) => (h.uv === null ? acc : Math.max(acc ?? 0, h.uv)), null);
  const best = forecast
    ? hours
        .flatMap((h) => {
          const lit = daylight(h, forecast);
          if (h.uv === null || !lit) return [];
          const startAt = Math.max(lit.startAt, now);
          return startAt < lit.endAt ? [{ ...h, startAt, endAt: lit.endAt, uv: h.uv }] : [];
        })
        .sort((a, b) => a.uv - b.uv || a.startAt - b.startAt)
        .slice(0, 3)
        .sort((a, b) => a.startAt - b.startAt)
    : [];
  const stale = forecast !== null && now - forecast.fetchedAt > 30 * 60000;

  useEffect(() => {
    onCurrentUV?.(uv);
  }, [uv, onCurrentUV]);

  return (
    <div className="uv-module">
      <section className="card uv-intro">
        <div>
          <span className="eyebrow">{tr("RADIACIÓN EN TU ZONA", "LOCAL UV RADIATION")}</span>
          <h2>
            <Sun size={24} /> {tr("El sol, con información.", "Informed sun exposure.")}
          </h2>
          <p>
            {tr(
              "Consultá el índice UV estimado por Open-Meteo y compará las franjas futuras con luz y menor radiación.",
              "Check estimated UV index from Open-Meteo and compare upcoming daylight windows with lower radiation."
            )}
          </p>
          <p className="small muted">
            {tr(
              "Se envían coordenadas aproximadas redondeadas a dos decimales solo mientras consultás esta pantalla. No se guardan en tu perfil ni se comparten con Groq.",
              "Approximate coordinates rounded to two decimals are sent only while viewing this screen. They are never stored in your profile or shared with Groq."
            )}
          </p>
        </div>
        <div className="uv-location-actions">
          <label className="inline-check uv-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (!e.target.checked) clearLocation();
              }}
            />
            {tr(
              "Autorizo enviar coordenadas aproximadas a Open-Meteo para consultar el UV.",
              "I authorize sending approximate coordinates to Open-Meteo to check UV."
            )}
          </label>
          <button type="button" className="primary" onClick={locate} disabled={!consent || locating || loading}>
            <Navigation size={17} />
            {locating
              ? tr("Buscando ubicación…", "Finding location…")
              : coordinates
                ? tr("Actualizar mi ubicación", "Refresh my location")
                : tr("Usar mi ubicación", "Use my location")}
          </button>
          {coordinates && (
            <button type="button" className="secondary" disabled={loading} onClick={() => load(coordinates)}>
              <RefreshCw size={15} />
              {loading ? tr("Consultando…", "Updating…") : tr("Actualizar pronóstico", "Refresh forecast")}
            </button>
          )}
          {(coordinates || locating) && (
            <button type="button" className="text-button" onClick={clearLocation}>
              <LocateOff size={15} /> {tr("Dejar de usar ubicación", "Stop using location")}
            </button>
          )}
        </div>
      </section>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p className="notice" role="status">
          {tr("Consultando el servicio meteorológico…", "Fetching weather forecast…")}
        </p>
      )}
      {stale && (
        <p className="notice">
          {tr(
            "El pronóstico no se actualiza desde hace más de 30 minutos. La información puede estar desactualizada.",
            "The forecast hasn't updated in over 30 minutes and may be stale."
          )}
        </p>
      )}

      {!forecast && !loading && (
        <section className="card empty uv-empty">
          <MapPin size={32} />
          <h3>{tr("El índice UV de tu zona", "UV index in your area")}</h3>
          <p>
            {tr(
              "Autorizá y tocá Usar mi ubicación para cargar datos reales de Open-Meteo. Si lo consultás, podrás aplicar ese UV directo en la calculadora de vitamina D abajo.",
              "Authorize and tap Use my location to load live Open-Meteo data. Once loaded, you can apply that UV directly in the Vitamin D calculator below."
            )}
          </p>
        </section>
      )}

      {forecast && (
        <>
          <div className="uv-overview">
            <section className="card uv-current">
              <div className="uv-current-top">
                <span className="eyebrow">{tr("ÚLTIMA ESTIMACIÓN HORARIA", "LATEST HOURLY ESTIMATE")}</span>
                {isDay === false ? <Moon size={22} /> : <Sun size={22} />}
              </div>
              <div className="uv-number" style={{ color: level?.color ?? "var(--muted)" }}>
                {uv === null ? "—" : fmt(uv)}
                <span>{tr("índice UV", "UV index")}</span>
              </div>
              <span className="uv-level" style={{ color: level?.color }}>
                {level ? uvLevelLabel(level.name) : tr("Sin dato reciente", "No recent data")}
              </span>
              <p>
                {current
                  ? tr(
                      `Media estimada de ${time(current.startAt)} a ${time(current.endAt)}`,
                      `Estimated mean from ${time(current.startAt)} to ${time(current.endAt)}`
                    )
                  : tr("No hay una estimación reciente disponible.", "No recent estimate available.")}
              </p>
              {isDay === false && (
                <p className="uv-night">
                  <Moon size={16} />{" "}
                  {tr("Ahora es de noche; no es un horario para tomar sol.", "It is currently nighttime.")}
                </p>
              )}
            </section>

            <section className="card uv-advice">
              <ShieldCheck size={24} />
              <h3>
                {uv !== null && uv >= 3
                  ? tr("Conviene protegerse del sol.", "Sun protection is recommended.")
                  : tr("Elegí con información y protección.", "Choose wisely with sun protection.")}
              </h3>
              <p>
                {tr(
                  "Desde un índice UV de 3, la OMS recomienda protección solar: sombra, ropa, sombrero, anteojos y protector solar.",
                  "From UV index 3 and above, the WHO recommends sun protection: shade, protective clothing, hat, sunglasses, and sunscreen."
                )}
              </p>
              <p className="small muted">
                {tr(
                  "Un UV bajo no garantiza exposición sin riesgo. Este visor no calcula minutos seguros para broncearse ni dosis de vitamina D.",
                  "A low UV index does not guarantee risk-free exposure. This viewer does not calculate safe tanning minutes or vitamin D doses."
                )}
              </p>
              <div className="uv-metadata">
                <span>
                  <Clock size={14} /> {tr("Consultado a las", "Updated at")} {time(forecast.fetchedAt)}
                </span>
                <span>
                  {tr("Zona horaria", "Timezone")}: {forecast.timezone}
                </span>
                <span>
                  {tr(
                    "Actualización cada 15 min mientras esta pantalla está visible.",
                    "Auto-refreshes every 15 min while this screen is visible."
                  )}
                </span>
              </div>
            </section>
          </div>

          <section className="card">
            <div className="uv-forecast-heading">
              <div>
                <span className="eyebrow">{tr("PRONÓSTICO POR HORA", "HOURLY FORECAST")}</span>
                <h2>{tr("Cómo cambia la radiación", "How UV changes through the day")}</h2>
              </div>
              <div className="uv-day-switch">
                {dayDates.map((d, i) => (
                  <button key={d} type="button" className={day === i ? "selected" : ""} onClick={() => setDay(i)}>
                    {i === 0 ? tr("Hoy", "Today") : tr("Mañana", "Tomorrow")}
                  </button>
                ))}
              </div>
            </div>
            <p className="small muted">
              {new Date(selectedDate + "T12:00:00Z").toLocaleDateString(locale, {
                timeZone: "UTC",
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              · {tr("Máximo estimado", "Estimated peak")}: {max === null ? tr("sin dato", "no data") : fmt(max)}.{" "}
              {tr("Cada punto representa el promedio de la hora anterior.", "Each point represents the preceding hour's mean.")}
            </p>
            <MetricChart
              data={hours}
              xKey="endAt"
              yKey="uv"
              seriesName={tr("UV estimado", "Estimated UV")}
              variant="area"
              color="#c49a3a"
              height={265}
              minTickGap={34}
              gradientId="uv-forecast-grad"
              yDomain={[0, (m: number) => Math.max(4, Math.ceil(m))]}
              referenceY={3}
              referenceLabel={tr("Protección OMS (UV 3)", "WHO Protection (UV 3)")}
              xFormatter={(ts) => time(Number(ts))}
              tooltipLabelFormatter={(ts) => `${time(Number(ts) - 3600000)}–${time(Number(ts))}`}
              valueFormatter={(v) => (v === null || v === undefined ? tr("Sin dato", "No data") : fmt(v))}
            />
            <div className="uv-scale">
              {[
                { name: "Bajo", range: "0–2", uv: 1 },
                { name: "Moderado", range: "3–5", uv: 4 },
                { name: "Alto", range: "6–7", uv: 6 },
                { name: "Muy alto", range: "8–10", uv: 9 },
                { name: "Extremo", range: "11+", uv: 11 },
              ].map((l) => (
                <div key={l.name} style={{ borderTopColor: uvLevel(l.uv).color }}>
                  <b>{l.range}</b>
                  <span>{uvLevelLabel(l.name)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <span className="eyebrow">{tr("COMPARÁ HORARIOS CON LUZ", "COMPARE DAYLIGHT WINDOWS")}</span>
            <h2>
              {day === 0
                ? tr("Menor UV previsto en lo que queda de hoy", "Lowest forecast UV remaining today")
                : tr("Menor UV previsto para mañana", "Lowest forecast UV tomorrow")}
            </h2>
            <p className="muted small">
              {tr(
                "Franjas futuras con luz diurna de menor radiación entre las disponibles; no son tiempos de exposición seguros.",
                "Upcoming daylight intervals with relatively lower radiation; not safe-exposure recommendations."
              )}
            </p>
            {best.length ? (
              <>
                <div className="uv-best-hours">
                  {best.map((h) => (
                    <article key={h.endAt}>
                      <Sun size={20} />
                      <span>
                        {time(h.startAt)}–{time(h.endAt)}
                      </span>
                      <strong style={{ color: uvLevel(h.uv).color }}>UV {fmt(h.uv)}</strong>
                      <small>{uvLevelLabel(uvLevel(h.uv).name)}</small>
                    </article>
                  ))}
                </div>
                {best.every((h) => h.uv >= 3) && (
                  <p className="notice">
                    {tr(
                      "Incluso las franjas de menor UV previstas requieren protección solar.",
                      "Even the lowest forecast daylight windows require sun protection."
                    )}
                  </p>
                )}
              </>
            ) : (
              <p className="empty">
                {tr(
                  "No quedan franjas con luz y datos UV disponibles para este día.",
                  "No daylight UV intervals remain for this day."
                )}{" "}
                {day === 0 ? tr("Podés consultar el pronóstico de mañana.", "Check tomorrow's forecast instead.") : ""}
              </p>
            )}
          </section>
        </>
      )}

      <p className="uv-source">
        {tr("Datos", "Data")}:{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
          Open-Meteo
        </a>{" "}
        · {tr("Estimación de modelos meteorológicos, no sensor en tiempo real.", "Weather model estimates, not a local sensor.")}{" "}
        {tr("Guía", "Guidance")}:{" "}
        <a
          href="https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation"
          target="_blank"
          rel="noopener noreferrer"
        >
          {tr("OMS: radiación ultravioleta", "WHO: ultraviolet radiation")}
        </a>
        .
      </p>
    </div>
  );
}
