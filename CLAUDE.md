# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Toku is a static spiritual/wellness website in **Georgian language**, covering chakras, tarot, aromatherapy, crystals, zodiac signs, planets, and accessories. It deploys automatically to GitHub Pages on push to `main`.

## No Build Process

This is a pure static site — no build step, no package manager commands, no test suite. To preview locally, open `index.html` in a browser or serve with any static file server:

```
npx serve .
# or
python -m http.server
```

## Architecture

### File Structure Pattern
- `index.html` — homepage with all major sections
- `style.css` / `responsive.css` — global styles split by purpose (layout vs. breakpoints)
- `script.js` — all client-side interactivity
- `index/<category>/<item>/<item>.html` — each subpage lives in its own directory alongside its own `.css` and `.js` files
- `img/<category>/` — images grouped by content type

### Subpage Categories
Each category under `index/` follows the same self-contained pattern (HTML + CSS + JS in same folder):
- `chakras/` — 7 chakra pages (muladhara, svadhistana, manipura, anahata, vishudha, ajna, sahasrara)
- `zodiac/` — 12 zodiac sign pages
- `planet/` — 8 planet pages (sun, moon, mercury, venus, mars, jupiter, saturn, lilit)
- `wishes/` — 6 goal pages (love, health, blessing, success, attraction, strength)
- `crystals/`, `tarots/`, `aromas/`, `accessories/`

### Dependencies (CDN + bundled)
- **Bootstrap 5** — bundled locally in `css/bootstrap.min.css` and `js/bootstrap.bundle.js`
- **Swiper.js v11** — loaded from CDN, used for the accessories coverflow carousel

### Key JavaScript Behaviors (`script.js`)
- **Dynamic scrollbar color**: Reads which chakra card is in the viewport and updates the `--scrollbar-thumb-color` CSS variable to match that chakra's color
- **Swiper carousel**: Coverflow effect for the accessories section
- **Scroll-to-top button**: Appears after scrolling down

### Image Naming Conventions
- `<name>_symbol.svg` — icon/symbol variant
- `<name>_base.svg` — meditation/illustration variant

## Deployment

GitHub Actions workflow (`.github/workflows/static.yml`) deploys the entire repo to GitHub Pages on every push to `main`. No manual steps needed.
