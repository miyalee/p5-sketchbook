# Cats in the Dark

**A1E** · Interactive Media, UTS · 15–18 September 2026

Twenty cats asleep in a dark room. Speak, and one by one their eyes open. Stop, and one by
one they go back to sleep.

![Cats in the Dark](media/version2.png)

## Concept

A room you can wake up by being in it. The piece listens through the microphone, and the
longer you keep talking the more of the room notices you — eyes opening in a slow, uneven
spread across the six huddles of cats until the whole dark floor is looking back.

The important design decision is that **duration wakes the cats, not volume.** A shout does
not wake them all at once; it just starts the count. The room responds to sustained
presence, which makes the interaction feel less like triggering a switch and more like
being noticed by something.

## Inspiration

Inspired by the **Audio-Sensitive Animation** example from class.

## How it works

**One number runs the whole room.** `awakeRate` is a single float between 0 and 1 meaning
*what fraction of cats are awake*. Each frame:

```js
level > WAKE_LEVEL ? awakeRate += WAKE_SPEED : awakeRate -= SLEEP_SPEED
```

Every cat is assigned a fixed `wakeupOrder = random()` at startup, and `isAwake(cat)` is
just `cat.wakeupOrder < awakeRate`. Because the thresholds are random but fixed, the cats
always wake in the same scattered order rather than in rows — and they fall asleep in exact
reverse.

| Constant | Value | Meaning |
| --- | --- | --- |
| `WAKE_LEVEL` | `0.04` | Mic level above which waking starts |
| `WAKE_SPEED` | `0.01` | ≈1 cat per 0.06 s of continuous sound |
| `SLEEP_SPEED` | `0.005` | Falling asleep takes twice as long as waking |

**Audio.** p5.sound's microphone path does not work under p5 2.x, so the sketch goes
straight to the Web Audio API: `getUserMedia` → `AnalyserNode` (`fftSize` 1024) → RMS over
the time-domain samples in `micLevel()`. A **Listening / Stopped** button in the top-right
lets you release the mic.

## ⚠️ Cat placement — read before editing `CAT_SPOTS`

The cats are sorted by `x` and drawn left to right, so **each cat overlaps the one to its
left.** The sprite puts the head in the top-left corner, which means a right-hand neighbour
only ever covers its neighbour's *tail* — never its face.

Break that relationship by moving coordinates around and you get cats with half an eye
occluded. It is very hard to spot by eye; it was originally found by scripting a
pixel-mask check over every overlapping pair. If you change `CAT_SPOTS`, verify the eyes
are still clear.

## Versions

| Version 1 — asleep | Version 2 — woken |
| --- | --- |
| ![Version 1](media/version1.png) | ![Version 2](media/version2.png) |
| The resting state. `awakeRate` at 0, the room silent. | Mid-wake, roughly half the room. Yellow eye reflections are the only light in the scene. |

## Design evolution

The piece went through several passes before landing here:

1. Cats drawn in code, three states (asleep / head up / startled), green glowing eyes.
2. Hand-drawn code cats replaced with pixel sprites — the drawn ones looked wrong.
3. Tried four-frame sprite animation; it read as jittery, reverted to two static sprites.
4. Added tabby cats for variety; their lighter fur pulled focus in the dark scene, so they
   were cut. Black cats only.
5. Three states simplified down to two — asleep and awake.

## Demo

▶ [`media/demo.mp4`](media/demo.mp4) — speaking, the room waking, then settling (8 s, with sound)

## Run it

**Must be served over HTTP** — `getUserMedia` will not run from a `file://` URL:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` and allow microphone access.

## Built with

p5.js 2.x (`js/p5.js`) for rendering, Web Audio API directly for the microphone.
Sprites in `assets/` (`cat-sleep.png`, `cat-open-eyes.png`). Background `#1E222C`.
