# Stroke Blooming

**A1D** · Interactive Media, UTS · 6–11 September 2026

A drawing tool that will not let you keep a line. Drag across the canvas and flowers open
along the path you traced — then, a few seconds later, they fade and the page is blank again.

![Stroke Blooming](media/version1.png)

## Concept

You draw a stroke; the stroke blooms; the bloom dies. Nothing you make here survives, which
turns drawing into something closer to gardening than to mark-making — you tend a thing for
three seconds and then it goes.

The line is never actually rendered. What you see is the *residue* of your gesture: flowers
dropped every 40 px along the path, each one running its own open–hold–fade lifecycle from
the moment it was planted. Draw slowly and you get a dense hedge; draw fast and you get a
sparse trail.

## Inspiration

Inspired by **Living Line 1** and **Reordering Rectangles** — both pieces where a mark has
its own behaviour after you make it, rather than sitting still where you put it.

## How it works

**Spacing, not sampling.** `draw()` checks `dist()` between the cursor and the last planted
flower each frame. A new flower only appears once that distance passes `FLOWER_SPACING`
(40 px). This decouples flower density from frame rate — a fast machine does not produce
more flowers than a slow one, only the path length matters.

**Lifecycle.** Each flower owns its timing in `updateLifecycle()`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `FLOWER_OPEN_SPEED` | `0.012` | Fraction opened per frame — ≈1.4 s to full bloom |
| `FLOWER_HOLD_TIME` | `3000` ms | How long it stays fully open |
| `FLOWER_FADE_TIME` | `1200` ms | Fade to transparent |

Opening is eased with `1 - pow(1 - open, 3)` — slow to start, quick to finish — and the
cherry blossom also rotates a quarter turn as it opens, so the bloom unfurls rather than
just scaling up. Dead flowers are spliced out of the array on a backwards loop.

**Petals.** The blossom petal is a seven-segment bezier path drawn straight onto
`drawingContext` with a linear gradient fill, because p5's `bezierVertex` could not give the
notched petal tip cleanly.

## Versions

| Version 1 — cherry blossom | Version 2 — blue daisy |
| --- | --- |
| ![Version 1](media/version1.png) | ![Version 2](media/version2.png) |
| Five bezier petals, white-to-`#f2a6a6` gradient, rotates as it opens. | Ten flat `#5bb7ba` ellipse petals around a `#ffc329` centre. Subclasses `Flower` and overrides `display()` only. |

Switch with the `flowerVersion` variable at the top of `sketch.js` (`1` or `2`).

## Demo

▶ [`media/demo.mp4`](media/demo.mp4) — drawing, blooming, fading (38 s)

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Click for a single flower, or hold and drag for a trail.

## Built with

p5.js 2.x (`js/p5.min.js`) plus raw Canvas 2D for the petal gradients. Canvas fills the window.
