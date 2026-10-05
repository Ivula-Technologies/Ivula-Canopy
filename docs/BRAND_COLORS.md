# Canopy brand colors

| Name | Hex | Role | Tailwind token | Semantic alias |
| --- | --- | --- | --- | --- |
| Canopy Blue | `#2E7D9A` | Primary | `--color-canopy-blue` | `--color-brand-primary` |
| Growth Green | `#5EAD65` | Secondary | `--color-growth-green` | `--color-brand-secondary` |
| Community Gold | `#E8A34C` | Accent | `--color-community-gold` | `--color-brand-accent` |

The tokens are defined in [`src/styles/brand-colors.css`](../src/styles/brand-colors.css),
which `src/app/globals.css` imports right after Tailwind. Tailwind v4 turns each
`--color-*` theme variable into utilities, so these work anywhere in the app:

```tsx
<button className="bg-brand-primary text-white hover:bg-canopy-blue/90">Donate</button>
<span className="text-growth-green">+12% this month</span>
<div className="border-l-4 border-brand-accent">Community spotlight</div>
```

The same values are available as CSS variables for non-Tailwind styles:
`var(--color-brand-primary)`, `var(--color-canopy-blue)`, and so on.

## Usage notes

- Prefer the semantic aliases (`brand-primary`, `brand-secondary`, `brand-accent`)
  in components, so a future palette change only touches `brand-colors.css`.
- Contrast with white text: Canopy Blue is about 4.6:1 (passes WCAG AA for body
  text). Growth Green (about 2.8:1) and Community Gold (about 2.2:1) do not, so
  use dark text such as `text-gray-900` on them, or keep them for large text,
  icons, borders and highlights.

## Relation to the existing palette

`globals.css` also defines the logo-derived `canopy-*` (forest green) and `sun-*`
(amber) scales that current pages use. The brand colors above are added
alongside them and do not change any existing page.
