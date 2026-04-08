import type { TrefferRow } from "@/lib/treffer-types";

export function inferPlatform(
  inseratUrl: string | null,
  vergleichUrl: string | null
): string {
  const u = (inseratUrl || vergleichUrl || "").trim();
  if (!u) return "—";
  try {
    const host = new URL(u).hostname.toLowerCase();
    if (host.includes("mobile.de")) return "Mobile.de";
    if (host.includes("autoscout")) return "Autoscout";
    if (host.includes("ebay") && host.includes("kleinanzeigen"))
      return "Kleinanzeigen";
    if (host.includes("kleinanzeigen")) return "Kleinanzeigen";
    const short = host.replace(/^www\./, "").split(".")[0];
    return short ? short : "—";
  } catch {
    return "—";
  }
}

/** Erstes Wort = Marke, Rest = Modell (heuristisch). */
export function splitMarkeModell(raw: string | null): {
  marke: string;
  modell: string;
} {
  const s = (raw || "").trim();
  if (!s) return { marke: "—", modell: "—" };
  const i = s.indexOf(" ");
  if (i === -1) return { marke: s, modell: "—" };
  return { marke: s.slice(0, i), modell: s.slice(i + 1).trim() || "—" };
}

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function rowMatchesFilters(
  row: TrefferRow,
  f: { marke: string; modell: string; preis: string }
): boolean {
  const mm = splitMarkeModell(row.marke_modell);
  const full = (row.marke_modell || "").toLowerCase();
  const markeQ = f.marke.trim().toLowerCase();
  const modellQ = f.modell.trim().toLowerCase();
  if (
    markeQ &&
    !mm.marke.toLowerCase().includes(markeQ) &&
    !full.includes(markeQ)
  ) {
    return false;
  }
  if (
    modellQ &&
    !mm.modell.toLowerCase().includes(modellQ) &&
    !full.includes(modellQ)
  ) {
    return false;
  }
  const pq = digitsOnly(f.preis);
  if (pq.length > 0) {
    const rowP = digitsOnly(row.angebot_preis_text || "");
    if (!rowP.includes(pq)) return false;
  }
  return true;
}
