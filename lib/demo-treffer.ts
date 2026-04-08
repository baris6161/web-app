import type { TrefferRow } from "@/lib/treffer-types";

/** Feste Demo-Zeilen (nur wenn DASHBOARD_DEMO_TREFFER=1), zum UI-Test ohne PC. */
export function getDemoTreffer(): TrefferRow[] {
  const now = new Date().toISOString();
  return [
    {
      id: "00000000-0000-4000-8000-000000000001",
      created_at: now,
      marke_modell: "VW Polo",
      inserat_url: "https://suche.mobile.de/fahrzeuge/details.html?id=demo-vw-polo",
      vergleich_url: "https://www.mobile.de/vergleich/demo-vw-polo",
      angebot_preis_text: "13.500 €",
      hits: 4,
      top5_json: [12900, 13100, 13250, 13400, 13800],
      schnaeppchen: false,
      webhook_ok: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      created_at: now,
      marke_modell: "BMW 320d",
      inserat_url: "https://www.autoscout24.de/angebote/demo-bmw-320d",
      vergleich_url: "https://www.autoscout24.de/vergleich/demo-bmw",
      angebot_preis_text: "22.900 €",
      hits: 5,
      top5_json: [23900, 24100, 24200, 24350, 24500],
      schnaeppchen: true,
      webhook_ok: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      created_at: now,
      marke_modell: "Opel Corsa",
      inserat_url: "https://suche.mobile.de/fahrzeuge/details.html?id=demo-opel-corsa",
      vergleich_url: "https://www.mobile.de/vergleich/demo-opel",
      angebot_preis_text: "9.200 €",
      hits: 3,
      top5_json: [9800, 9900, 10100, 10200, 10500],
      schnaeppchen: false,
      webhook_ok: true,
    },
  ];
}
