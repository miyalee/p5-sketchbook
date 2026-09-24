# Interactive Media — A1 Sketch Series

Five p5.js sketches made for **Interactive Media** at **UTS**, August–September 2026.
Each one takes a single interaction — a reload, a click, a tap, a drag, a voice — and
builds a small world that responds to only that.

### ▶ [Run them live — miyalee.github.io/p5-sketchbook](https://miyalee.github.io/p5-sketchbook/)

No clone, no install. Every title below opens the running sketch; each **source** link goes
to that project's folder and its README — concept, inspiration, and how the code works.

---

## The works

| | |
| --- | --- |
| <img src="A1A_WindowView/media/version1.png" width="380"> | ### [A1A — Window View](https://miyalee.github.io/p5-sketchbook/A1A_WindowView/)<br>**6–21 Aug 2026** · *reload* · [source](A1A_WindowView/)<br><br>A pale sky seen through a window frame, drawn only from lines and ellipses. `noLoop()` freezes it after one pass, so the variation lives in the reload — every refresh scatters a new sky. |
| <img src="A1B_Diamond/media/version1.png" width="380"> | ### [A1B — Diamond](https://miyalee.github.io/p5-sketchbook/A1B_Diamond/)<br>**22 Aug – 3 Sep 2026** · *click* · [source](A1B_Diamond/)<br><br>Nineteen rows of small diamonds resolve into one large diamond. Click and light ripples out through the tiles, each flashing as the wave reaches it — the whole stone catching the light the way a cut gem does when it turns. |
| <img src="A1C_Communication/media/version2.png" width="380"> | ### [A1C — Communication](https://miyalee.github.io/p5-sketchbook/A1C_Communication/)<br>**2–4 Sep 2026** · *tap left / tap right* · [source](A1C_Communication/)<br><br>A phone with no keyboard. Tap the left half and someone speaks; tap the right half and you answer. Neither of you chooses the words — it is the easy back-and-forth of a chat that never needed to mean anything. |
| <img src="A1D_StrokeBlooming/media/version1.png" width="380"> | ### [A1D — Stroke Blooming](https://miyalee.github.io/p5-sketchbook/A1D_StrokeBlooming/)<br>**6–11 Sep 2026** · *drag* · [source](A1D_StrokeBlooming/)<br><br>A drawing tool that won't let you keep a line. Flowers open along the path you trace, hold for three seconds, then fade — the Chinese idiom 妙笔生花, "a wondrous brush grows flowers", taken at its word. |
| <img src="A1E_CatsInTheDark/media/version2.png" width="380"> | ### [A1E — Cats in the Dark](https://miyalee.github.io/p5-sketchbook/A1E_CatsInTheDark/)<br>**15–18 Sep 2026** · *microphone* · [source](A1E_CatsInTheDark/)<br><br>Twenty cats asleep in a dark room. Speak and their eyes open one by one, like little lasers coming on across the floor. Duration wakes them, not volume — the room responds to sustained presence, not to a shout. |

---

## Running them

Easiest is the [live site](https://miyalee.github.io/p5-sketchbook/) — nothing to install.

To run locally, serve the repo from its root:

```bash
npx http-server -p 8000
```

Then open <http://localhost:8000> and pick a project.

## Built with

[p5.js 2.x](https://p5js.org/), vendored into each project's `js/` folder so the sketches
run offline with no install step. A1D drops to raw Canvas 2D for its petal gradients;
A1E uses the Web Audio API directly, since p5.sound's microphone path is broken under p5 2.x.

No build tools, no dependencies, no package manager.

## Layout

```
A1X_ProjectName/
├── index.html      entry point
├── sketch.js       the work
├── css/style.css
├── js/             vendored p5.js (+ addons where used)
├── assets/         sprites, where the piece needs them
├── media/          version1.png, version2.png, demo.mp4
└── README.md       concept, inspiration, how it works
```

Each piece ships **two versions** — a colour, palette or content variant — documented side
by side in its README and switchable with a single constant at the top of `sketch.js`.
