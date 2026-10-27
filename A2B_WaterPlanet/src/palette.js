/**
 * The palette on the left: a picture of each element, rendered once from the real models, and dragging a new
 * element out of it onto the planet.
 */

const THUMBNAIL_WIDTH = 160; // Size of each picture, pixels, rendered at twice this for sharp screens
const THUMBNAIL_HEIGHT = 125;
const THUMBNAIL_ICE_SIZE = 0.25; // The floe in its picture, radians, separate from ICE_SIZE so the picture stays
const THUMBNAIL_ICE_THICKNESS = 15; // World units, separate from the Ice thickness slider for the same reason

/**
 * Renders the picture of each element onto its palette button.
 */
function makeThumbnails() {
    const ice = makeIceGeometry(makeIceShape(), THUMBNAIL_ICE_SIZE, THUMBNAIL_ICE_THICKNESS);

    renderThumbnail("ice", 125, () => {
        rotateX(-PI / 3); // Seen from above at a slant
        translate(0, PLANET_RADIUS, 0); // The floe is built on the planet's north pole, back to the middle
        model(ice);
    });
    freeGeometry(ice);

    const tornado = makeTornado({ longitude: 0, fromNorth: 0 });

    renderThumbnail("tornado", 90, () => {
        rotateX(-0.2);
        translate(0, TORNADO_HEIGHT / 2, 0); // The bottom of the funnel, so its middle is in the middle of the picture
        drawFunnel(tornado);

        const bottom = tornadoSway(tornado, 0);

        translate(bottom.x, 0, bottom.z);
        drawWithoutDepth(() => {
            drawCrown(tornado);
        });
    });

    const school = makeFishSchool({ longitude: 0, fromNorth: 0 });

    renderThumbnail("fish", FISH_SIZE * 1.9, () => {
        rotateX(-HALF_PI); // Side view
        translate(0, fishOrbitRadius(), 0); // The school to the middle

        // Twice: the first draw marks the bodies' depth, so the second covers only their near side, without stripes,
        // and the fins add up to a clearer picture. Clear, not coloured by water.
        drawFishGroup(school, 0);
        drawFishGroup(school, 0);
    });
}

/**
 * Renders one picture into a framebuffer and puts it on the palette button of that element.
 * A framebuffer shares the canvas's WebGL context, so the same drawing code and meshes work in it.
 * @param {"ice"|"tornado"|"fish"} type - Which button, its picture has the id type-thumbnail
 * @param {number} halfWidth - World units from the middle of the picture to its side
 * @param {Function} drawModel - Draws the model round the middle of the picture
 */
function renderThumbnail(type, halfWidth, drawModel) {
    const buffer = createFramebuffer({ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT, density: 2, antialias: true });
    const halfHeight = (halfWidth * THUMBNAIL_HEIGHT) / THUMBNAIL_WIDTH;

    buffer.draw(() => {
        clear();
        noStroke();
        ortho(-halfWidth, halfWidth, -halfHeight, halfHeight, 0, 1000); // Flat, no perspective
        drawModel();
    });
    document.getElementById(`${type}-thumbnail`).src = buffer.get().canvas.toDataURL();
    buffer.remove();
}

/**
 * Pressing a palette button makes a new element of its type and starts dragging it, with its sound.
 */
function setupPalette() {
    for (const button of document.querySelectorAll(".element-tool")) {
        button.addEventListener("pointerdown", (event) => {
            if (event.button !== 0 || dragState || event.isPrimary === false) {
                return;
            }

            event.preventDefault();
            updatePointer(event);

            const element = makeElement(button.dataset.element, { longitude: 0, fromNorth: HALF_PI });

            startDrag(element, true, event, button);
            playSound(element.type); // After the drag starts, so a sound problem can't stop the drag
        });
    }
}
