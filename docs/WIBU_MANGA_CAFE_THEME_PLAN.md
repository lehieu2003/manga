# Wibu Manga Cafe Theme Plan

Reader: internal engineer maintaining the MangaDex Reader app.

Post-read action: implement or review the warm anime-native theme slice without changing app behavior.

## Summary

The theme direction is Kyoto Animation x Manga Cafe Warm: a restrained wibu visual language that feels like a professional manga reading shelf, not a generic dark dashboard. The theme keeps the app reader-first, dark, compact, and cover-led.

This slice is visual polish only. It does not change backend APIs, frontend routes, reader behavior, chapter filters, auth, or database schema.

## Visual Direction

- Use a dark warm cafe palette with amber and small sakura accents.
- Keep manga covers as the strongest visual element.
- Use subtle paper-grain and shelf-like surfaces instead of neon, cyberpunk, mascots, or decorative blobs.
- Keep controls compact and readable for long reading sessions.

## Theme Surfaces

- Global tokens define warm background, surface, line, text, muted, amber accent, sakura accent, and success colors.
- Header uses a translucent manga-shelf feel with warm borders and amber active states.
- Manga cards behave like book covers on a shelf, with warm shadow, cover frame, and status label.
- Home hero and supporting panel use cafe/shelf language while preserving existing layout.
- Manga detail cover frame presents the cover like a display poster.
- Chapter rows, badges, filters, and reader toolbar inherit the warm manga-cafe palette.

## Interfaces

- No public API changes.
- No route changes.
- No component prop changes are required for the MVP.
- Theme helpers live in global CSS classes and are applied to existing components.
- No new dependencies are required.

## Test Scenarios

- Home, Search, Manga Detail, Reader, Library, Login, and Register still render without obvious overlap at mobile and desktop widths.
- Chapter filter controls remain readable and keyboard usable.
- Reader toolbar remains compact and does not dominate page images.
- Manga card covers remain visually dominant in grids.
- Existing automated checks continue to pass: workspace tests, typecheck, and build.

## Defaults

- Default direction is Kyoto Animation x Manga Cafe Warm.
- Avoid neon cyberpunk, mascots, emoji icons, decorative blobs, and placeholder artwork.
- Sakura is only a highlight accent; amber and warm paper tones carry the base theme.
