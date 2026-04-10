"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ManualTrefferRow, TrefferRow } from "@/lib/treffer-types";
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

type SourceMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type SourceHealth = {
  lastInsertAt: string | null;
  lastImportAt?: string | null;
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

function statusFromApiJson(sj: Record<string, unknown>): StatusPayload {
  const rawOn = sj.nohandOn;
  return {
    last_seen_at: (sj.last_seen_at as string | null) ?? null,
    pcOnline: Boolean(sj.pcOnline),
    nohandOn:
      typeof rawOn === "boolean"
        ? rawOn
        : rawOn == null
          ? null
          : Boolean(rawOn),
  };
}

export default function DashboardClient() {
  const router = useRouter();
  const [nohandTreffer, setNohandTreffer] = useState<TrefferRow[]>([]);
  const [manualTreffer, setManualTreffer] = useState<ManualTrefferRow[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [showNohand, setShowNohand] = useState(true);
  const [showManual, setShowManual] = useState(true);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [nohandMeta, setNohandMeta] = useState<SourceMeta>({
    page: 1,
    pageSize: 40,
    total: 0,
    totalPages: 1,
  });
  const [manualMeta, setManualMeta] = useState<SourceMeta>({
    page: 1,
    pageSize: 40,
    total: 0,
    totalPages: 1,
  });
  const [nohandHealth, setNohandHealth] = useState<SourceHealth>({
    lastInsertAt: null,
  });
  const [manualHealth, setManualHealth] = useState<SourceHealth>({
    lastInsertAt: null,
    lastImportAt: null,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [apiErrNohand, setApiErrNohand] = useState("");
  const [apiErrManual, setApiErrManual] = useState("");
  const [apiErrStatus, setApiErrStatus] = useState("");
  const [apiErrDebug, setApiErrDebug] = useState("");
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

  const isSourceSelected = showNohand || showManual;

  const refreshStatus = useCallback(async (): Promise<StatusPayload | null> => {
    try {
      const st = await fetch("/api/status", { credentials: "include" });
      if (st.status === 401) {
        router.push("/login");
        return null;
      }
      if (!st.ok) return null;
      const sj = (await st.json()) as Record<string, unknown>;
      const payload = statusFromApiJson(sj);
      setStatus(payload);
      setApiErrStatus("");
      return payload;
    } catch {
      setApiErrStatus("Status API Netzwerkfehler");
      return null;
    }
  }, [router]);

  const load = useCallback(async () => {
    setLoadErr("");
    try {
      const pageSize = nohandMeta.pageSize;
      const [tr, mt, st] = await Promise.all([
        fetch(
          `/api/treffer?page=${nohandMeta.page}&pageSize=${pageSize}`,
          { credentials: "include" }
        ),
        fetch(
          `/api/manual-treffer?page=${manualMeta.page}&pageSize=${pageSize}`,
          { credentials: "include" }
        ),
        fetch("/api/status", { credentials: "include" }),
      ]);
      if (tr.status === 401) {
        router.push("/login");
        return;
      }
      if (!tr.ok || !mt.ok) {
        setLoadErr("Inserate-Liste konnte nicht geladen werden.");
        setApiErrNohand(!tr.ok ? `Treffer API: HTTP ${tr.status}` : "");
        setApiErrManual(!mt.ok ? `Manual API: HTTP ${mt.status}` : "");
        return;
      }
      const [tj, mj] = await Promise.all([tr.json(), mt.json()]);
      setNohandTreffer((tj.treffer as TrefferRow[]) || []);
      setManualTreffer((mj.treffer as ManualTrefferRow[]) || []);
      setNohandMeta((tj.meta as SourceMeta) || nohandMeta);
      setManualMeta((mj.meta as SourceMeta) || manualMeta);
      setNohandHealth((tj.health as SourceHealth) || { lastInsertAt: null });
      setManualHealth(
        (mj.health as SourceHealth) || { lastInsertAt: null, lastImportAt: null }
      );
      setApiErrNohand("");
      setApiErrManual("");
      if (st.ok) {
        const sj = (await st.json()) as Record<string, unknown>;
        setStatus(statusFromApiJson(sj));
        setApiErrStatus("");
      } else {
        setApiErrStatus(`Status API: HTTP ${st.status}`);
      }
    } catch {
      setLoadErr("Netzwerkfehler beim Laden.");
      setApiErrNohand("Treffer API Netzwerkfehler");
      setApiErrManual("Manual API Netzwerkfehler");
    }
  }, [router, nohandMeta.page, nohandMeta.pageSize, manualMeta.page]);

  const loadDebug = useCallback(async () => {
    try {
      const r = await fetch("/api/dashboard-debug", { credentials: "include" });
      if (!r.ok) {
        setApiErrDebug(`Debug API: HTTP ${r.status}`);
        setIsAdmin(false);
        return;
      }
      const j = (await r.json()) as { isAdmin?: boolean };
      setIsAdmin(Boolean(j.isAdmin));
      setApiErrDebug("");
    } catch {
      setApiErrDebug("Debug API Netzwerkfehler");
    }
  }, []);

  useEffect(() => {
    loadDebug();
    load();
  }, [load, loadDebug]);

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

  const nohandFiltered = useMemo(
    () => nohandTreffer.filter((t) => rowMatchesFilters(t, filterObj)),
    [nohandTreffer, filterObj]
  );
  const manualFiltered = useMemo(
    () => manualTreffer.filter((t) => rowMatchesFilters(t, filterObj)),
    [manualTreffer, filterObj]
  );

  const filterActive =
    fMarke.trim() !== "" || fModell.trim() !== "" || fPreis.trim() !== "";

  type CombinedRow = {
    source: "nohand" | "manual";
    row: TrefferRow | ManualTrefferRow;
    createdAt: string;
  };

  const combinedFiltered = useMemo(() => {
    const out: CombinedRow[] = [];
    if (showNohand) {
      nohandFiltered.forEach((r) =>
        out.push({ source: "nohand", row: r, createdAt: r.created_at || "" })
      );
    }
    if (showManual) {
      manualFiltered.forEach((r) =>
        out.push({ source: "manual", row: r, createdAt: r.created_at || "" })
      );
    }
    out.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });
    return out;
  }, [showNohand, showManual, nohandFiltered, manualFiltered]);

  async function cmd(action: "on" | "off") {
    setMsg("");
    setBusy(true);
    const wantOn = action === "on";
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
      setMsg(
        wantOn
          ? "No-Hand AN — warte auf Bestätigung vom PC …"
          : "No-Hand AUS — warte auf Bestätigung vom PC …"
      );
      const deadline = Date.now() + 30_000;
      const pause = () => new Promise((res) => setTimeout(res, 450));
      let matched = false;
      while (Date.now() < deadline) {
        const s = await refreshStatus();
        if (s && s.nohandOn === wantOn) {
          matched = true;
          break;
        }
        await pause();
      }
      if (matched) {
        setMsg(wantOn ? "No-Hand ist an." : "No-Hand ist aus.");
      } else {
        setMsg(
          "Befehl gesendet; der PC meldet den neuen Status noch nicht — bitte Aktualisieren oder später erneut prüfen."
        );
      }
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
            {status?.last_seen_at ? (
              <span className="dash-subline-time">
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
        <span className="nh-toolbar-label" id="nohand-switch-label">
          NH-Modus
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
        <span
          className={
            busy
              ? "nh-mode-status nh-mode-status-busy"
              : !pcOk
                ? "nh-mode-status nh-mode-status-muted"
                : status?.nohandOn === null
                  ? "nh-mode-status nh-mode-status-muted"
                  : nohandChecked
                    ? "nh-mode-status nh-mode-status-on"
                    : "nh-mode-status nh-mode-status-off"
          }
          aria-live="polite"
        >
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
        <button
          type="button"
          className="btn-pill btn-ghost btn-toolbar nh-toolbar-btn"
          disabled={busy}
          onClick={() => load()}
        >
          Aktualisieren
        </button>
        <button
          type="button"
          className="btn-pill btn-ghost btn-toolbar btn-log-icon nh-toolbar-btn"
          title="Status-Log"
          aria-label="Status-Log öffnen"
          onClick={() => openStatusLog()}
        >
          L
        </button>
      </div>
      <div className="source-filter-row">
        <span className="source-filter-label">Quellen</span>
        <label className="source-filter-chip">
          <input
            type="checkbox"
            checked={showNohand}
            onChange={(e) => setShowNohand(e.target.checked)}
          />
          <span>No-Hand</span>
        </label>
        <label className="source-filter-chip">
          <input
            type="checkbox"
            checked={showManual}
            onChange={(e) => setShowManual(e.target.checked)}
          />
          <span>Manuell</span>
        </label>
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
            {filterActive ? <span className="badge filter-disclosure-badge">aktiv</span> : null}
          </button>
          <div
            id="filter-panel"
            role="region"
            aria-labelledby="filter-disclosure-btn"
            className={`filter-disclosure-panel${filterOpen ? " is-open" : ""}`}
          >
            <div className="filter-disclosure-inner">
              <div className="filter-grid">
                <label className="filter-field">
                  <span>Quellen</span>
                  <div className="source-filter-row inside-filter">
                    <label className="source-filter-chip">
                      <input
                        type="checkbox"
                        checked={showNohand}
                        onChange={(e) => setShowNohand(e.target.checked)}
                      />
                      <span>No-Hand</span>
                    </label>
                    <label className="source-filter-chip">
                      <input
                        type="checkbox"
                        checked={showManual}
                        onChange={(e) => setShowManual(e.target.checked)}
                      />
                      <span>Manuell</span>
                    </label>
                  </div>
                </label>
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
                <span className="treffer-meta">
                  {combinedFiltered.length} von {nohandTreffer.length + manualTreffer.length} Inseraten
                </span>
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

      {!showNohand && !showManual ? <p className="sub">Mindestens eine Quelle auswählen.</p> : null}
      {isSourceSelected ? (
        <section className="table-section">
          <div className="table-section-head">
            <h3>Ergebnisse ({combinedFiltered.length})</h3>
            <button
              type="button"
              className="btn-pill btn-ghost btn-toolbar"
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? "Aufklappen" : "Einklappen"}
            </button>
          </div>
          {collapsed ? (
            <p className="sub">Ergebnisliste eingeklappt.</p>
          ) : combinedFiltered.length === 0 ? (
            <p className="sub">Keine Inserate für diese Filter.</p>
          ) : (
            <div className="treffer-table-wrap">
              <table className="treffer-table">
                <thead>
                  <tr>
                    <th>Quelle</th>
                    <th>Marke</th>
                    <th>Modell</th>
                    <th>Preis</th>
                    <th>Plattform</th>
                    <th>Vgl.</th>
                    <th>Inserat</th>
                    <th>Vergleich</th>
                    <th className="th-time-end">Zeit</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedFiltered.map((entry) => {
                    const t = entry.row;
                    const { marke, modell } = splitMarkeModell(t.marke_modell);
                    const plat =
                      entry.source === "manual" &&
                      "platform" in t &&
                      typeof t.platform === "string" &&
                      t.platform.trim()
                        ? t.platform
                        : inferPlatform(
                            "inserat_url" in t ? t.inserat_url : null,
                            t.vergleich_url
                          );
                    return (
                      <tr key={`${entry.source}:${t.id}`}>
                        <td>
                          <span className="badge">
                            {entry.source === "nohand" ? "No-Hand" : "Manuell"}
                          </span>
                        </td>
                        <td>{marke}</td>
                        <td>{modell}</td>
                        <td className="td-nowrap">{t.angebot_preis_text || "—"}</td>
                        <td>{plat}</td>
                        <td className="td-center">{t.hits != null ? `${t.hits}/5` : "—"}</td>
                        <td className="td-actions">
                          {"inserat_url" in t && t.inserat_url ? (
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
                        <td className="td-time td-time-end">{formatDe(t.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <section className="health-grid">
        <div className="card health-card">
          <strong>No-Hand</strong>
          <p className="treffer-meta">Letzter Insert: {formatDe(nohandHealth.lastInsertAt ?? null)}</p>
          <p className="treffer-meta">
            Seite {nohandMeta.page}/{nohandMeta.totalPages} · {nohandMeta.total} gesamt
          </p>
        </div>
        <div className="card health-card">
          <strong>Manuell</strong>
          <p className="treffer-meta">Letzter Insert: {formatDe(manualHealth.lastInsertAt ?? null)}</p>
          <p className="treffer-meta">Import zuletzt: {formatDe(manualHealth.lastImportAt ?? null)}</p>
          <p className="treffer-meta">
            Seite {manualMeta.page}/{manualMeta.totalPages} · {manualMeta.total} gesamt
          </p>
        </div>
      </section>

      <section className="pager-row">
        <div className="pager-group">
          <span className="treffer-meta">No-Hand</span>
          <button
            type="button"
            className="btn-pill btn-ghost btn-toolbar"
            disabled={nohandMeta.page <= 1}
            onClick={() => setNohandMeta((m) => ({ ...m, page: Math.max(1, m.page - 1) }))}
          >
            Zurück
          </button>
          <button
            type="button"
            className="btn-pill btn-ghost btn-toolbar"
            disabled={nohandMeta.page >= nohandMeta.totalPages}
            onClick={() =>
              setNohandMeta((m) => ({ ...m, page: Math.min(m.totalPages, m.page + 1) }))
            }
          >
            Weiter
          </button>
        </div>
        <div className="pager-group">
          <span className="treffer-meta">Manuell</span>
          <button
            type="button"
            className="btn-pill btn-ghost btn-toolbar"
            disabled={manualMeta.page <= 1}
            onClick={() => setManualMeta((m) => ({ ...m, page: Math.max(1, m.page - 1) }))}
          >
            Zurück
          </button>
          <button
            type="button"
            className="btn-pill btn-ghost btn-toolbar"
            disabled={manualMeta.page >= manualMeta.totalPages}
            onClick={() =>
              setManualMeta((m) => ({ ...m, page: Math.min(m.totalPages, m.page + 1) }))
            }
          >
            Weiter
          </button>
        </div>
      </section>

      {isAdmin ? (
        <section className="card debug-card">
          <div className="table-section-head">
            <h3>Admin Debug</h3>
            <button
              type="button"
              className="btn-pill btn-ghost btn-toolbar"
              onClick={() => setShowDebug((v) => !v)}
            >
              {showDebug ? "Verbergen" : "Anzeigen"}
            </button>
          </div>
          {showDebug ? (
            <div className="debug-grid">
              <p className="treffer-meta">Treffer-Fehler: {apiErrNohand || "—"}</p>
              <p className="treffer-meta">Manual-Fehler: {apiErrManual || "—"}</p>
              <p className="treffer-meta">Status-Fehler: {apiErrStatus || "—"}</p>
              <p className="treffer-meta">Debug-Fehler: {apiErrDebug || "—"}</p>
              <p className="treffer-meta">Zähler No-Hand: {nohandMeta.total}</p>
              <p className="treffer-meta">Zähler Manuell: {manualMeta.total}</p>
            </div>
          ) : null}
        </section>
      ) : null}

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
