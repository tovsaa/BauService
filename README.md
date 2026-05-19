# BauService Dionisie Bat

Website for **BauService**, a mobile Handwerker (tradesman) business in
Eschwege, Werra-Meißner-Kreis (Hessen, Germany).

**Live:** https://bauservice-esw.de/

Services: Fenster & Türen montage, Innentüren, Bodenverlegung (Vinyl /
Laminat / Parkett), Trockenbau, Baustoffverkauf inkl. Lieferung.
Working radius: ~60 km around Eschwege.

## Pages

| URL | Purpose |
|---|---|
| `/` | Homepage — hero, services, about, portfolio, reviews, contact |
| `/projekte/` | Portfolio gallery — dynamic, loaded from Supabase |
| `/konfigurator/` | Window & door configurator — client-side, sends WhatsApp/email |
| `/share/` | Contact landing page (QR code on business card points here) |
| `/impressum/` | Legal disclosure (German requirement) |
| `/datenschutz/` | Privacy policy (DSGVO) |
| `/404.html` | Custom 404 |

## Tech

- Plain HTML / CSS / JavaScript — no bundler, no npm, no build step
- One HTML file per page (head + nav + footer are intentionally duplicated)
- Self-hosted Montserrat + Manrope + Cormorant Garamond fonts (no Google Fonts)
- [Supabase](https://supabase.com) for dynamic data (projects portfolio + auth)
- Deployed via GitHub Pages on the `main` branch (root path)
- Custom domain via Porkbun DNS → GitHub Pages

## DSGVO / Privacy

- No cookies (except functional `localStorage` for the configurator)
- No third-party fonts, analytics, trackers, pixels, or embedded widgets
- Supabase is used only for site content, not for visitor tracking
- The configurator runs 100% client-side — nothing is sent to the server
- → no cookie consent banner needed

See `/datenschutz/` for the full privacy policy.

## Local development

No dependencies. Serve the repo root with any static HTTP server:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Or with Node:

```bash
npx http-server -p 8000
```

The portfolio page (`/projekte/`) fetches live data from Supabase — works
locally without modification.

## Deploy

Push to `main` → GitHub Pages auto-deploys in ~30-60 seconds.

GitHub Pages settings:
- Source: deploy from a branch
- Branch: `main`, folder: `/` (root)
- Custom domain: `bauservice-esw.de`
- Enforce HTTPS: ✓

## Related repositories

- **Admin panel:** [`tovsaa/BauService-admin`](https://github.com/tovsaa/BauService-admin)
  — live at https://admin.bauservice-esw.de/

## License

Proprietary. See [`LICENSE`](./LICENSE).
