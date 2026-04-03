```markdown
# Design System Specification: Civic Infrastructure & Authority

## 1. Overview & Creative North Star: "The Digital Architect"
This design system moves away from the "clunky government portal" archetype and toward a high-end, editorial experience. Our Creative North Star is **"The Digital Architect."** Just as a master architect balances the weight of stone (authority) with the transparency of glass (modernity), this system uses heavy, authoritative typography paired with airy, layered surfaces.

We reject the rigid, boxy grid. Instead, we embrace **Intentional Asymmetry** and **Tonal Depth**. By using wide margins, oversized headlines, and overlapping elements, we create a sense of movement and progress—essential for an app dedicated to 'NIRMAN' (Construction/Creation).

## 2. Colors: Depth Over Definition
The palette is rooted in the deep blues of civic trust, punctuated by an energetic "Civil Engineering" orange. 

### The "No-Line" Rule
**Explicit Mandate:** 1px solid borders are prohibited for sectioning. Definition must be achieved through background shifts.
*   **Surface Hierarchy:** Use `surface-container-low` for the base page and `surface-container-lowest` for cards to create a "lift" effect without lines.
*   **Nesting:** To define importance, stack containers. An inner interactive element should sit on a `surface-container-high` to distinguish it from the background.

### The "Glass & Gradient" Rule
To elevate the "Smart City" feel, use **Glassmorphism** for persistent elements like Navigation Bars or Floating Action Buttons.
*   **Token Usage:** Use `surface` at 70% opacity with a `24px` backdrop blur.
*   **Signature Textures:** Apply a subtle linear gradient (Top-Left to Bottom-Right) from `primary` (#022448) to `primary_container` (#1E3A5F) for Hero sections and major Action Buttons. This adds a "soul" to the color that a flat fill lacks.

## 3. Typography: Editorial Authority
We utilize a dual-font approach to balance modernity with readability.

*   **Display & Headlines (Plus Jakarta Sans):** These are our "statement" pieces. Use `display-lg` for dashboard summaries (e.g., total roads completed) to create an editorial, data-heavy impact. The high x-height of Plus Jakarta Sans feels contemporary and bold.
*   **Titles & Body (Inter):** Inter is used for functional reading. It provides a neutral, high-legibility contrast to the more "stylized" headlines.
*   **Hierarchy Note:** Always lead with a strong `headline-lg` or `headline-md` to establish the "Architectural" layout, followed by generous `body-lg` text.

## 4. Elevation & Depth: Tonal Layering
In this system, depth is a result of light and material, not artificial strokes.

*   **The Layering Principle:** 
    *   Base Level: `surface`
    *   Sectional Level: `surface-container-low`
    *   Component Level (Cards): `surface-container-lowest`
*   **Ambient Shadows:** For floating elements, use a shadow color derived from `on-surface` at 6% opacity. 
    *   *Spec:* `0px 12px 32px rgba(26, 28, 30, 0.06)`. This mimics soft, natural ambient occlusion.
*   **The "Ghost Border" Fallback:** If a high-density UI requires a border, use `outline_variant` at **15% opacity**. It should be felt, not seen.

## 5. Components: Modern Primitives
All components must utilize the `full` (9999px) roundedness scale where possible to soften the "industrial" nature of road construction imagery.

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), `full` rounded, `title-sm` (Inter) for labels.
*   **Secondary:** `surface-container-high` background with `on-surface` text. No border.
*   **Tertiary:** No background. Use `primary` text weight 600 for visibility.

### Cards & Lists
*   **The Divider Ban:** Never use horizontal lines. Separate list items using a `12px` (Spacing 3) vertical gap and subtle background color shifts (`surface-container-low` vs `surface-container-highest`).
*   **Visual Padding:** Ensure internal card padding never drops below `24px` (Spacing 6) to maintain the "premium" breathing room.

### Input Fields
*   **Style:** Minimalist. Use `surface-container-highest` for the background fill with a bottom-only "active" indicator in `tertiary` (Orange). 
*   **Interaction:** On focus, the container should shift slightly to a lighter tone to signal readiness.

### Specialized App Components
*   **Status Badges:** For "Road Under Construction" or "Project Completed," use ultra-wide, `full` rounded chips with a `tertiary_container` background and `on_tertiary_fixed_variant` text.
*   **Progress Pillars:** Instead of thin bars, use thick, `16px` wide progress tracks with `surface-container-highest` as the track and the `primary` to `primary_container` gradient as the indicator.

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts. Let a headline sit on the left while the card content starts 1/3rd of the way across the screen to create whitespace.
*   **Do** use `display-lg` typography for single, impactful numbers (e.g., "85% Complete").
*   **Do** prioritize `surface_container_lowest` for interaction-heavy areas to draw the eye.

### Don't:
*   **Don't** use 100% black. Always use `on-surface` (#1A1C1E) for text to maintain a sophisticated tone.
*   **Don't** use sharp corners. Every corner must adhere to the `md` (1.5rem) or `full` roundedness scale.
*   **Don't** clutter the screen. If you have more than 5 elements in a view, use "Progressive Disclosure" (hide details until requested) to maintain the "Minimal" aesthetic.

---
*Note to Junior Designers: This system is not a set of constraints, but a foundation for intentionality. Every pixel should feel like it was placed by an architect, not a template.*```