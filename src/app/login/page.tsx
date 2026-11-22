"use client";
import { useState } from "react";
import { Leaf, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import Mascot from "@/components/mascot";

export default function Login() {
  const { tr } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="auth-shell">
      <section className="auth-story">
        <span className="pill">{tr("KETOFIT · TU ESPACIO PERSONAL", "KETOFIT · YOUR PERSONAL SPACE")}</span>
        <div className="auth-mascot">
          <Mascot mood="splash" size={126} label={tr("Paltín, mascota de KetoFit", "Paltín, KetoFit mascot")} />
        </div>
        <h1>
          {tr("Tu bienestar.", "Your wellness.")}
          <br />
          <em>{tr("Tu propio camino.", "Your own path.")}</em>
        </h1>
        <p>
          {tr("Entrená en casa o en el gimnasio.", "Train at home or at the gym.")}
          <br />
          {tr(
            "Organizá tus comidas keto y acompañá tu evolución.",
            "Organize your keto meals and track your progress."
          )}
        </p>
        <small>{tr("Un día a la vez, a tu ritmo.", "One day at a time, at your own pace.")}</small>
      </section>

      <main className="auth-panel">
        <a className="auth-brand" href="/login">
          <Leaf /> KetoFit
        </a>
        <div className="eyebrow">{tr("EMPEZÁ POR VOS", "START WITH YOU")}</div>
        <h1>
          {mode === "login"
            ? tr("Qué bueno verte.", "Welcome back.")
            : tr("Tu nuevo comienzo.", "Your fresh start.")}
        </h1>
        <p className="muted">
          {mode === "login"
            ? tr("Ingresá a tu cuenta para continuar.", "Sign in to your account to continue.")
            : tr(
                "Creá tu cuenta y configurá tu plan en el primer ingreso.",
                "Create your account and set up your plan on first sign-in."
              )}
        </p>

        <div className="auth-switch">
          <button
            type="button"
            className={mode === "login" ? "selected" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            {tr("Iniciar sesión", "Sign in")}
          </button>
          <button
            type="button"
            className={mode === "register" ? "selected" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            {tr("Crear cuenta", "Create account")}
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setBusy(true);
            const f = new FormData(e.currentTarget);
            try {
              const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mode,
                  email: email.trim().toLowerCase(),
                  password: f.get("password"),
                  ...(mode === "register"
                    ? { name: f.get("name"), adminCode: f.get("adminCode") ?? undefined }
                    : {}),
                }),
              });
              const b = await res.json();
              if (!res.ok) throw Error(b.error);
              location.assign("/");
            } catch (err) {
              setError(
                err instanceof Error ? err.message : tr("No se pudo conectar.", "Could not connect.")
              );
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            {mode === "register" && (
              <label>
                {tr("Tu nombre", "Your name")}
                <input name="name" autoComplete="name" maxLength={80} required />
              </label>
            )}
            <label>
              {tr("Email", "Email")}
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                required
              />
            </label>
            <label>
              {tr("Contraseña", "Password")}
              <input
                name="password"
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                minLength={12}
                maxLength={128}
                required
              />
              <small>
                {tr("Mínimo 12 caracteres. Podés usar una frase.", "Minimum 12 characters. You can use a passphrase.")}
              </small>
            </label>
            {mode === "register" &&
              email.trim().toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@ketofit.app").toLowerCase() && (
              <label>
                {tr("Código de administrador", "Admin code")}
                <input name="adminCode" type="password" autoComplete="off" maxLength={200} required />
                <small>
                  {tr(
                    "Ingresá el código configurado en ACCESS_PASSWORD del servidor.",
                    "Enter the activation code configured in the server's ACCESS_PASSWORD variable."
                  )}
                </small>
              </label>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary auth-submit">
              {busy
                ? tr("Un momento…", "One moment…")
                : mode === "login"
                  ? tr("Entrar a KetoFit", "Sign in to KetoFit")
                  : tr("Crear mi cuenta", "Create my account")}
              <ArrowRight size={17} />
            </button>
          </fieldset>
        </form>

        <p className="small muted">
          {tr(
            "Tus registros son privados y están asociados a tu cuenta. El email se usa para iniciar sesión; todavía no se envían correos de verificación o recuperación.",
            "Your records are private and tied to your account. Email is used for sign-in; verification and recovery emails are not yet enabled."
          )}
        </p>
      </main>
    </div>
  );
}
