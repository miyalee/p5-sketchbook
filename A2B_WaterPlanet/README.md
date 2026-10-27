# A2B — Water Planet

An interactive version of A2A. The planet starts with water only, and ice floes, tornadoes and schools of fish are dragged onto it.

## Interaction

- Drag an ice floe, a tornado or a school of fish from the palette on the left onto the planet. Off the planet a picture follows the pointer, over it the real model shows where it will land.
- Release over the planet to place it. Release outside the planet or press Escape to cancel.
- A tornado is a funnel of open spiral strokes of wind with a few white wisps round it. It stands on the water at its average height, like the ice, with a crown of white water rising and falling round its bottom in three layers, the lower ones flatter, shorter and whiter.
- A school of fish is ten see-through fish, after `fish.png`, with 3D bodies that glow at the edges, glowing blue fins and white tails that fade out. They swim slowly sideways round the core along its curve, tinted and dimmed by the water above them.
- Click a placed element to select it. Its outline turns gold. Drag it to move it along the surface.
- While an element is selected, scroll to resize it (0.4× to 2.5×). Press Backspace or Delete to remove it. Click the water or press Escape to deselect and get camera zoom back.
- Drag empty water to orbit the camera and scroll to zoom. The planet pauses its spin while an element is dragged.
- Sound effects: a clink of ice when picking up an ice floe, a gust of wind for a tornado and bubbling water for a fish school. Placing an element is silent. They are short clips cut from the recordings in `assets`, saved in `assets/sfx`. The button at the top left plays and pauses the background music.
- The panel at the top right changes the planet (noise scale, flow speed, core size), how sharply the tornadoes open up, the ice thickness, the colour of the fish, and the volumes.

## Files

`sketch.js` has `setup()`, which builds everything once, and `draw()`, which draws each frame in an order that lets the see-through layers show each other. The parts are in `src/`:

| File | What it does |
| --- | --- |
| `settings.js` | The settings the panel changes, and the panel |
| `space.js` | Spots on the planet, rays hitting balls and triangles, drawing only one half of a ball, drawing without depth, colours |
| `water.js` | The planet and the core, drawn by a p5.strands shader after `A2A-strands-prototype.js`. It moves their points on the graphics card and works out the colour of every pixel, so the foam stays sharp up close |
| `tornado.js` | Tornadoes: the spiral strokes, the crown splash, clicking on them and their outline |
| `ice.js` | Ice floes: their shape and mesh, clicking on them and their outline |
| `fish.js` | Fish schools: the fin picture, the 3D body, the two shaders, swimming, clicking on them and their outline |
| `elements.js` | The lists of placed elements, and making, deleting, resizing, picking and outlining any of them |
| `interaction.js` | The pointer and the keyboard: dragging, selecting and the hint at the bottom |
| `palette.js` | The palette's pictures, rendered once from the real models, and dragging new elements out of it |
| `sounds.js` | The background music and the sound effects |

Picking turns the pointer into a ray through the current camera and planet rotation, so placing also works after orbiting or zooming. Elements are stored as spots on the planet (longitude and angle from the north pole), so they turn with it.

## Getting Started

Open `index.html` in your web browser and start editing `sketch.js` or a file in `src/`.

## Running Locally

For projects with media files, use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using VS Code Live Server extension
# Right-click index.html -> "Open with Live Server"
```

## Resources

- [p5.js 2.0](https://beta.p5js.org/)
- [p5.js Reference](https://p5js.org/reference/)
