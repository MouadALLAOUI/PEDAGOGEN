# DESIGN.md — PEDAGOGEN UI Design System

## Direction

**Moroccan Premium** — Keep Moroccan identity but modernize with refined patterns, elegant typography, luxury feel.

---

## Color Palette

### Primary Colors
| Name       | Hex       | Usage                          |
|------------|-----------|--------------------------------|
| Emerald    | `#059669` | Primary brand, buttons, links  |
| Emerald Light | `#10B981` | Hover states, highlights    |
| Emerald Dark  | `#047857` | Active states, emphasis     |
| Emerald 50 | `#ECFDF5` | Light backgrounds, badges      |

### Neutral / Sand
| Name         | Hex       | Usage                          |
|--------------|-----------|--------------------------------|
| Sand         | `#FAFAF8` | Page background (warm off-white)|
| Sand Dark    | `#F5F0E8` | Subtle section backgrounds     |
| Cream        | `#FFF8EE` | Card backgrounds (light tint)  |
| Stone        | `#E7E5E4` | Borders                        |
| Stone Dark   | `#D6D3D1` | Dividers                       |
| Charcoal     | `#1C1917` | Primary text                   |
| Charcoal Mid | `#44403C` | Secondary text                 |
| Charcoal Light| `#78716C` | Muted text, placeholders       |

### Accent
| Name         | Hex       | Usage                          |
|--------------|-----------|--------------------------------|
| Terracotta   | `#C2410C` | Warnings, secondary accents    |
| Terracotta Light | `#EA580C` | Hover state                |
| Gold         | `#B45309` | Stars, premium badges          |
| Gold Light   | `#D97706` | Highlights                     |

### Semantic
| Name  | Hex       | Usage               |
|-------|-----------|---------------------|
| Red   | `#DC2626` | Errors, destructive |
| Green | `#16A34A` | Success             |

### Text & Background
| Name        | Hex       | Usage               |
|-------------|-----------|---------------------|
| Background  | `#FAFAF8` | Page background     |
| Foreground  | `#1C1917` | Primary text        |
| Muted       | `#78716C` | Secondary text      |
| Border      | `#E7E5E4` | Default border      |

---

## Typography

| Role      | Font              | Weight         | Size         |
|-----------|-------------------|----------------|--------------|
| Display   | Playfair Display  | 700, 800       | 2xl–4xl      |
| Body      | Inter             | 400, 500, 600  | sm–base      |
| Arabic    | Noto Sans Arabic  | 400, 500, 700  | sm–base      |
| Mono      | JetBrains Mono    | 400            | xs–sm        |

---

## Layout & Spacing

- **Max content width:** `max-w-5xl` (64rem / 1024px)
- **Page padding:** `px-4 sm:px-6 lg:px-8`
- **Section spacing:** `space-y-6` or `space-y-8`
- **Card padding:** `p-5` or `p-6`

---

## Components

### Cards
- `border-radius: 8px`
- Background: white or cream (`#FFF8EE`) for elevated cards
- Border: `1px solid #E7E5E4`
- Shadow: `0 1px 3px rgba(0,0,0,0.04)` — almost invisible
- Hover: `transform: translateY(-1px)`, border becomes `#059669` (emerald) at 30% opacity
- Gradient cards: subtle `linear-gradient(135deg, #ECFDF5 0%, #FFF8EE 100%)` background

### Buttons
- **Primary:** solid emerald bg (`#059669`), white text, `border-radius: 8px`, no gradient
  - Hover: lighter emerald (`#10B981`)
  - Active: darker emerald (`#047857`)
  - Shadow: `0 1px 2px rgba(5,150,105,0.15)`
- **Secondary:** transparent bg, emerald text, emerald border
- **Ghost:** transparent, text only, hover bg `#ECFDF5`
- **Danger:** solid red bg, white text

### Inputs / Selects / Textareas
- `border-radius: 8px`
- Border: `1px solid #E7E5E4`
- Focus: border emerald, `box-shadow: 0 0 0 3px rgba(5,150,105,0.1)`
- Background: white
- Transition: `all 0.2s ease`

### Badges
- Small pill shape, `border-radius: 9999px`
- Emerald variant: `bg #ECFDF5`, text `#059669`
- Muted variant: `bg #F5F0E8`, text `#78716C`

### Sidebar (Light)
- Background: white or `#FAFAF8`
- Border-right: `1px solid #E7E5E4`
- Active item: emerald left border + `bg #ECFDF5`
- Inactive: charcoal text, no bg
- Hover: `bg #F5F0E8`

---

## Decorative Elements

### Moroccan Geometric Dividers
- Used between sections (NOT as page backgrounds)
- Thin emerald or stone-colored lines forming geometric patterns
- Example: horizontal line with a small diamond/zellige motif at center
- CSS: simple border + centered icon or SVG
- Keep it minimal — a single decorative line, not a full pattern

### Zellige Pattern
- **Remove** the current full-page zellige background (too subtle to matter, adds noise)
- Replace with geometric dividers only where meaningful (section breaks, hero areas)

---

## Shadows

| Level    | Value                                              | Usage         |
|----------|----------------------------------------------------|---------------|
| None     | `none`                                             | Flat elements |
| Subtle   | `0 1px 3px rgba(0,0,0,0.04)`                      | Cards, inputs |
| Lifted   | `0 4px 12px rgba(0,0,0,0.06)`                     | Hover states  |
| Modal    | `0 20px 40px rgba(0,0,0,0.1)`                     | Modals, popups|

---

## Animations

- **Page transitions:** fade-in-up, 300ms ease-out
- **Card hover:** translateY(-1px), 200ms ease
- **Button press:** translateY(0) → translateY(1px), 100ms
- **Stagger:** 80ms delay between sequential items
- Keep animations subtle and purposeful — no bouncy or playful effects

---

## Arabic / RTL

- Font family: `'Noto Sans Arabic', 'Inter', sans-serif`
- Display: `'Noto Sans Arabic', 'Playfair Display', serif`
- All spacing utilities auto-flipped via `[dir="rtl"]` overrides (already in globals.css)

---

## What to Remove from Current Theme

1. **Zellige full-page background** — replace with geometric dividers
2. **Navy colors** — replace with Charcoal/Stone palette
3. **Gold accents** — replace with Terracotta or Gold only for premium badges
4. **Gradient buttons** — replace with solid emerald
5. **Glassmorphism** — replace with clean white/cream cards
6. **Pulse-teal animation** — replace with subtle emerald pulse if needed
7. **Dark scrollbars** — replace with stone-colored scrollbars

---

## What to Keep

1. **Playfair Display + Inter + Noto Sans Arabic** fonts
2. **8px border radius** consistency
3. **RTL support** infrastructure
4. **Anime.js** for page animations
5. **Responsive grid** patterns
