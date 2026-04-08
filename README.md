# Angeschriebene Inserate — Web-Dashboard (Next.js)

Dark, mobile-first Oberfläche: Inserate aus Supabase, PC-Status, No-Hand an/aus (Befehle an den PC-Sync).

## Voraussetzungen

1. **Supabase:** SQL aus `docs/supabase/nohand_web_schema.sql` im SQL Editor ausführen.
2. **Umgebungsvariablen** (lokal: `.env`, auf Vercel: Project Settings → Environment Variables):

| Variable | Beschreibung |
|----------|----------------|
| `SUPABASE_URL` | Projekt-URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role (nur Server) |
| `DASHBOARD_USER` | Login-Benutzername |
| `DASHBOARD_PASSWORD_HASH` | bcrypt-Hash des Passworts (empfohlen, z. B. Vercel) |
| `DASHBOARD_PASSWORD` | optional nur lokal: Klartext (nie committen) |
| `SESSION_SECRET` | Geheimnis für JWT-Session (mind. 32 Zeichen in Prod.) |
| `DASHBOARD_DEMO_TREFFER` | optional `1` oder `true`: blendet 3 Demo-Zeilen ein (nur UI-Test; in Prod. wieder aus) |

Passwort-Hash lokal erzeugen (im Ordner `web/nohand-dashboard` nach `npm install`):

```bash
node -e "require('bcrypt').hash('DEIN_PASSWORT',10).then(console.log)"
```

## PC (AutoPointer)

- In `config/nohand_config.json`: `nohand_web_dashboard_enabled: true`
- In Projekt-`.env` (Root): `NOHAND_WEB_SUPABASE_URL`, `NOHAND_WEB_SUPABASE_SERVICE_ROLE_KEY` (gleiches Projekt wie Vercel) — damit bleibt eine ältere `SUPABASE_URL` für andere Skripte erhalten

## Entwicklung

```bash
cd web/nohand-dashboard
npm install
cp .env.example .env
# .env ausfüllen
npm run dev
```

App läuft auf Port **3010**. `npm run dev` / `npm run start` binden an **0.0.0.0**, damit du im WLAN vom Handy `http://<PC-IPv4>:3010` nutzen kannst (Firewall ggf. Port 3010 erlauben).

## Vercel (Deploy)

Ein automatisches Deploy aus dieser Umgebung ist **nicht möglich** ohne dein Vercel-Konto (Login / Token). So gehst du vor:

1. **Git:** Projekt auf GitHub/GitLab pushen (oder Vercel CLI mit lokalem Ordner — siehe unten).
2. **vercel.com** → *Add New Project* → Repository importieren.
3. **Root Directory:** `web/nohand-dashboard` (wichtig im Monorepo).
4. **Environment Variables:** alle Variablen aus der Tabelle oben eintragen (Produktion: `DASHBOARD_PASSWORD_HASH` + `SESSION_SECRET`, kein Klartext-Passwort).
5. **Deploy** — nach jedem Git-Push auf den verbundenen Branch baut Vercel neu.

**CLI (lokal auf deinem PC):**

```bash
cd web/nohand-dashboard
npx vercel login
npx vercel link    # Projekt zuordnen
npx vercel env pull .env.local   # optional: Secrets lokal
npx vercel --prod
```

**Alternative kostenlos/schnell:** Netlify (ähnlich: Build `npm run build`, Publish `.next` geht bei Next nicht 1:1 — dort „Next.js“-Preset wählen), Cloudflare Pages mit `@cloudflare/next-on-pages` (mehr Setup). Für Next.js 14 ist **Vercel** der unkomplizierteste Weg.

**Hinweis:** Nach dem Deploy die öffentliche URL in den Browsern testen; Cookies laufen über HTTPS (`secure` in Produktion).
