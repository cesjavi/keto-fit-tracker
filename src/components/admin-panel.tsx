"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

export default function AdminPanel() {
  const { tr, locale } = useI18n();
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string; createdAt: string }[]>(
    []
  );
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin")
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        setUsers(b.users);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <section className="card">
      <span className="eyebrow">{tr("ADMINISTRACIÓN", "ADMINISTRATION")}</span>
      <h2>{tr("Cuentas registradas", "Registered accounts")}</h2>
      <p className="muted">
        {tr(
          "Se muestran hasta 200 cuentas recientes. Los registros de peso, alimentación y entrenamiento de cada usuario permanecen privados.",
          "Showing up to 200 recent accounts. Each user's weight, nutrition, and workout records remain private."
        )}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="admin-list">
        {users.map((u) => (
          <article key={u.id}>
            <div>
              <strong>{u.name}</strong>
              <p>{u.email}</p>
            </div>
            <span className="tag">
              {u.role === "ADMIN" ? tr("Administrador", "Admin") : tr("Usuario", "User")}
            </span>
            <small>{new Date(u.createdAt).toLocaleDateString(locale)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
