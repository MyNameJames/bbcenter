---
version: alpha
name: "Uber Eats"
website: "https://www.ubereats.com"
description: >-
  A food-delivery marketplace that deliberately separates its visual identity from Uber's black core — the landing page runs on a warm amber-toned photography canvas with a 52px UberMove bold display headline in ink black, the same pure-black pill CTA (border-radius 500px) used for "Sign up," and address-search as the primary above-fold interaction. UberMoveText handles all body copy and nav at modest 400–500 weights; the only chromatic moment is the warm amber wash that bleeds from the hero food photography into the white-canvas sections below.

seo:
  title: "Uber Eats Design System for React — ink black on amber canvas, UberMove, 15 components"
  metaDescription: "Uber Eats' marketing design system: ink-black pill CTAs on a photography-led amber canvas, UberMove 52px display, address-search as the primary hero action. Tokens for React, Next.js, and AI coding tools."
  highlights:
    - "Photography-as-brand-canvas — the hero amber warmth comes entirely from food photography, not a declared brand color; the design system is structurally black-and-white below the fold"
    - "500px border-radius pill — the primary CTA and every badge/tag uses a near-infinite radius, making pill geometry the single most distinctive shape signal in the system"
    - "Address-search as hero CTA — unlike most food apps that lead with a Browse button, Uber Eats puts the location typeahead front-and-center as the primary above-fold action"
    - "Two-weight type split — UberMove (700 weight only) carries every heading; UberMoveText (400–500) carries everything else, creating a sharp editorial/utility divide with no middle tier"
    - "Black-on-white below the fold — once the hero photography ends, the system drops to pure ink on white with near-zero chromatic elements, trusting city-name grids and map thumbnails as the visual interest"
  tags:
    - "Food & Delivery"
    - "Marketplaces"
  lastUpdated: "2026-05-19"
  author:
    name: "Dov Azencot"
    url: "https://x.com/dovazencot"
  opening: |
    Uber Eats' marketing page makes a counterintuitive move for a brand famous for its green accent: the landing page at ubereats.com is structurally black and white. The above-fold hero is warm only because a large food photograph — a burger, fries, a tomato — bleeds warmth into the composition. The actual design system tokens underneath are ink black, pure white, and two neutral grays. The green that appears in the mobile app and brand advertising is absent from the captured marketing surface. What reads as amber is photography, not a brand color declaration.

    The DESIGN.md file packages the system into a machine-readable spec: 12 color tokens drawn from a strictly ink-black-and-white palette with two light gray surfaces, 11 typography tokens spanning UberMove bold at 28–52px for all heading tiers and UberMoveText at 14–18px for body and interface copy, 5 radius tokens anchored on a 500px pill as the dominant shape (the navigation sign-up button, all CTA chips, every badge), and 15 components covering the hero search form, the address typeahead input, the pill button, the split-section card, and the full-width map tile.

    Feed this file to Claude or Cursor and it reproduces Uber Eats' specific moves: pure-black pill CTAs rather than a green or colored fill, hero photography carrying the chromatic weight the brand doesn't declare in CSS, address-search as the hero's primary interaction rather than a browse button, and UberMove's single bold-only heading tier that creates typographic authority without a weight ladder. The one thing worth borrowing carefully is the photography-as-canvas approach — it only works when the imagery is consistently warm and high-production; inconsistent photography collapses the system back to plain black-and-white.
  related:
    - href: "/design"
      title: "Browse all design systems"
      description: "The full directory of DESIGN.md files on shadcn.io, with live mockups for each."
    - href: "https://www.ubereats.com"
      title: "Uber Eats — official site"
      description: "Uber Eats' public marketing site — the source of truth for the live tokens captured in this file."
    - href: "https://github.com/google-labs-code/design.md"
      title: "The DESIGN.md specification"
      description: "Google Labs' open spec for machine-readable design system files — the format this page is built on."
  questions:
    - id: "primary-color"
      title: "What is Uber Eats' primary brand color?"
      answer: "The captured marketing surface at ubereats.com is structurally black and white — there is no declared brand-layer color with more than 1 usage occurrence. The amber warmth that defines the above-fold hero comes entirely from food photography, not from a CSS color token. The primary CTA button uses ink black as its background fill. Uber Eats' famous green appears in the mobile app and brand advertising but is absent from the marketing site's extracted palette. If you need a green accent for an Uber Eats-style component, use the app's well-known green as a supplemental token rather than treating it as extracted ground truth."
    - id: "typography"
      title: "What typefaces does Uber Eats use, and what are good substitutes?"
      answer: "Uber Eats runs two proprietary fonts. UberMove carries every heading tier at weight 700, ranging from 28px (section headings) to 52px (the hero h1). UberMoveText handles all interface copy — navigation, body paragraphs, buttons, and captions — at weights 400 and 500, ranging from 14px to 18px. The two families create a strict editorial-versus-utility split with no middle weight tier. For open-source substitutes: Inter Black (weight 900) or Geist Bold approximate UberMove's display confidence; Inter Regular and Medium (400/500) match UberMoveText's interface role. Both families share a similar humanist grotesque structure."
    - id: "pill-radius"
      title: "Why does Uber Eats use such an extreme 500px border-radius?"
      answer: "The 500px border-radius value is effectively a CSS pill shorthand — on any element shorter than 1000px it renders identically to border-radius: 50% on short elements or 9999px on rectangles. Uber Eats applies this treatment to every button, badge, and status chip across the page, making the fully-rounded pill the brand's single most consistent shape signal. The nav 'Sign up' CTA, the search submission button, and every category chip all share this treatment. The alternative 8px radius appears on cards and the search-wrapper panel — the system is binary: surfaces use 8px rounding while interactive affordances use the pill."
    - id: "hero-search-pattern"
      title: "How is the Uber Eats hero search component structured?"
      answer: "The above-fold hero uses an address-search typeahead as the primary CTA rather than a button. The input is a full-width white field (height 40px, no visible border, no border-radius) paired with a black pill submit button labeled with a delivery icon. This pattern defers the 'pick a restaurant' experience behind a location gate — you cannot browse until you've entered an address. The hero heading ('Order delivery near you') is followed immediately by this input rather than a subheading or value-proposition paragraph. The address typeahead is the page's single most-important interaction and the layout treats it as such."
    - id: "below-fold-structure"
      title: "What does the Uber Eats page look like below the hero?"
      answer: "Below the hero photography band, the page drops to a white canvas with ink-black typography and near-zero chromatic elements. The sections are: a three-column feature row ('Feed your employees', 'Your restaurant, delivered', 'Deliver with Uber Eats'), each with a photograph thumbnail and a two-line heading; a full-width US map tile ('Cities near me') with a grid of city-name links in 16px UberMoveText; a 'Countries with Uber Eats' link grid; and the footer. The content is dense and informational rather than editorial — no large photography below the fold, no color accents, no gradient bands. The marketing system's single design statement lives entirely in the hero."

mockups:
  - "marketing-hero"
  - "checkout-flow"

colors:
  ink: "#000000"
  canvas: "#ffffff"
  surface-1: "#f3f3f3"
  surface-2: "#e8e8e8"
  ink-muted: "#000000"

typography:
  display-xl:
    fontFamily: "UberMove, sans-serif"
    fontSize: 52px
    fontWeight: 700
    lineHeight: 64px
    letterSpacing: 0
  display-md:
    fontFamily: "UberMove, sans-serif"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 44px
    letterSpacing: 0
  display-sm:
    fontFamily: "UberMove, sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: 0
  body-lg:
    fontFamily: "UberMoveText, system-ui, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0
  body-md:
    fontFamily: "UberMoveText, system-ui, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0
  body-md-medium:
    fontFamily: "UberMoveText, system-ui, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0
  body-sm:
    fontFamily: "UberMoveText, system-ui, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0
  label-md:
    fontFamily: "UberMoveText, system-ui, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0
  nav-link:
    fontFamily: "UberMoveText, system-ui, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0
  button-md:
    fontFamily: "UberMoveText, system-ui, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0
  caption:
    fontFamily: "UberMoveText, system-ui, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0

rounded:
  none: "0px"
  sm: "8px"
  pill: "500px"
  full: "9999px"

spacing:
  xs: "8px"
  sm: "12px"
  base: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
  section: "72px"

components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill}"
    padding: "12px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill}"
    padding: "12px"
    height: "36px"
    borderColor: "{colors.ink}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.none}"
    padding: "0px 40px"
    height: "72px"
  nav-link:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "72px"
  hero-heading:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
    padding: "0px"
  section-heading:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.display-md}"
    padding: "0px"
  body-paragraph:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-md-medium}"
    padding: "0px"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "0px"
    height: "40px"
  search-wrapper:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "56px"
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "16px"
  feature-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "16px"
  city-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    padding: "0px"
  section-band:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    padding: "72px 0px 88px"
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    padding: "40px"
  map-tile:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.display-md}"
    rounded: "{rounded.none}"
    padding: "16px"
---

## Overview

Uber Eats' marketing system is built on a paradox. **Photography-as-canvas**: a brand associated with a specific green delivers its entire above-fold chromatic energy through food photography rather than declared brand colors. The ink black and pure white that the CSS actually specifies are the entire structural palette — 997 and 36 occurrences respectively. The amber and warmth that register visually come from burgers, fries, and fresh produce photographed at high production quality. Where DoorDash runs a red-filled hero band and Grubhub uses dark near-black surfaces, Uber Eats delegates the hero's mood entirely to the imagery.

The typography system makes a matching editorial choice: two proprietary families with a strict role split and no overlap. UberMove runs exclusively at weight 700 across all heading sizes (28–52px), creating authority through scale alone. UberMoveText handles every other surface — buttons, body copy, navigation, captions — at weights 400 and 500. There is no medium-weight heading, no light-weight display. The gap between the bold heading tier and the interface tier is wide enough that no element risks occupying an ambiguous middle.

**Key Characteristics:**
- No declared brand color with more than 1 usage occurrence — ink black (`{colors.ink}`) at frequency 997 is the page's dominant color, used as text, border, and shadow.
- 500px border-radius pill geometry on every interactive element — the primary CTA, the nav sign-up button, all category chips — while cards and the search wrapper use 8px rounding. The system is binary: pill or soft-card, nothing in between.
- UberMove bold (700) for all headings, UberMoveText medium/regular (400–500) for all interface copy — a two-family split with no weight crossover.
- Address-search typeahead as the primary above-fold action, not a Browse button — the hero gates restaurant browsing behind location entry.
- Below-fold sections drop to pure white canvas with dense city-name and country-name link grids — no photography, no color, no gradient bands.
- Photography carries the entire emotional weight of the brand; the CSS token system is structurally monochrome.

## Colors

### Structural

- **Ink** (`{colors.ink}` — #000000): frequency 997. Used as text (483), border (483), shadow (28), background (3). The near-total dominant color — pure black runs the entire navigation, heading, body-copy, and link system. Not near-black; true zero-lightness black is the deliberate choice for every typographic surface.
- **Canvas** (`{colors.canvas}` — #ffffff): frequency 36. Used as background (31), text (3), border (2). The page floor beneath the photography hero and in all below-fold content bands. Pure white, not an off-white — there is no cream or warm-white softening in the system.
- **Surface-1** (`{colors.surface-1}` — #f3f3f3): frequency 5. Used as background (3), shadow (2). The light neutral behind section divider bands and subtle card lift contexts.
- **Surface-2** (`{colors.surface-2}` — #e8e8e8): frequency 3. Used as background (3). The secondary neutral for map tile backgrounds and feature-section fills.

## Typography

### Font Families

The system runs two proprietary custom families. **UberMove** carries every heading tier — it appears exclusively at weight 700, at sizes 28px, 36px, and 52px. The fallback stack is `sans-serif`, which makes the system entirely dependent on the custom font loading correctly; there is no system-ui intermediate fallback. **UberMoveText** runs on every non-heading surface — body paragraphs, navigation links, buttons, form labels, captions — at weights 400 and 500. The fallback stack is `system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif`, which provides reliable degradation through a standard system-ui chain.

### Hierarchy

| Token | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| `{typography.display-xl}` | 52px | 700 | 64px | Hero h1 ("Order delivery near you") |
| `{typography.display-md}` | 36px | 700 | 44px | Section h2 ("Cities near me") |
| `{typography.display-sm}` | 28px | 700 | 36px | Sub-section headings |
| `{typography.body-lg}` | 18px | 500 | 24px | Nav links and nav CTAs |
| `{typography.body-md}` | 16px | 400 | 24px | Default body paragraphs |
| `{typography.body-md-medium}` | 16px | 500 | 20px | Emphasized body and product callouts |
| `{typography.label-md}` | 14px | 500 | 16px | Button labels and small CTAs |
| `{typography.body-sm}` | 14px | 400 | 20px | Caption text and secondary links |
| `{typography.nav-link}` | 18px | 500 | 24px | Top-nav interactive links |
| `{typography.button-md}` | 14px | 500 | 16px | All button label text |
| `{typography.caption}` | 14px | 400 | 20px | Footer and metadata text |

### Note on Font Substitutes

Both UberMove and UberMoveText are proprietary. For UberMove at weight 700, **Geist Bold** or **Inter Black** (weight 900) approximates the display confidence; both share the humanist grotesque structure. For UberMoveText, **Inter** at weights 400 and 500 is the closest open-source substitute — the proportions transfer cleanly at the 14–18px interface sizes.

## Layout

### Spacing System

- **Base unit:** 8px, with 16px as the primary module.
- **Tokens:** `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.base}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 40px · `{spacing.2xl}` 64px · `{spacing.section}` 72px.
- **Hero section padding (vertical):** 72px top, 88px bottom — the most generous spacing interval in the system.
- **Nav horizontal padding:** 40px on each side, creating a wide gutter that keeps the wordmark and navigation from crowding the viewport edges.
- **Card internal padding:** 16px — consistent across all card surfaces.

### Grid & Container

- **Hero:** full-width with a 240px-wide left column holding the headline, search input, and subtext, while the right side extends into the full-bleed food photography.
- **Feature row:** 3-column equal-width grid for the B2B feature cards (employee ordering, restaurant delivery, courier sign-up).
- **City grid:** multi-column alphabetical link list filling the full container width — the system's densest typographic surface.
- **Max content width:** implied at ~1280px based on the nav padding and hero composition.

### Rhythm

The page is organized as a two-act structure: a single above-fold photographic hero (the brand moment), followed by a sequence of white-canvas informational sections with progressively denser content — feature cards, a full-bleed map, a city grid, a country grid, and the footer. The rhythm compresses as you scroll down; the brand expression concentrates entirely at the top.

## Elevation

The system has no meaningful shadow tier. The 28 shadow occurrences captured all use `{colors.ink}` (black) at low opacity — subtle elevation cues on the search wrapper and the nav bar. Depth on the page comes from three sources: the photography hero blending into the white canvas below, the `{colors.surface-1}` gray bands separating content sections, and the 8px border-radius card containers sitting on the white floor. No decorative drop-shadow treatment appears anywhere below the fold.

## Shapes

The radius vocabulary is binary: **pill or soft-card**.

- `{rounded.none}` 0px — applied to the address typeahead input field, which sits flush inside its search wrapper container.
- `{rounded.sm}` 8px — the search wrapper, cards, and map tile containers. The default "content surface" radius.
- `{rounded.pill}` 500px — the primary CTA button, the nav "Sign up" link, every category chip, and every badge element on the page. This value renders as a fully-rounded pill on any button-height element.
- `{rounded.full}` 9999px — equivalent to the pill treatment for icon-only circular elements.

The 500px pill is the brand's most distinctive geometric signal. On a page this typographically restrained, the fully-rounded interactive elements stand out as the system's single personality statement.

## Components

**`button-primary`** — Ink-black fill, white text, `{rounded.pill}` 500px radius, 12px padding, 36px height. The page's primary CTA — "Sign up" in the nav and the search submission target.

**`button-secondary`** — White fill, ink text, 1px ink border, pill radius. Used for secondary actions at the same size as the primary.

**`top-nav`** — White canvas, 72px height, 40px horizontal padding. Houses the Uber Eats wordmark and a right-aligned "Sign in" / "Sign up" cluster. No bottom border, no shadow.

**`nav-link`** — The nav "Sign up" target: ink-black background, white text, 8px radius, 12x16px padding — deliberately a filled dark pill in contrast to a transparent nav link, signaling the single recommended action.

**`hero-heading`** — Ink text on transparent surface, `{typography.display-xl}` (52px / 700). The hero h1 sits over the white left-column background before the photography takes over.

**`section-heading`** — Ink text, `{typography.display-md}` (36px / 700). Section-level headings in below-fold content.

**`body-paragraph`** — Ink text at `{typography.body-md-medium}` (16px / 500). Slightly heavier than the default 400 weight — product descriptions and feature callouts use medium weight body copy.

**`text-input`** — White canvas, ink text, no border-radius, no visible border in the captured extraction. Sits inside the `{component.search-wrapper}` as a contained input.

**`search-wrapper`** — White canvas, ink text, `{rounded.sm}` 8px radius, 12x16px padding, 56px height. The outer container holding the address typeahead and delivery-type selectors — the hero's primary interaction element.

**`card`** — White canvas, ink text, `{rounded.sm}` 8px, 16px padding. The base card for feature sections.

**`city-link`** — Transparent background, ink text at `{typography.body-md}`. Renders in dense multi-column grids — typographically the smallest unit in the system.

**`section-band`** — Light gray `{colors.surface-1}` background, full-width, generous vertical padding. Separates the content sections below the fold.

**`footer`** — White canvas, ink text at `{typography.caption}`, 40px padding. No surface contrast against the page floor.

## Do's and Don'ts

**Do** use photography to carry the system's chromatic weight above the fold. The ink-black token structure works because a high-production food photograph does the color work. A composition that relies on the CSS tokens alone will read as a black-and-white directory — the photography is load-bearing, not decorative.

**Do** apply the 500px pill radius to every interactive affordance — buttons, chips, badges, and status tags. The binary radius language (8px for surfaces, pill for interactives) is the system's shape signature; mixing in a 12px or 24px rounded button would read as an error.

**Do** keep UberMove exclusively at weight 700. Using UberMove at any weight other than 700 is not supported by the extraction — the font appears only in bold, and a lighter-weight display heading in the same family would undercut the heading-versus-interface division.

**Do** treat the address typeahead as the hero's primary action, not a "Get started" or "Order now" button. The location-gate pattern is the page's information architecture, not decorative — it sets the user's path through the product.

**Don't** use `{colors.surface-2}` (#e8e8e8) as a text background inside cards — it appears only 3 times, all as background fills on the map tile. Pairing body text on this gray would introduce a mid-tone surface the system doesn't use for content.

**Don't** add a heading weight below 700 in UberMove. The two-family split has no intermediate heading weight — using UberMove at 400 or 500 would conflict with the system's division where UberMoveText owns all non-700 weights.

**Don't** substitute a colored CTA button for the ink-black primary. The primary button is `#000000` fill — introducing a green, amber, or any chromatic button fill invents a token that doesn't exist in the captured marketing surface.

**Don't** use `{colors.canvas}` (#ffffff) as an ink or border color over dark backgrounds. The system has no dark-surface sections — all content areas below the fold are white-canvas. There is no established light-on-dark pattern for content components.

## Known Gaps

- **Brand green:** Uber Eats' well-known green accent (visible in the mobile app and brand advertising) does not appear in the captured marketing page extraction. Any green implementation would require referencing the app's color system, not these marketing tokens.
- **Mobile breakpoints:** the captured surface is at 1440px desktop width. The below-fold city grids and feature cards likely reflow significantly on mobile — the multi-column dense grids would not survive at 375px without substantial restructuring.
- **Hover and focus states:** no hover captures exist in the extraction. The full state matrix (input focus ring, button hover, nav hover) is not represented here.
- **Dark mode:** the marketing site is light-only. The Uber Eats app carries a dark theme that is not represented in this spec.
- **Restaurant card / browse surface:** the main product interaction — restaurant cards, menu items, ratings, price indicators — belongs to the app and authenticated delivery UX, which is not captured by the marketing landing page extractor.
- **Animation:** the hero photography loads with a fade-in sequence; the search typeahead has dropdown autocomplete styling. End-state values only are captured here.
