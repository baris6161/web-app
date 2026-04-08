-- 3 Test-Inserate in Supabase (SQL Editor). Echte Zeilen wie vom PC.
-- Alternative: DASHBOARD_DEMO_TREFFER=1 in Vercel (ohne DB).

INSERT INTO public.nohand_web_treffer (
  marke_modell,
  inserat_url,
  vergleich_url,
  angebot_preis_text,
  hits,
  top5_json,
  schnaeppchen,
  webhook_ok
) VALUES
(
  'VW Polo',
  'https://suche.mobile.de/fahrzeuge/details.html?id=demo-vw-polo',
  'https://www.mobile.de/vergleich/demo-vw-polo',
  '13.500 €',
  4,
  '[12900, 13100, 13250, 13400, 13800]'::jsonb,
  false,
  true
),
(
  'BMW 320d',
  'https://www.autoscout24.de/angebote/demo-bmw-320d',
  'https://www.autoscout24.de/vergleich/demo-bmw',
  '22.900 €',
  5,
  '[23900, 24100, 24200, 24350, 24500]'::jsonb,
  true,
  true
),
(
  'Opel Corsa',
  'https://suche.mobile.de/fahrzeuge/details.html?id=demo-opel-corsa',
  'https://www.mobile.de/vergleich/demo-opel',
  '9.200 €',
  3,
  '[9800, 9900, 10100, 10200, 10500]'::jsonb,
  false,
  true
);
