"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import Mascot from "./mascot";

export default function SplashIntro({
  forceShow = false,
  onDone,
}: {
  forceShow?: boolean;
  onDone?: () => void;
}) {
  const { tr } = useI18n();
  const [phase, setPhase] = useState<"hidden" | "enter" | "exit">("enter");

  useEffect(() => {
    if (forceShow) setPhase("enter");
  }, [forceShow]);

  useEffect(() => {
    if (phase !== "enter") return;
    const exitTimer = setTimeout(() => setPhase("exit"), 1850);
    return () => clearTimeout(exitTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") return;
    const doneTimer = setTimeout(() => {
      setPhase("hidden");
      onDone?.();
    }, 420);
    return () => clearTimeout(doneTimer);
  }, [phase, onDone]);

  useEffect(() => {
    if (phase === "hidden") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") setPhase("exit");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`splash-overlay ${phase === "exit" ? "is-exiting" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={tr("Bienvenida a KetoFit", "Welcome to KetoFit")}
      onClick={() => setPhase("exit")}
    >
      <div className="splash-ring splash-ring-1" aria-hidden="true" />
      <div className="splash-ring splash-ring-2" aria-hidden="true" />

      <div className="splash-stage" onClick={(e) => e.stopPropagation()}>
        <div className="splash-mascot-wrap">
          <Mascot mood="splash" size={146} label={tr("Paltín, la mascota de KetoFit", "Paltín, the KetoFit mascot")} />
        </div>

        <div className="splash-wordmark">
          Keto<span>Fit</span>
        </div>
        <p className="splash-tagline">{tr("Tu progreso real, a tu ritmo.", "Your real progress, at your pace.")}</p>

        <div className="splash-bar" aria-hidden="true">
          <div className="splash-bar-fill" />
        </div>

        <button type="button" className="splash-skip" onClick={() => setPhase("exit")}>
          {tr("Entrar ahora", "Enter now")}
        </button>
      </div>
    </div>
  );
}
