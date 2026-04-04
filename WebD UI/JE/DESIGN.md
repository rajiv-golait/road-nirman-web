# Design System Document: Operational Authority

## 1. Overview & Creative North Star
**Creative North Star: "The Civic Architect"**
This design system moves beyond the "government portal" trope. It is designed to feel like a high-end architectural tool—authoritative, precise, and meticulously organized. For the field supervisors of the Solapur Municipal Corporation, the UI must translate complex road construction data into a clear, actionable narrative.

We break the "template" look by rejecting the traditional 12-column rigid grid in favor of **Intentional Asymmetry**. Large-scale editorial typography (Manrope) provides an authoritative "header" experience, while nested surfaces create a tactile, layered environment that feels more like a physical dashboard of instruments than a flat webpage.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
The palette is rooted in the Deep Navy of civic duty and the High-Visibility Orange of construction.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders to define sections. Layout boundaries must be established through:
1.  **Background Color Shifts:** A `surface-container-low` panel sitting on a `surface` background.
2.  **Tonal Transitions:** Moving from `surface-container-lowest` to `surface-container-high` to create organic focus.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
- **Base Layer:** `surface` (#faf9fc)
- **Content Sections:** `surface-container-low` (#f4f3f7)
- **Interactive Cards:** `surface-container-lowest` (#ffffff) for maximum "pop" and legibility.
- **Sidebars/Navigation:** `surface-container` (#eeedf1) to ground the interface.

### The "Glass & Gradient" Rule
To elevate the "operational" feel, use **Glassmorphism** for floating action panels. Use `surface_variant` at 70% opacity with a `24px` backdrop blur. 
**Signature Textures:** For primary CTA buttons or hero status cards, apply a subtle linear gradient: `primary` (#022448) to `primary_container` (#1E3A5F) at a 135-degree angle. This adds a "weighted" professional polish that flat fills lack.

---

## 3. Typography: Editorial Authority
We utilize two typefaces to balance character with utility.

*   **Display & Headlines (Manrope):** A modern sans-serif with a technical soul. Used for high-level data points (e.g., "78% Completion") and section headers. Its wide apertures ensure legibility in high-glare field conditions.
*   **Body & Labels (Public Sans):** A neutral, "workhorse" typeface designed for government interfaces. It provides maximum clarity for data tables, field notes, and status labels.

**Scale Utilization:**
- **Display-LG (3.5rem):** Reserved for singular, "North Star" metrics (e.g., total active road projects).
- **Headline-SM (1.5rem):** Used for project titles to give them an editorial, "front-page" feel.
- **Label-MD (0.75rem):** All-caps with 0.05em tracking for metadata (e.g., "LAT/LONG COORDINATES").

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often "muddy." This system relies on **Tonal Layering** to create lift.

*   **The Layering Principle:** Instead of a shadow, place a `surface-container-lowest` card on a `surface-container-low` section. The slight delta in hex values creates a sophisticated, "soft" lift.
*   **Ambient Shadows:** If a floating element (like a FAB or Popover) requires a shadow, use a custom blur: `0px 12px 32px rgba(30, 58, 95, 0.08)`. Notice the shadow is tinted with our Primary Navy, not grey, to maintain color harmony.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke (e.g., in high-contrast modes), use `outline-variant` at 15% opacity. Never use a 100% opaque border.

---

## 5. Components: Precision Instruments

### Buttons & CTAs
*   **Primary:** Gradient fill (`primary` to `primary_container`). `xl` (0.75rem) corner radius. No border.
*   **Secondary (Accent):** Use `secondary` (#9d4300) for "Action Required" states. It provides a sharp contrast to the Navy environment.
*   **Tertiary:** Text-only with `label-md` styling and a `primary` color tint. Use for "Cancel" or "Back" actions.

### Data Cards & Lists
*   **Forbid Divider Lines:** Separate list items using `16px` of vertical white space and a 2% background shift on hover.
*   **Status Indicators:** Use `secondary_container` (#fd761a) with `on_secondary_container` (#5c2400) for "In Progress" states. Use `error` (#ba1a1a) for "Delayed" projects. Indicators should be "pills" with `full` (9999px) roundedness.

### Input Fields
*   **Field Supervisor Focus:** Large touch targets. Fill inputs with `surface-container-highest` and use a bottom-only `outline` (#74777f) that expands to 2px `primary` on focus. This mimics a "ledger" feel.

### Specialized Component: The "Operational Progress Ribbon"
A custom component for road construction: A thick, `8px` height bar using `primary_fixed` as the track and a `secondary` (Orange) gradient as the progress fill. Place the percentage text in `headline-sm` directly above the bar, right-aligned for an asymmetrical look.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use extreme white space between sections (64px+) to allow the eye to rest.
*   **Do** overlap elements. A card can slightly "overhang" its container to create depth.
*   **Do** use `on_surface_variant` for secondary data to create a clear visual hierarchy.

### Don’t
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#1a1c1e).
*   **Don't** use standard Material Design "shadowed" cards. Stick to the Tonal Layering system.
*   **Don't** use generic icons. Use thick-stroke (2px) custom icons that feel industrial and robust.

---

## 7. Roundedness Scale
To maintain the "Architectural" feel, we use a structured rounding system:
- **`sm` (0.125rem):** Micro-indicators and tags.
- **`lg` (0.5rem):** Standard input fields and small cards.
- **`xl` (0.75rem):** Main content containers and buttons.
- **`full` (9999px):** Status badges and search bars.