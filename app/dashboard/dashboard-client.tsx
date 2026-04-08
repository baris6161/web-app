"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TrefferRow } from "@/lib/treffer-types";
import {
  inferPlatform,
  rowMatchesFilters,
  splitMarkeModell,
} from "@/lib/treffer-display";

export type { TrefferRow };

type StatusPayload = {
  last_seen_at: string | null;
  pcOnline: boolean;
};

function formatDe(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function DashboardClient() {
  const router = useRouter();
  const [treffer, setTreffer] = useState<TrefferRow[]>([]);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [fMarke, setFMarke] = useState("");
  const [fModell, setFModell] = useState("");
  const [fPreis, setFPreis] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadErr("");
    try {
      const [tr, st] = await Promise.all([
        fetch("/api/treffer", { credentials: "include" }),
        fetch("/api/status", { credentials: "include" }),
      ]);
      if (tr.status === 401) {
        router.push("/login");
        return;
      }
      if (!tr.ok) {
        setLoadErr("Inserate-Liste konnte nicht geladen werden.");
        return;
      }
      const tj = await tr.json();
      setTreffer((tj.treffer as TrefferRow[]) || []);
      if (st.ok) {
        const sj = await st.json();
        setStatus(sj as StatusPayload);
      }
    } catch {
      setLoadErr("Netzwerkfehler beim Laden.");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const filterObj = useMemo(
    () => ({ marke: fMarke, modell: fModell, preis: fPreis }),
    [fMarke, fModell, fPreis]
  );

  const filtered = useMemo(
    () => treffer.filter((t) => rowMatchesFilters(t, filterObj)),
    [treffer, filterObj]
  );

  const filterActive =
    fMarke.trim() !== "" || fModell.trim() !== "" || fPreis.trim() !== "";

  async function cmd(action: "on" | "off") {
    setMsg("");
    setBusy(true);
    try {
      const r = await fetch("/api/nohand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg((j as { error?: string }).error || "Befehl fehlgeschlagen.");
        return;
      }
      setMsg(action === "on" ? "No-Hand AN angefordert." : "No-Hand AUS angefordert.");
    } catch {
      setMsg("Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  const pcOk = status?.pcOnline ?? false;
  const pcHint = !pcOk
    ? "PC offline oder Sync aus — No-Hand bis der PC wieder verbunden ist."
    : undefined;

  return (
    <div className="shell shell-wide shell-dashboard">
      <header className="dash-topbar">
        <div className="dash-topbar-main">
          <h1 className="dash-title">Angeschriebene Inserate</h1>
          <p className="dash-subline">
            <span className={pcOk ? "badge ok" : "badge"}>
              {pcOk ? "PC verbunden" : "PC getrennt"}
            </span>
            {status?.last_seen_at ? (
              <span className="dash-subline-time">
                {" "}
                · zuletzt {formatDe(status.last_seen_at)}
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="btn-logout"
          onClick={() => logout()}
          aria-label="Abmelden"
        >
          Abmelden
        </button>
      </header>

      <div className="dash-toolbar" role="toolbar" aria-label="Aktionen">
        <div className="dash-toolbar-scroll">
          <button
            type="button"
            className="btn-pill btn-success btn-toolbar"
            disabled={busy || !pcOk}
            title={pcHint}
            onClick={() => cmd("on")}
          >
            No-Hand an
          </button>
          <button
            type="button"
            className="btn-pill btn-danger btn-toolbar"
            disabled={busy || !pcOk}
            title={pcHint}
            onClick={() => cmd("off")}
          >
            No-Hand aus
          </button>
          <button
            type="button"
            className="btn-pill btn-ghost btn-toolbar"
            disabled={busy}
            onClick={() => load()}
          >
            Aktualisieren
          </button>
        </div>
      </div>
      {msg ? (
        <p className="dash-flash" role="status">
          {msg}
        </p>
      ) : null}

      {loadErr ? <p className="err">{loadErr}</p> : null}

      <div className="filter-section-gap">
        <div className="card treffer-filter-card filter-collapsible-card">
          <button
            type="button"
            className="filter-disclosure-trigger"
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
            aria-controls="filter-panel"
            id="filter-disclosure-btn"
          >
            <span
              className={`filter-disclosure-chevron${filterOpen ? " is-open" : ""}`}
              aria-hidden
            >
              ▶
            </span>
            <span className="filter-disclosure-title">Suche &amp; Filter</span>
            {filterActive ? (
              <span className="badge filter-disclosure-badge">aktiv</span>
            ) : null}
          </button>
          <div
            id="filter-panel"
            role="region"
            aria-labelledby="filter-disclosure-btn"
            className={`filter-disclosure-panel${filterOpen ? " is-open" : ""}`}
          >
            <div className="filter-disclosure-inner">
              <p className="treffer-meta" style={{ margin: "0 0 0.65rem" }}>
                Marke/Modell: erstes Wort = Marke (heuristisch). Preis: Ziffern
                reichen (z.&nbsp;B. 13500).
              </p>
              <div className="filter-grid">
                <label className="filter-field">
                  <span>Marke</span>
                  <input
                    type="search"
                    enterKeyHint="search"
                    value={fMarke}
                    onChange={(e) => setFMarke(e.target.value)}
                    placeholder="z. B. VW"
                    autoComplete="off"
                  />
                </label>
                <label className="filter-field">
                  <span>Modell</span>
                  <input
                    type="search"
                    enterKeyHint="search"
                    value={fModell}
                    onChange={(e) => setFModell(e.target.value)}
                    placeholder="z. B. Polo"
                    autoComplete="off"
                  />
                </label>
                <label className="filter-field">
                  <span>Preis</span>
                  <input
                    type="search"
                    enterKeyHint="search"
                    value={fPreis}
                    onChange={(e) => setFPreis(e.target.value)}
                    placeholder="z. B. 13500"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </label>
              </div>
              <div className="filter-footer">
                {treffer.length > 0 ? (
                  <span className="treffer-meta">
                    {filterActive
                      ? `${filtered.length} von ${treffer.length} Inseraten`
                      : `${treffer.length} Inserate`}
                  </span>
                ) : (
                  <span className="treffer-meta">—</span>
                )}
                {filterActive ? (
                  <button
                    type="button"
                    className="btn-pill btn-ghost btn-compact"
                    onClick={() => {
                      setFMarke("");
                      setFModell("");
                      setFPreis("");
                    }}
                  >
                    Filter zurücksetzen
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {treffer.length === 0 ? (
        <p className="sub">Noch keine Inserate vom PC.</p>
      ) : filtered.length === 0 ? (
        <p className="sub">Keine Inserate für diese Filter.</p>
      ) : (
        <div className="treffer-table-wrap">
          <table className="treffer-table">
            <thead>
              <tr>
                <th>Zeit</th>
                <th>Marke</th>
                <th>Modell</th>
                <th>Preis</th>
                <th>Plattform</th>
                <th>Vgl.</th>
                <th>Inserat</th>
                <th>Vergleich</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const { marke, modell } = splitMarkeModell(t.marke_modell);
                const plat = inferPlatform(t.inserat_url, t.vergleich_url);
                return (
                  <tr key={t.id}>
                    <td className="td-time">{formatDe(t.created_at)}</td>
                    <td>
                      {marke}
                      {t.schnaeppchen ? (
                        <span className="badge badge-inline">Schnäppchen</span>
                      ) : null}
                    </td>
                    <td>{modell}</td>
                    <td className="td-nowrap">{t.angebot_preis_text || "—"}</td>
                    <td>{plat}</td>
                    <td className="td-center">
                      {t.hits != null ? `${t.hits}/5` : "—"}
                    </td>
                    <td className="td-actions">
                      {t.inserat_url ? (
                        <a
                          href={t.inserat_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-pill btn-primary btn-table"
                        >
                          Inserat
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="td-actions">
                      {t.vergleich_url ? (
                        <a
                          href={t.vergleich_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-pill btn-ghost btn-table"
                        >
                          Vergleich
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
