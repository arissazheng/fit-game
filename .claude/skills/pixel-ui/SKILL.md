---
name: pixel-ui
description: Retro desktop (Windows 95/98-style) pixel UI for Fashion in Pixels (fit-game). Use whenever building or editing any frontend screen, component, or style in this repo — login, lobby, dressing room, runway, voting, podium, marketplace — or when choosing fonts, colors, borders, buttons, backgrounds, layout, or animations. Based on the UI chrome of pixel-converter.ameniwa.com, not its anime artwork.
---

# Pixel UI: retro desktop

The whole game looks like an old desktop computer: teal background, silver
beveled windows with navy-to-blue gradient title bars, chunky 3D buttons, sunken
black preview areas, a status bar, and a taskbar along the bottom. The game plays
full screen: one big main window, centered on the desktop, fills everything
above the taskbar, and each screen's panels are child windows inside it. The pixel-art avatars and clothes
sit inside those windows.

Tokens and ready-made component classes live in [`pixel-ui.css`](./pixel-ui.css).
Import it once globally (plus [`pixel-ui.js`](./pixel-ui.js) for tabs and upload areas), then build with its variables and classes. Don't invent
new colors, fonts, or bevels. [`demo.html`](./demo.html) shows every component.

## The look, in one list

| Element | Spec |
|---|---|
| Layout | full-screen `.px-desktop` grid: desktop icons in a narrow left column, one centered `.px-window--main` (max 1600px wide, full height above the taskbar), and an empty mirror column on the right so the window sits truly centered. Child windows inside it share the space with grid/flex, and the stage well stretches to fill the rest. |
| Desktop background | flat teal `#008080` (`--desk`) |
| Window / button face | silver `#c0c0c0` (`--face`) |
| Bevels | 2-line inset shadows: white/light on top-left, gray/near-black on bottom-right. Raised for buttons and windows, inverted (sunken) for inputs, wells, slots, and pressed buttons. Use the `--bevel-*` tokens. |
| Title bar | left-to-right gradient navy `#000080` → blue `#1084d0`, white text, `_ □ ×` controls on the right. Inactive windows use a gray gradient. |
| Selected state | solid navy fill `#000080` with white text (selected size button, palette, inventory slot, menu hover) |
| Preview / stage | black well (`.px-well`) with a sunken bevel, gray "Drag & Drop" empty-state text |
| Status bar | row of sunken cells at the bottom of a window: message on the left, small value cells on the right (e.g. `5px` `Sakura`) |
| Taskbar | silver bar fixed to the bottom: `Start` button, task buttons, clock tray on the right |
| Speech bubble | pale yellow `#ffffe1`, thin black border, rounded corners. This is the only rounded thing in the UI. |
| Fonts | Pixelify Sans for all chrome. Google Sans only for long or readable text. See below. |

## Hard rules

1. **Beveled, flat, no modern softness.**
   - No `border-radius` except on `.px-bubble`.
   - No blur, no drop shadows that fade, no glassmorphism.
   - The only gradient allowed is the title bar's navy→blue (plus hard-stop patterns such as the progress blocks).
   - Depth comes only from the bevel tokens.
2. **Buttons press in.** `:active` swaps `--bevel-raised` for `--bevel-pressed` and nudges the label 1px down-right. Toggle buttons that are "on" (size, palette, category, star rating) get the navy selected style, not a color accent.
3. **Fonts: Pixelify Sans + Google Sans.** Both come from one Google Fonts link (see top of `pixel-ui.css`).
   - **Pixelify Sans** (`--font-pixel`) is the default for everything in the chrome: title bars, menus (`File(F) Edit(E) View(V) Help(H)`), buttons, labels like `SIZE` / `FX`, status bar, taskbar, timer, scores, player names.
   - Uppercase section labels with slight letter-spacing.
   - Keep sizes at 15–20px for UI and 18px for title bars. Go larger only for big moments (theme reveal, winner).
   - **Google Sans** (`--font-text`) only for paragraphs, help text, fine print, form inputs, and errors. Applied automatically to `p`, `small`, `.px-text`, and `.px-input`.
   - No other fonts.
4. **Pixel art stays pixel art.** All avatars, clothing sprites, and stage art use `image-rendering: pixelated` (`.px-img`) and integer scaling (2×, 3×, 4×).
5. **Color discipline.** Chrome uses only the silver/navy/teal tokens. Bright color belongs to the pixel art (avatars, clothes, palette swatches), not the UI.
6. **Motion is choppy and rare.** Use `steps()` timing, short durations, and things like window pop-ins, a blinking caret, or a step-by-step progress fill. Respect `prefers-reduced-motion`.

## Components (`pixel-ui.css`)

| Need | Markup / class |
|---|---|
| Page / full-screen layout | `.px-desktop` > `.px-desktop__icons` + `.px-window.px-window--main` (+ `.px-taskbar` after it). Stacks to one column under 860px. |
| Desktop shortcut | `button.px-icon` > `img` + `span` label (white text, black text-shadow) |
| Window | `.px-window` > `.px-titlebar` (title + `.px-titlebar__controls` with 3 buttons) > optional `.px-menubar` > `.px-window__body` > optional `.px-statusbar` |
| Inactive window | add `.is-inactive` |
| Section label | `.px-label` (`SIZE`, `FX`, `CLOSET`) |
| Button | `.px-btn`. Selected: `aria-pressed="true"`. Full-width action: `.px-btn--wide` (like `↓ DOWNLOAD PNG`) |
| Button rows / 2-col grid | `.px-btn-row`, `.px-btn-grid` |
| Palette / colorway chip | `.px-btn.px-swatch` > `.px-swatch__colors` (`<i style="background:…">` ×N) + label |
| Text input | `.px-input` (white, sunken) |
| Checkbox | `label.px-check` > `input[type=checkbox]` + text (`ON / OFF`) |
| Preview / stage / avatar viewport | `.px-well` (+ `.px-well__empty` for the empty state) |
| Upload area (click or drop) | `.px-well.px-dropzone` containing `<input type="file" accept="image/*" multiple>` and a `.px-well__empty` "Drag & Drop or Click" label. With `pixel-ui.js`, clicking **anywhere** in the black box opens the file picker (Enter/Space too), dropping files works, the first image previews in the box, and a `px-files` event delivers the `File` list to your code. Never make only the text clickable. |
| Inventory grid cell | `.px-slot` (selected: `aria-selected="true"`) |
| Tabs (closet categories) | `.px-tabs[role=tablist]` > `button.px-tab[role=tab][aria-controls]`, one `.px-tabpanel[role=tabpanel]` per tab. Include [`pixel-ui.js`](./pixel-ui.js), which wires click and arrow-key switching. The open tab is taller and bold and joins the panel. Only the open tab's panel is visible (others get `hidden`), so each category shows only its own items. |
| Timer / progress | `.px-progress` > `i`, set `--value` 0..1. Add `.is-danger` in the last 10s |
| Status bar | `.px-statusbar` > `span` cells |
| Taskbar | `.px-taskbar` > `.px-btn` Start, `.px-btn.px-taskbar__task` …, `.px-taskbar__tray` (clock) |
| Mascot / host speech | `.px-bubble` |

## Mapping game screens to the desktop

- **Login:** teal desktop with a small centered window `Fashion in Pixels v1.0`. Inside: a `.px-label` EMAIL, a `.px-input`, and an `OK` / `Log in` `.px-btn`. Taskbar shows `Start` + clock.
- **Lobby (`index.html`, the first page):** left column `Avatar.exe` (name, skin tone swatches, hair color swatches, hairstyle buttons, Shuffle) and `Upload.exe` (up to 10 outfit photos). Right: `Lobby.exe` well showing your avatar on the runway floor with a name tag, a players row, and `▶ START GAME`. In the lobby everyone wears the plain outfit (black tank + shorts, no accessories). Start sends all players to the outfit builder.
- **Avatars:** one shared chibi body for everyone, drawn by `avatar.js` on a 64×96 canvas (big head, closed happy eyes, blush, 1px outline in a darker shade of each color). Only skin tone, hair color, and hairstyle vary. Always render through `FIPAvatar.render()` and scale with `FIPAvatar.fit()` (whole numbers only). `game.js` keeps the look and photos between pages.
- **Upload closet:** mirror the reference layout. Left `Upload.exe` window with options, right `Preview` well with "Drag & Drop or Click", `.px-progress` while extracting, status bar `3 / 10 photos · 12 items found`.
- **Outfit builder (60s):** the screen where each player builds their outfit for the round's theme. No star rating, settings, or colorway here; voting happens later in the fashion show.
  - Main window title is the theme, e.g. `THEME: Y2K Pop Star`.
  - Left column: `Closet.exe` window with `.px-tabs` (Tops / Bottoms / Dresses / Acc) and a `.px-slot` grid, then `Upload.exe` (photo dropzone, up to 10 photos) underneath.
  - Right: the theme window, whose big `.px-well` shows your avatar (64×128 canvas, whole-number scale) being dressed live as you click closet items, plus a `.px-btn--wide` `LOCK IN OUTFIT`. This well is not an upload area; uploads only happen in `Upload.exe`.
  - Timer: 60s countdown to a fixed end time (`.px-progress` + status bar `1:00`), red in the last 10s. At 0:00 the outfit auto-saves and everyone moves to the runway. If every player locks in early, everyone moves to the runway right away.
  - Top: `.px-progress` timer.
  - Status bar shows the time left and your coin count.
- **Runway / voting (`runway.html`):** `Runway.exe · THEME: …` window. Players walk out one at a time (stepped walk-in plus a quick turn) on a black stage well with `Look 2 / 3`, a name tag, and the outfit caption. A 10-second `.px-progress` timer (red in the last 3s) and a row of five `★` buttons (selected = navy) let everyone except the player on stage vote 1–5. Status bar: message · `1 / 2 voted` · `0:07`. Each player gets the full 10 seconds. In a solo round you rate your own look. A pressed star fills that many stars in navy, and the note confirms `Vote saved ✓`.
- **Podium:** `Results.exe` window: silver (left), gold (center, tallest), bronze (right) blocks with bevels in gold `#e8c547`, silver `#d6d9e0`, bronze `#d28c4a`, each with the avatar in its outfit, name tag, and `★ 12 stars`. Ties share a place and medal. Full ranking list below, then `Back to lobby`.
- **Mascot / host bubble:** place `.px-bubble` inside the stage `.px-well` (absolute, bottom-right) so it never floats over window chrome.
- **Marketplace:** `Marketplace.exe` with `.px-slot` items, prices in the status bar, and a `Preview` well that shows your avatar trying on the selected item.

## Do / Don't

- Do: classic OS jokes in the copy (`Pixel.exe`, `Closet.exe`, `File(F)`, Recycle Bin renamed as a pun), `_ □ ×` controls, status bar messages like `Ready`.
- Don't: rounded cards, pastel gradients, colored accent buttons, icon fonts (Heroicons/Lucide), 1px modern hairline borders, any font besides Pixelify Sans / Google Sans.
- Don't copy the reference site's anime character or illustrations. If you want a mascot, design an original pixel one.

## Checklist before finishing a UI change

- [ ] Screen uses the full-screen layout: one centered `.px-window--main` with child windows inside, and no page scroll on desktop.
- [ ] Every raised/sunken surface uses a `--bevel-*` token, with no ad-hoc borders.
- [ ] Selected states are navy fill with white text.
- [ ] No `border-radius` (except `.px-bubble`), blur, or soft shadows.
- [ ] Images/canvases are pixelated at integer scales.
- [ ] Upload areas open the file picker from a click anywhere in the box, and accept dropped images.
- [ ] Tabs actually switch: clicking one raises it and shows only that category's panel.
- [ ] Buttons have `:active` pressed and `:focus-visible` (dotted outline) states.
- [ ] Animations use `steps()` and turn off under `prefers-reduced-motion`.
