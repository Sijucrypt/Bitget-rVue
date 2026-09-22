# UI Skill: Bitget rVue (Liquid Glass Research Desk)

**Version 2.** Supersedes the dark-only Linear/Cursor variant.

Opinionated, machine-readable constraints for generating Next.js UI for Bitget rVue. The aesthetic is a **translucent glass research desk**: a developer-grade, high-density data instrument floating on a calm ambient background. Think Linear/Cursor discipline for the data, Apple Liquid Glass for the chrome.

**Authoritative tokens:** `app/globals.css`. **Authoritative structure:** `Bitget_rVue_Frontend_Spec.md`. This file states the visual rules; the spec states the values and the layout. If they disagree, the spec wins and this file gets corrected.

---

## 1. Core Philosophy

* **Two themes, equal standing.** Light and dark are both first-class. Light mode is not an inversion of dark mode; it has its own contrast-tuned status colors.
* **Glass for chrome, opaque for data.** Translucency belongs to navigation, composers, palettes, and floating panels. Financial tables, evidence blocks, and long-form prose sit on solid surfaces. Legibility of numbers outranks the material effect.
* **Keyboard-first.** `Ctrl/Cmd+K` palette, `Ctrl/Cmd+Shift+O` new chat, `Ctrl/Cmd+B` sidebar. Every interactive element is reachable and visibly focusable.
* **High information density in data views, generous spacing in marketing views.** The board stays compact. The landing page is allowed to breathe. Do not apply one spacing rhythm to both.
* **Never pure black or pure white.** `--bg` is `#080A0A` in dark and `#F6F7F9` in light. Layered elevation and muted text carry contrast.
* **Restraint.** Motion and transparency are seasoning. If removing an effect does not cost clarity, remove it.

---

## 2. Color System

All colors are CSS custom properties resolved from `data-theme` on `<html>`. Components reference token names only. **Never hardcode a hex value in a component or a utility class.**

| Token group | Names |
|-------------|-------|
| Canvas & ambient | `--bg`, `--ambient-a`, `--ambient-b` |
| Surfaces | `--surface`, `--surface-raised` |
| Glass | `--glass-bg`, `--glass-border`, `--glass-highlight`, `--glass-shadow` |
| Structure | `--border` |
| Text | `--text`, `--muted`, `--tertiary` |
| Brand | `--accent`, `--accent-hover`, `--accent-contrast` |
| Status | `--positive`, `--negative`, `--warning` |

Concrete values per theme are tabulated in `Bitget_rVue_Frontend_Spec.md` section 4.2.

Usage rules:
* `--text` for headings and active data points, `--muted` for prose and table headers, `--tertiary` for timestamps, empty states, and disabled controls. Do not skip a level to get "more contrast".
* `--accent` marks interactivity: focus rings, active tabs, primary buttons, selected rows. It is not a decorative wash.
* Status colors carry meaning only: `--positive` premium/confirmation, `--negative` discount/error, `--warning` divergence/unusual volume/missing-data-caution. Never reuse them for branding.
* Neutral is the default state of the interface. Color is information.

---

## 3. Liquid Glass Material

Three tiers, defined once as utilities in `app/globals.css`:

| Utility | Blur | Application |
|---------|------|-------------|
| `.glass-1` | `blur(16px) saturate(160%)` | Sidebar, topbar, persistent chrome |
| `.glass-2` | `blur(24px) saturate(180%)` | Composer, floating cards, sticky action bars, toasts |
| `.glass-3` | `blur(32px) saturate(200%)` + scrim | Command palette, modals, drawers |

Every glass element is: translucent fill + 1px `--glass-border` + `--glass-shadow` + an inset top highlight (`inset 0 1px 0 var(--glass-highlight)`) that reads as a specular rim.

Mandatory fallbacks (see spec section 5.6): `@supports not (backdrop-filter...)` and `prefers-reduced-transparency: reduce` both collapse glass to opaque `--surface`. The layout must not shift when the fallback engages.

Budget: at most 4 concurrent `backdrop-filter` layers in the viewport, and never on a scrolling table body, a streaming text container, or any per-frame animated element.

**Ambient background.** Glass has nothing to refract without it. A fixed `z-index: -1` layer holds two or three large low-frequency radial gradients in `--ambient-a` / `--ambient-b` over `--bg`, plus 2-3% grain to stop banding. Drift, if any, is slower than ~40s and disabled under `prefers-reduced-motion`. This is a desaturated brand-tint wash for depth - not a purple/blue hero gradient.

---

## 4. Shape and Radii

| Element | Radius |
|---------|--------|
| Badges, buttons, inputs, chips | `8px` |
| Cards, panels, table wrapper | `12-16px` |
| Floating chrome (palette, modal, composer, drawer) | `20-24px` |
| Icon-only buttons, theme toggle | full |

**Do not pill everything.** Full rounding is reserved for icon-only controls and the theme toggle. Primary buttons are `8px`. Radii nest: an inner element's radius is roughly the outer radius minus the padding, never larger.

Borders: 1px `--border` for structure, 1px `--glass-border` for glass. In dark mode, borders do the work that shadows cannot. In light mode, `--glass-shadow` is permitted and useful - use it on floating chrome only, never on table rows.

---

## 5. Typography

* `--sans` (system UI stack) for prose, labels, navigation, marketing copy.
* `--mono` for **every** price, percentage, pp value, volume, timestamp, ticker, block height, and Evidence Package field. This is non-negotiable: mono keeps numeric columns aligned and visually separates machine data from human prose.
* No `next/font/google` - it fetches at build time and breaks offline builds. Vendor `woff2` with `next/font/local` if custom fonts are ever required.
* Weights: 600 headings, 500 labels, 400 data. Avoid heavy bolding; use `--text` vs `--muted` to create hierarchy instead.
* Sizes: 13px base, 12px dense tables, 11px uppercase micro-labels with `0.06em` tracking. Tight tracking (`-0.01em`) on headings 18px and up.
* Tabular numerals for any column that updates: `font-variant-numeric: tabular-nums`.

---

## 6. Layout and Spacing

* 4px grid. Tailwind default scale (`p-1` = 4px ... `p-6` = 24px). No arbitrary values for spacing.
* App shell: sidebar `w-64` (collapsed `w-14`), topbar `h-14`, conversation column `max-w-[760px]`, evidence rail `w-80`.
* Marketing shell: content `max-w-[1120px]`, section vertical rhythm `py-20` to `py-28`.
* Board: table wrapper `max-h-[72vh]` with sticky header; horizontal scroll with a sticky first column below 768px.
* Grid gaps: 8px inside dense components, 16px between cards, 24px between page sections.

---

## 7. Component Patterns

### A. Evidence / code block (opaque, never glass)

```html
<div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 font-[var(--mono)] text-[13px] text-[var(--muted)]">
  <div>rToken is materially outperforming the native stock's last closed price.</div>
  <div class="text-[var(--text)]">Divergence: +3.6pp</div>
</div>
```

### B. Status badge

```html
<span class="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-2 py-1 font-[var(--mono)] text-xs text-[var(--warning)]">
  <span class="h-1.5 w-1.5 rounded-full bg-[var(--warning)]"></span>
  Divergence
</span>
```

Claim-kind badges (`FACT`, `COMPUTED`, `INTERPRETATION`, `UNKNOWN`) use the same shape with a distinct hue per kind and are always mono uppercase.

### C. Metric card

Label (11px uppercase `--tertiary`) over value (18-20px mono `--text`) over delta (12px mono status color) plus a data-age line in `--tertiary`. Floating on the landing page it may be `.glass-2`; inside the report grid it is opaque `--surface`.

### D. Focus and hover

* Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]`. Never remove the ring without replacing it.
* Hover on rows and list items: background to `--surface-raised`. Do not signal hover with a color or a scale transform on data rows.
* Hover on glass chrome: brighten the inset highlight slightly. No translate, no grow.
* Transitions: 120-180ms `ease-out`, on `background-color`, `border-color`, `opacity`, `box-shadow` only. Never transition `backdrop-filter`.

### E. Streaming assistant text

Full-width prose block, no bubble, left accent hairline, caret while streaming, `aria-live="polite"`. Citation markers render as small mono chips that resolve to an `EvidenceItem.id`. An unresolvable citation shows a broken-reference warning - it is never silently dropped.

---

## 8. Icons and Imagery

* One icon system: `lucide-react`, wrapped by `components/ui/Icon.tsx`. Stroke width 1.75, sizes 14/16/20. Never emoji.
* No stock or generic AI imagery. The product's visual interest comes from real data: the live stat strip, the board preview, the evidence table.
* Ticker/asset identifiers may use a mono chip with the symbol; do not invent brand logos for underlying companies.

---

## 9. Motion

* Permitted: theme cross-fade (150ms), sidebar collapse, drawer/palette enter-exit, hover and focus transitions, streaming caret, one restrained hero entrance.
* Not permitted: scroll-triggered reveals on every section, animated counters on live financial data, parallax, fake cursor demos, ambient motion faster than ~40s.
* `prefers-reduced-motion: reduce` disables all non-essential motion. The interface stays fully coherent with animation off.

---

## 10. Honesty Rules (UI-level)

These exist because the product's entire value is trustworthiness.

* Every number on screen traces to an API response. No hardcoded demo values, no invented precision.
* Unavailable data renders `Data unavailable` - never `0`, never a plausible-looking placeholder.
* Missing on-chain or news data renders its `PENDING` state explicitly.
* "No significant divergence detected" is a normal, well-styled outcome, not an error.
* Every dataset shows a freshness timestamp.
* No testimonials, no fabricated accuracy claims, no trading-advice framing.
* AI-generated content is disclosed in the landing footer.

---

## 11. Pre-flight Checklist

* [ ] Both themes checked on every screen, including glass over the brightest ambient position
* [ ] Contrast: body text >= 4.5:1, UI/borders >= 3:1, in both themes
* [ ] No hardcoded hex values in components
* [ ] All numerics in `--mono` with `tabular-nums` where they update
* [ ] Glass only on chrome; tables, evidence blocks, and prose are opaque
* [ ] `backdrop-filter` and `prefers-reduced-transparency` fallbacks present and layout-stable
* [ ] Visible focus ring on every interactive element; full keyboard path through sidebar, palette, table, composer
* [ ] Radii consistent and nested correctly; buttons are not all pills
* [ ] Icons from one set; zero emoji
* [ ] Loading, empty, error, stale, and no-signal states all designed
* [ ] Motion restrained and fully disabled under `prefers-reduced-motion`
* [ ] Favicon present and brand-consistent
