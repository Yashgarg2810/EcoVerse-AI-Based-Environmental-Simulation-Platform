---
name: EcoVerse Bio-Technical System
colors:
  surface: '#FFFFFF'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3f493f'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6f7a6e'
  outline-variant: '#becabc'
  surface-tint: '#006d30'
  primary: '#00652c'
  on-primary: '#ffffff'
  primary-container: '#15803d'
  on-primary-container: '#d3ffd5'
  inverse-primary: '#79db8d'
  secondary: '#006399'
  on-secondary: '#ffffff'
  secondary-container: '#7bc2ff'
  on-secondary-container: '#004f7b'
  tertiary: '#97344a'
  on-tertiary: '#ffffff'
  tertiary-container: '#b64c62'
  on-tertiary-container: '#fff1f1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#95f8a7'
  primary-fixed-dim: '#79db8d'
  on-primary-fixed: '#00210a'
  on-primary-fixed-variant: '#005323'
  secondary-fixed: '#cde5ff'
  secondary-fixed-dim: '#94ccff'
  on-secondary-fixed: '#001d32'
  on-secondary-fixed-variant: '#004b74'
  tertiary-fixed: '#ffd9dd'
  tertiary-fixed-dim: '#ffb2bd'
  on-tertiary-fixed: '#400013'
  on-tertiary-fixed-variant: '#81233b'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  impact-positive: '#16A34A'
  impact-warning: '#D97706'
  impact-negative: '#DC2626'
  data-teal: '#0D9488'
  technical-yellow: '#E4F222'
  mono-accent: '#08090A'
typography:
  hero-h1:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  hero-h1-mobile:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  section-h2:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.02em
  card-h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-main:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  mono-data:
    fontFamily: Courier Prime
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  max-width: 1280px
---

## Brand & Style

The design system is built on a "Bio-Technical" narrative—fusing the precision of high-end developer tools with the organic warmth of the natural world. It targets environmentally conscious stakeholders who demand professional-grade efficiency without the coldness of traditional enterprise software.

The aesthetic follows a **Minimalist-Modern** approach with **Glassmorphic** accents. It prioritizes clarity, extreme legibility, and a sense of "calm urgency." By utilizing expansive whitespace (breathability) alongside sharp, technical details, the UI evokes a feeling of high-end craftsmanship and environmental stewardship.

## Colors

The palette is anchored by **Deep Forest Green**, symbolizing stability and growth. This is supported by **Soft Ocean Blue** for secondary actions and information hierarchy. 

The background utilizes a curated off-white to reduce eye strain and provide a "warm paper" feel, while pure white is reserved strictly for elevated surface cards. We introduce a "Technical Yellow" inherited from high-performance toolsets to highlight active states or critical data points. Functional colors for positive, warning, and negative states are highly saturated to ensure clarity against the muted background.

## Typography

This design system uses **Inter** for its systematic flexibility and neutral tone, allowing the content and imagery to take center stage. 

Typography is characterized by tight tracking in large headlines to create a "locked-in" technical feel, while body text uses slightly generous tracking and line height to improve readability in data-heavy contexts. For specific technical readouts or coordinates, a monospaced font is introduced to reinforce the "tech" aspect of the eco-tech narrative.

## Layout & Spacing

The layout employs a **12-column fixed grid** for desktop, centered within the viewport to create a focused, editorial feel. 

Spacing follows a strict 4px base unit. We prioritize "generous negative space"—components are never crowded. Groupings should rely on whitespace rather than dividers wherever possible. 
- **Desktop:** 64px outer margins, 24px gutters.
- **Tablet:** 40px outer margins, 16px gutters.
- **Mobile:** 20px outer margins, 12px gutters; components typically stack into a single column.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows**. 

1. **Floor:** The off-white background (#F8FAFC).
2. **Surface:** Pure white cards (#FFFFFF) using a soft, diffused shadow (`0 2px 12px rgba(0,0,0,0.07)`).
3. **Overlay:** Modal windows and popovers use a slightly heavier shadow with a subtle background blur (backdrop-filter: blur(8px)) to imply transparency and lightness.

Avoid heavy borders or harsh transitions. Depth should feel natural, as if elements are hovering just above the surface.

## Shapes

The shape language is consistently **Rounded**, using a 16px (1rem) base for all primary containers, cards, and buttons. 

This specific radius balances the technical structure of the grid with an "organic" softness. Smaller components like tags or inputs may scale down to 8px (0.5rem) to maintain visual proportions, but the 16px radius remains the signature geometric identifier for the design system.

## Components

### Buttons
- **Primary:** Forest Green background, white text, 16px radius.
- **Secondary:** Transparent with a 1px border of Forest Green or Soft Ocean Blue.
- **Interaction:** On hover, apply a `translateY(-2px)` transform and a subtle brightness increase.

### Cards
- Always Pure White (#FFFFFF).
- 16px border radius.
- Minimalist padding (typically 24px or 32px).
- Use soft ambient shadows for separation.

### Inputs & Form Fields
- Soft background tint (#F1F5F9) with no border in default state.
- 1px Forest Green border on focus.
- 15px body text for input values.

### Chips & Tags
- Pill-shaped (fully rounded) for status indicators.
- Use low-opacity versions of the impact colors (e.g., light green background with dark green text) to indicate status without overpowering the layout.

### Icons
- Use thin-stroke line icons (1.5px or 2px weight).
- Icons should always be monochrome (Deep Forest Green or Gray-600) unless indicating a specific status (Red/Amber/Green).