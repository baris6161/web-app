"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  nohandOn: boolean | null;
};

type StatusLogEntry = {
  id: string;
  created_at: string;
  title: string | null;
  body: string | null;
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
  const [logOpen, setLogOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<StatusLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logErr, setLogErr] = useState("");
  const nohandSwitchRef = useRef<HTMLInputElement>(null);

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
        setStatus({
          last_seen_at: sj.last_seen_at ?? null,
          pcOnline: Boolean(sj.pcOnline),
          nohandOn:
            typeof sj.nohandOn === "boolean"
              ? sj.nohandOn
              : sj.nohandOn == null
                ? null
                : Boolean(sj.nohandOn),
        });
      }
    } catch {
      setLoadErr("Netzwerkfehler beim Laden.");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => {
      load();
    }, 12000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!logOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLogOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [logOpen]);

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
      await load();
    } catch {
      setMsg("Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  }

  async function openStatusLog() {
    setLogErr("");
    setLogLoading(true);
    setLogOpen(true);
    try {
      const r = await fetch("/api/status-log", { credentials: "include" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setLogErr((j as { error?: string }).error || "Log konnte nicht geladen werden.");
        setLogEntries([]);
        return;
      }
      setLogEntries((j.entries as StatusLogEntry[]) || []);
    } catch {
      setLogErr("Netzwerkfehler.");
      setLogEntries([]);
    } finally {
      setLogLoading(false);
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

  useEffect(() => {
    const el = nohandSwitchRef.current;
    if (!el) return;
    el.indeterminate = pcOk && status?.nohandOn === null;
  }, [pcOk, status?.nohandOn]);

  const nohandChecked = status?.nohandOn === true;

  return (
    <div className="shell shell-wide shell-dashboard">
      <header className="dash-topbar">
        <div className="dash-topbar-main">
          <h1 className="dash-title">Angeschriebene Inserate</h1>
          <p className="dash-subline">
            <span className={pcOk ? "badge ok" : "badge"}>
              {pcOk ? "PC verbunden" : "PC getrennt"}
            </span>
            {pcOk ? (
              <>
                {status?.nohandOn === true ? (
                  <span className="badge ok" style={{ marginLeft: 6 }}>
                    No-Hand an
                  </span>
                ) : status?.nohandOn === false ? (
                  <span className="badge" style={{ marginLeft: 6 }}>
                    No-Hand aus
                  </span>
                ) : (
                  <span className="badge" style={{ marginLeft: 6 }}>
                    No-Hand ?
                  </span>
                )}
              </>
            ) : null}
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

      <div className="dash-toolbar dash-toolbar-combo" role="toolbar" aria-label="Aktionen">
        <div className="nohand-toggle-row">
          <span className="nohand-toggle-label" id="nohand-switch-label">
            No-Hand Modus
          </span>
          <label className="nohand-switch" title={pcHint}>
            <input
              ref={nohandSwitchRef}
              type="checkbox"
              role="switch"
              aria-checked={
                !pcOk
                  ? false
                  : status?.nohandOn === null
                    ? "mixed"
                    : nohandChecked
              }
              aria-labelledby="nohand-switch-label"
              checked={nohandChecked}
              disabled={busy || !pcOk}
              onChange={(e) => cmd(e.target.checked ? "on" : "off")}
            />
            <span className="nohand-switch-slider" aria-hidden />
          </label>
          <span className="nohand-toggle-hint" aria-live="polite">
            {busy
              ? "…"
              : !pcOk
                ? "—"
                : status?.nohandOn === null
                  ? "?"
                  : nohandChecked
                    ? "AN"
                    : "AUS"}
          </span>
        </div>
        <div className="dash-toolbar-actions">
          <button
            type="button"
            className="btn-pill btn-ghost btn-toolbar"
            disabled={busy}
            onClick={() => load()}
          >
            Aktualisieren
          </button>
          <button
            type="button"
            className="btn-pill btn-ghost btn-toolbar btn-log-icon"
            title="Status-Log (wie Discord-Webhook)"
            aria-label="Status-Log öffnen"
            onClick={() => openStatusLog()}
          >
            L
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

      {logOpen ? (
        <div
          className="log-modal-backdrop"
          role="presentation"
          onClick={() => setLogOpen(false)}
        >
          <div
            className="log-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="log-modal-header">
              <div>
                <h2 id="log-modal-title">Status-Log</h2>
                <p className="treffer-meta log-modal-sub">
                  Spiegel der Meldungen an deinen No-Hand-Status-Webhook (vom PC
                  mitgeschrieben).
                </p>
              </div>
              <button
                type="button"
                className="log-modal-close"
                aria-label="Schließen"
                onClick={() => setLogOpen(false)}
              >
                ✕
              </button>
            </header>
            <div className="log-modal-scroll">
              {logLoading ? (
                <p className="treffer-meta">Laden …</p>
              ) : logErr ? (
                <p className="err">{logErr}</p>
              ) : logEntries.length === 0 ? (
                <p className="treffer-meta">Noch keine Einträge.</p>
              ) : (
                <ul className="log-modal-list">
                  {logEntries.map((ent) => (
                    <li key={ent.id} className="log-modal-item">
                      <div className="log-modal-time">
                        {formatDe(ent.created_at)}
                      </div>
                      <div className="log-modal-entry-title">
                        {ent.title || "—"}
                      </div>
                      {ent.body ? (
                        <pre className="log-modal-pre">{ent.body}</pre>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
