# Optivise – Setup Anleitung

## 1. Supabase Datenbank einrichten

1. Gehe zu deinem Supabase Projekt: https://ogliojfueypjhptxkdsp.supabase.co
2. Klick links auf **SQL Editor**
3. Klick auf **New Query**
4. Kopiere den Inhalt von `supabase_schema.sql` und führe ihn aus (Run)

## 2. Anthropic API Key holen

1. Gehe zu https://console.anthropic.com
2. Klick auf **API Keys** → **Create Key**
3. Key kopieren

## 3. `.env` Datei ausfüllen

Öffne `.env` und trage deinen Anthropic API Key ein:

```
VITE_SUPABASE_URL=https://ogliojfueypjhptxkdsp.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_vvcwkNhfu9uCLn77xtVOmQ_fdkeuNRO
VITE_ANTHROPIC_API_KEY=sk-ant-DEIN-KEY-HIER
```

## 4. Lokal starten

```bash
npm install
npm run dev
```

App läuft auf http://localhost:5173

## 5. Auf Vercel deployen

1. Gehe zu https://vercel.com → New Project
2. GitHub Repo verbinden (oder Ordner hochladen via `vercel` CLI)
3. Environment Variables setzen (alle 3 aus der .env)
4. Deploy!

### Schnell via CLI:
```bash
npm install -g vercel
vercel
```

Bei den Environment Variables in Vercel eintragen:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`  
- `VITE_ANTHROPIC_API_KEY`

## Wichtiger Hinweis

Der Anthropic API Key ist im Frontend eingebunden (VITE_). Das ist für eine interne Tool akzeptabel. Für eine öffentliche App empfiehlt sich ein Backend-Proxy.
