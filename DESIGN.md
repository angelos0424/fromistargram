---
version: alpha
name: Fromistargram Archive
description: Visual identity and implementation guidance for the Fromistargram Instagram archive interface.
colors:
  canvas: "#F8FAFF"
  canvas-warm: "#FFF6F2"
  ink: "#2D3748"
  muted: "#7B8794"
  quiet: "#9CA3AF"
  glass: "rgba(255,255,255,0.72)"
  glass-soft: "rgba(255,255,255,0.58)"
  glass-strong: "rgba(255,255,255,0.76)"
  glass-border: "rgba(255,255,255,0.70)"
  accent-sky: "#7EC8FF"
  accent-mint: "#8CE8D0"
  accent-lavender: "#B8A4F0"
  accent-pink: "#FFD4E5"
  accent-blue-soft: "#D4E4FF"
  accent-peach: "#FFE4D4"
  accent-purple-soft: "#E4D4FF"
  brand-yellow: "#FEDA75"
  brand-orange: "#FA7E1E"
  brand-rose: "#D62976"
  brand-indigo: "#4F5BD5"
  danger: "#B54B1A"
  danger-soft: "#FEFAEC"
  media-overlay: "#111827"
typography:
  font-family:
    sans: "Inter, ui-sans-serif, system-ui"
  sizes:
    title: "1.18rem"
    title-desktop: "1.3rem"
    body: "0.875rem"
    small: "0.75rem"
  weights:
    normal: 400
    medium: 500
    semibold: 600
    bold: 700
    extrabold: 800
radii:
  chip: "9999px"
  panel: "22px"
  panel-large: "24px"
  card: "22px"
spacing:
  page-x-mobile: "1rem"
  page-x-desktop: "1.25rem"
  section-gap: "0.75rem"
  grid-gap-mobile: "3px"
  grid-gap-desktop: "18px"
shadows:
  glass: "0 8px 30px rgba(45,55,72,0.08)"
  control: "0 6px 18px rgba(45,55,72,0.06)"
  accent: "0 10px 26px rgba(126,200,255,0.36)"
  media: "0 10px 26px rgba(45,55,72,0.10)"
layout:
  max-width: "1120px"
  media-aspect-ratio: "4 / 5"
  default-grid-columns: 3
  desktop-grid-card-width: "290px"
motion:
  duration-fast: "200ms"
  duration-normal: "300ms"
  easing: "ease"
---

# Fromistargram Archive Design System

This document is the persistent design source of truth for Fromistargram. It follows the DESIGN.md convention from `google-labs-code/design.md`: structured tokens first, then practical guidance for applying those tokens in code.

## Product Character

Fromistargram is a media archive, not a marketing site. The interface should feel calm, collectible, and fan-oriented while remaining efficient for browsing many Instagram posts. The current direction combines a dense archive grid with a soft branded atmosphere: pastel gradients, glass panels, rounded account chips, and strong media-first cards.

The design should avoid a plain database/admin look. It should also avoid becoming a decorative landing page. The first screen is the archive tool itself: account selection, search, sorting, type tabs, and the media grid.

## Visual Language

Use a light pastel canvas built from soft pink, blue, peach, and lavender fields. Panels sit on top as translucent glass surfaces with white borders and gentle shadows. Accent gradients use sky, mint, and lavender.

Do not use flat black controls for active states in this interface. Active controls should use the accent gradient. Neutral controls should be translucent white with muted text.

Use Instagram-inspired color only as a small signal, usually in the "All accounts" avatar mark. Do not turn the whole UI into a saturated Instagram gradient.

## Layout

The app is centered at `1120px` max width. The header is sticky and contains:

- title and short accent underline
- search, grid columns, and sort toggle
- account strip
- date filters and upload/reset controls

Below the header is a slim utility band. It should show the total count on the left and the content type tabs on the right: `전체보기`, `Post`, `Story`, `Other`.

The media grid is the primary content. On mobile it can remain tight and image-dense. On desktop it should breathe with an 18px gap and centered fixed-width columns.

## Components

### Account Strip

Account selection uses image plus text chips, not text-only pills. Each account chip contains:

- circular profile image or gradient initial fallback
- display name
- username line

The active state is a sky-mint-lavender gradient with white text. Inactive chips are glass white with subtle shadows. Horizontal scroll is acceptable on smaller widths; wrapping is preferred on desktop.

### Toolbar

The search input and grid selector are quiet glass controls. Sorting is a two-option segmented toggle:

- `최신순`
- `오래된순`

Do not reintroduce `미디어순` unless the backend supports a meaningful global media-count sort before pagination.

### Type Tabs

Content type tabs belong in the middle utility band, not directly above the grid. This keeps the grid area focused on media. Active tabs use the accent gradient. Inactive tabs use white glass.

### Media Cards

Cards use a 4:5 aspect ratio. On desktop, card corners should be rounded at 22px. On mobile, tighter grid edges are acceptable.

Hover behavior is important and should be preserved:

- image subtly scales
- card lifts slightly
- caption panel slides up from the bottom
- overlay uses a dark gradient from `media-overlay`

The caption must appear as a layer over the card, not as static text below the card.

### Pagination

Pagination should not be a flat white strip. It should be a rounded glass bar with top margin so it does not touch the media grid. Use the same previous/next button language as other controls.

Other/shared media must use pagination too. Showing only the first shared page makes it look like files disappeared.

## Data And Interaction Rules

Sorting must be applied server-side before pagination. Client-side sorting is acceptable only for already loaded subsets such as local search within the current page, and it should not be presented as global ordering.

When a control changes the data set, reset `page` to 1. This applies to account, date, type, and sort changes.

Search currently filters loaded data. If search is presented as global archive search later, backend query support must be added first.

## Accessibility And Usability

Text should stay high contrast against glass surfaces. Primary text uses `ink`; secondary text uses `muted`; placeholder text uses `quiet`.

Controls should keep stable heights:

- toolbar controls: 40px
- utility/tabs buttons: 36px
- pagination buttons: 36px
- account chips: 56px minimum

Do not use negative letter spacing. Keep labels short enough to fit their chip/button containers.

## Implementation Notes

Prefer existing Tailwind utility patterns in the app over adding a separate component library. Use explicit color values when matching the current visual system, unless the Tailwind theme is expanded with these tokens.

When changing the archive UI, check these files first:

- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/routes/FeedPage.tsx`
- `frontend/src/components/account/AccountStrip.tsx`
- `frontend/src/components/feed/PostCard.tsx`
- `frontend/src/components/feed/Pagination.tsx`
- `frontend/src/components/shared/SharedMediaCard.tsx`
- `frontend/src/index.css`

Before shipping visual changes, verify:

- desktop first viewport
- mobile wrapping
- account chip overflow
- hover caption reveal
- Other tab pagination
- empty state and loading skeletons
