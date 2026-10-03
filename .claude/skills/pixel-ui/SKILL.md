---
name: pixel-ui
description: Retro pixel-art UI style for Fashion in Pixels (fit-game). Use whenever building or editing any frontend screen, component, or style in this repo — login, lobby, dressing room, runway, voting, podium, marketplace — or when choosing fonts, colors, borders, buttons, backgrounds, or animations. Inspired by the retro pixelated look of pixel-converter.ameniwa.com (UI chrome only, not its anime artwork).
---

# Pixel UI

Every screen should look like a cute, cozy, retro handheld/PC game menu: chunky
pixel borders, bitmap fonts, flat colors, hard edges, stepped motion. If a
component could appear in a modern SaaS dashboard, it is wrong.

Design tokens and ready-made component classes live in
[`pixel-ui.css`](./pixel-ui.css). Import it once globally and build on its
variables and classes instead of inventing new values.

> **Palette status: provisional.** The source site could not be fetched when this
> skill was written, so the colors below are a pixel-pastel placeholder. When
> someone captures the site's real hex values, replace the `:root` tokens in
> `pixel-ui.css`. Components only reference tokens, so nothing else changes.

## Hard rules

1. **No smoothing, anywhere.**
   - `border-radius: 0` always. Fake rounded corners with stepped `box-shadow` (see `.px-box`).
   - No blur: no `filter: blur`, no blurred `box-shadow`, no `backdrop-filter`, no smooth gradients (hard-stop gradients for patterns and segmented bars are fine). Shadows are hard offsets (`4px 4px 0 var(--px-ink)`).
   - Every `<img>`, `<canvas>`, and sprite gets `image-rendering: pixelated` (`.px-img`).
2. **Integer pixel grid.** Spacing, borders, and sizes are multiples of `--px` (4px). Scale sprites by whole numbers only (2×, 3×, 4×), never by 1.5×, so pixels stay square.
3. **Bitmap fonts.**
   - Display/headings: `Press Start 2P`. Use it big and sparingly, because it is wide.
   - Body/UI text: `DotGothic16`, which also covers Japanese.
   - Numbers (timer, coins, stars): `VT323` or Press Start 2P.
   - Disable font smoothing on pixel text (`-webkit-font-smoothing: none`). Use sizes that are multiples of 8 for Press Start 2P (8/16/24/32px).
4. **Flat, limited color.** Pick from the tokens only. One accent color per screen region. Outlines are always `--px-ink`, never pure black or gray.
5. **Stepped motion.** Animate with `steps(n)` timing, not ease curves. Keep durations short (100–300ms) for UI and frame-by-frame for sprites. Respect `prefers-reduced-motion`.
6. **Buttons physically press.** Hover lifts or brightens. Active shifts the element down/right by the shadow size and removes the shadow (`.px-btn`).

## Component recipes (all in `pixel-ui.css`)

| Need | Class | Notes |
|---|---|---|
| Panel / window / card | `.px-box` | 4px ink border with notched corners and a hard drop shadow |
| Window with title bar | `.px-window` + `.px-window__title` | For marketplace and inventory panels |
| Button | `.px-btn`, `.px-btn--primary`, `.px-btn--danger` | Press-down on `:active` |
| Tabs (closet categories) | `.px-tabs` / `.px-tab[aria-selected=true]` | Selected tab merges into the panel below |
| Text input / email field | `.px-input` | Inset look, blinking block caret optional |
| Progress / timer bar | `.px-bar` + `--value` | Segmented blocks, not a smooth fill |
| Star rating | `.px-stars` | 5 pixel stars, keyboard accessible radio group |
| Speech / theme banner | `.px-banner` | Theme announcement at top of dressing screen |
| Coin / badge chip | `.px-chip` | Coins, player count, "NEW" |
| Item slot (inventory grid) | `.px-slot` | Square, selected = accent border + bounce |
| Background | `.px-bg-checker`, `.px-bg-dots` | Pure-CSS tiled patterns, no image files |
| Sprite | `.px-img` | Avatars, clothing, stage art |

## Screen guidance

- **Login:** centered `.px-window` on a `.px-bg-checker` background. Big Press Start 2P title, `.px-input` for email, one `.px-btn--primary`.
- **Lobby:** the runway stage fills the background. Players stand on the stage as scaled sprites with name `.px-chip`s above them. Marketplace is a side `.px-btn`. The Start button is the only primary button.
- **Dressing:** avatar on the left (large integer scale), `.px-window` with `.px-tabs` + `.px-slot` grid on the right, `.px-banner` theme on top, `.px-bar` 60s timer that changes to `--px-danger` in the last 10s.
- **Runway / voting:** one player at a time with a stepped back-to-front flip (swap the sprite frame, don't use a 3D rotate). `.px-stars` below.
- **Podium:** three stepped blocks (1st tallest) drawn with `.px-box`. Coins pop up with `px-pop`, plus a confetti made of square pixels.

## Do / Don't

- Do: chunky 4px outlines, generous padding, playful copy in caps for headings, tiny sparkle/heart pixel icons.
- Don't: rounded corners, soft shadows, smooth gradients, thin 1px hairlines, system fonts, SVG icon sets like Heroicons/Lucide. Draw icons as small pixel grids (PNG or CSS box-shadow art).
- Don't copy the source site's anime illustrations or characters. Only the UI chrome is the reference.

## Checklist before finishing a UI change

- [ ] No `border-radius`, smooth gradients, or blurred shadows were introduced.
- [ ] All images/canvases render pixelated at integer scales.
- [ ] Only `--px-*` tokens are used for color and spacing.
- [ ] Buttons have hover, active (pressed), and `:focus-visible` (dashed ink outline) states.
- [ ] Animations use `steps()` and are disabled under `prefers-reduced-motion`.
- [ ] Text contrast is readable (ink on light panels, cream on dark panels).
