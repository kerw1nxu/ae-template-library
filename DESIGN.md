# DESIGN

## Direction

The visual direction is a premium AE template library: restrained, professional, media-first, and optimized for browsing many creative assets without visual fatigue. The UI should feel closer to a polished production archive than a marketing site.

## Theme And Color

- Use a light, slightly tinted neutral base rather than pure white.
- Keep one primary dark text/action color and one quiet accent used sparingly for focus, selection, and active states.
- Avoid dominant purple-blue gradients, neon accents, and one-note monochrome palettes.
- Status colors should be functional and readable: danger, success, and muted states must be distinguishable without feeling loud.

## Typography

- Use a modern system sans stack that renders Chinese and Latin cleanly on Windows.
- Build hierarchy through size, weight, spacing, and line length rather than decorative type effects.
- Keep body copy compact and readable; labels and helper text should be short.
- Numbers, dates, and counts should align cleanly where used in lists or admin rows.

## Layout

- Homepage browsing should prioritize search, category filters, selected tags, and a stable template grid.
- Template cards should emphasize cover imagery, preview behavior, template name, metadata, and tags.
- Detail pages should make the video preview and download action obvious while keeping metadata and tag management organized.
- Admin pages should be denser than public browsing pages, but still scannable through clear grouping and row structure.
- Drawers should feel like focused tools, with clear headers, form rhythm, status states, and reachable actions.

## Components

- Buttons need clear primary, secondary, danger, disabled, hover, active, and focus states.
- Cards should be used only for repeated assets, panels, admin rows, and drawers. Avoid cards inside cards.
- Form controls must have visible labels, clear focus rings, readable helper text, and non-overlapping mobile layouts.
- Tags and chips should show active, inactive, disabled, and removable states without changing layout size.
- Empty, loading, error, and success states should use plain Chinese copy and preserve layout stability.

## Motion

- Use subtle transform and opacity transitions for hover, active, drawer, chip, and media preview states.
- Do not animate layout properties such as width, height, top, or left.
- Keep motion practical and fast; the site is a work tool, not a motion showcase.

## Responsive Behavior

- Desktop layouts may use wide grids and side panels.
- Tablet and mobile layouts should stack cleanly, keep buttons tappable, and prevent long Chinese labels from overflowing.
- Sticky filters and navigation should not cover content or create horizontal page overflow.

## Boundaries

- UI work must not change auth, role gating, route protection, upload permissions, scan behavior, database schema, or API contracts.
- Anonymous access remains limited to homepage and login unless product scope explicitly changes.
- Visual polish should not hide protected actions or make unavailable actions appear enabled.
