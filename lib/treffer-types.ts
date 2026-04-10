export type TrefferRow = {
  id: string;
  created_at: string;
  marke_modell: string | null;
  inserat_url: string | null;
  vergleich_url: string | null;
  angebot_preis_text: string | null;
  hits: number | null;
  top5_json: number[] | null;
  schnaeppchen: boolean | null;
  webhook_ok: boolean | null;
};

export type ManualTrefferRow = {
  id: string;
  created_at: string;
  marke_modell: string | null;
  vergleich_url: string | null;
  angebot_preis_text: string | null;
  hits: number | null;
  platform: string | null;
  import_tag: string | null;
};
