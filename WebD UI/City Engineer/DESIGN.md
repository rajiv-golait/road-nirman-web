# Design System Specification: Commissioner Command Center

## 1. Overview & Creative North Star
**Creative North Star: "The Sovereign Lens"**
This design system moves away from the "dashboard-as-a-service" aesthetic and toward a bespoke, high-stakes executive environment. It treats data not as a collection of charts, but as a strategic asset. The system is built on **Organic Brutalism**—a marriage of rigid, authoritative data structures and soft, ethereal layering. By utilizing intentional asymmetry and wide-set layouts, we break the "template" feel to create a sense of focused power. Every pixel must feel deliberate, reinforcing the Commissioner’s role as the final arbiter of infrastructure progress.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, atmospheric slate, providing a void-like canvas where critical information can "glow."

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. Structural boundaries must be defined solely through background color shifts. Use `surface-container-low` for large section blocks sitting on the `surface` background. This creates a "molded" look rather than a "sketched" look.

### Surface Hierarchy & Nesting
Treat the interface as a physical stack of semi-translucent materials.
- **Base Layer:** `surface` (#0b1326) – The bedrock of the application.
- **Section Layer:** `surface-container-low` (#131b2e) – Defines major functional zones.
- **Component Layer:** `surface-container` (#171f33) – The standard container for data cards.
- **Active/Elevated Layer:** `surface-container-high` (#222a3d) – Used for active states or focused modals.

### The Glass & Gradient Rule
To achieve the "Command Center" feel, use **Glassmorphism** for floating overlays and navigation sidebars. Apply a `backdrop-blur` of 12px-20px to `surface-container` with an opacity of 70%. 
*Signature Polish:* Main CTAs and KPI headers should utilize a subtle linear gradient from `primary` (#adc8f5) to `primary-container` (#1e3a5f) at a 135-degree angle to add "soul" to the otherwise flat dark theme.

---

## 3. Typography
**Typeface: Manrope**
Manrope was chosen for its geometric balance and authoritative "neo-grotesque" qualities. It bridges the gap between technical precision and executive readability.

- **Display (Lg/Md):** Used for top-level regional metrics. Tracking should be tightened (-2%) to feel more impactful and "headline" in nature.
- **Headline (Sm):** Used for major card titles. These are the "anchors" of the page.
- **Title (Md/Sm):** Used for data category headers. Use `on-surface-variant` to maintain a secondary visual hierarchy.
- **Body (Lg/Md):** Optimized for data density. All body text should use a line-height of 1.5x for maximum legibility in high-stress environments.
- **Label (Md/Sm):** Used for micro-data, timestamps, and "Live" indicators. Labels should always be Uppercase with +5% letter spacing to distinguish them from prose.

---

## 4. Elevation & Depth
In a strategic war room, depth equals importance. We avoid drop shadows in favor of **Tonal Layering**.

- **The Layering Principle:** Place a `surface-container-lowest` card inside a `surface-container-low` section to create a "recessed" effect. Conversely, place a `surface-container-highest` card to suggest a "pop-out" priority.
- **Ambient Glow:** For floating elements (like Mapbox tooltips), use an Ambient Glow rather than a shadow. Apply a blur of 30px using a 10% opacity of the `primary` color (#adc8f5).
- **The "Ghost Border" Fallback:** If a container requires a border for accessibility (e.g., in high-density tables), use the `outline-variant` (#43474e) at **15% opacity**. It should feel felt, not seen.
- **Pulsing Indicators:** Critical alerts (`tertiary` / #f97316) must feature a dual-ring pulse animation. An inner solid ring and an outer ring that scales and fades, creating a sense of urgency without visual clutter.

---

## 5. Components

### Dark Glass Cards
Cards are the primary vehicle for data. 
- **Style:** `surface-container` background with 75% opacity and a 16px backdrop-blur. 
- **Accent:** A 2px "Top-Stroke" only, using the status color (`tertiary` for critical, `secondary` for resolved). Do not wrap the whole card in a border.

### High-Density Data Tables
- **Styling:** Forbid divider lines. Use alternating row fills with `surface-container-low` and `surface-container-lowest`. 
- **Typography:** Use `label-md` for headers and `body-sm` for row data to maximize information density.

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`), `on-primary` text, `md` (0.375rem) roundedness.
- **Secondary:** Ghost style. No fill, `outline-variant` (20% opacity) border, `primary` text.
- **Tertiary (Critical Action):** `tertiary-container` fill with `on-tertiary-container` text.

### Live Pulsing Indicators
Small 8px circles.
- **Status: Critical:** `tertiary` (#f97316) with a 4s ease-in-out pulse.
- **Status: In-Progress:** `primary` (#3b82f6) with a static glow.
- **Status: Resolved:** `green` (#22c55e) with no glow.

### Mapbox Integration
The map is the heart of the system.
- **Theme:** Ultra-dark (monochrome slate). 
- **Data Layers:** Road construction lines should use `primary` for planned and `tertiary` for delayed. Use a glow-trace effect (2px stroke with 4px blur) for active routes.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use negative space to group items. A 32px gap is more effective than a line.
- **Do** use `on-surface-variant` for "labeling" and `on-surface` for "values" to create immediate data hierarchy.
- **Do** use `full` (9999px) roundedness for status chips, but `md` (0.375rem) for functional containers.

### Don’t:
- **Don’t** use pure white (#FFFFFF). Always use `on-surface` (#dae2fd) to reduce eye strain in dark environments.
- **Don’t** use standard "Drop Shadows." They muddy the deep slate background. Use tonal shifts or ambient glows.
- **Don’t** center-align data. This is a command center; left-aligned data is faster to scan and feels more authoritative.