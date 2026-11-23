# Panel UI = MonoPanel Home UI

The Panel now uses MonoPanel Home's design system. No packages were added, removed or changed (`package.json` is untouched).

## What changed
- `index.html`: Home's "panel boot" loader (tile grid, progress, wipe-up). `window.__monoLoader.hide()` still drives it.
- `src/index.css`: Home's tokens (black surfaces, grey text scale, hairline borders, Space Grotesk, motion/z-index tokens).
  The Tailwind colour ramps (zinc / amber / emerald / red / sky ...) are remapped onto that palette, so every page restyles without markup changes.
- `src/styles/home/*.css`: Home's own stylesheets, copied unchanged (+ `nav.css` for the mobile bar). Hover rules are wrapped in `@media (hover: hover)` by `src/lib/postcss-hover-only.mjs` (wired in `vite.config.ts`), like on Home.
- `src/components/SiteSidebar.tsx`: the single main navigation on every page and every screen size (see round 2). Replaces the old top `Navbar`.
- `AdminShell`, `PanelLayout`, `Footer`, `ui/kit.tsx`, `ui/panelKit.tsx`, public `Home`, `Login`, `Register`: rebuilt in Home's style (inverted white hover/active states, mono captions, flat cards).
- Fonts: Space Grotesk is self-hosted (`public/fonts`). The other Admin > Appearance fonts load from Google Fonts only when selected.
- Icons: Home uses Iconify; the Panel keeps `lucide-react` (same icon set Home draws from).

## Removed (no longer used)
`Navbar`, `AdminSidebar`, `HeroSlider`, `CustomCursor`, `MonoLogo`, the orange logo/favicon SVGs, and the "custom cursor" toggle in user settings.

## Colour note
Home has no colour (success = brightest grey, danger = dimmest). The Panel follows it, so green/red/blue status colours became grey steps;
Badge/Btn also use solid / outlined / dashed styles to stay distinguishable. To get coloured statuses back, delete the block between the
`status colours` markers in `src/index.css`.

## Round 2 (after reviewing the screenshots)
**One navigation, same on desktop and mobile**
- The sidebar is the main navigation everywhere. What it lists follows where you are: website pages, the dashboard (Servers, VPS, Websites, Node.js, Lavalink, Upgrade, Store, Earn, Addons + Account), a server's own tabs (Console, Files, Backups ... published by the page via `src/lib/navStore.ts`) or the admin menu.
- The old top tab strip and the in-page server/VPS tab column were removed; dashboard and server pages use the full screen width.
- Mobile uses the exact same sidebar (it slides in behind a menu button in a slim top bar). Home's separate bottom bar and drawer were removed.

**Fixes from the screenshots**
- Sidebar was clipped at the bottom and links faded in on load: the middle now scrolls, the footer is pinned and the fade-in animation is off.
- Mail badge stretched into a wide pill: now a small count.
- Stray white dot in the top-left corner (scroll progress head): removed.
- Admin menu was squeezed to two items under the public links: admin mode now shows only the admin menu (website links are a collapsed group).
- Pages with their own centred `max-w` + extra padding were misaligned with the breadcrumb: removed, so every panel/admin page lines up.
- Home page: sections that stayed blank until scrolled now always render; the feature grid no longer shows a grey filler cell.
