/**
 * A2B — Water Planet
 * Concept: A big 3D planet made of water, with a bumpy surface that flows over time and a water core inside.
 * Ice floes, tornadoes and schools of fish are dragged onto it from the palette on the left.
 * Inspiration: Generative Landscape – Lonely Planets and Fractional Noise Mountains
 *
 * setup() builds everything once, draw() draws each frame in an order that lets see-through layers show each other.
 * The parts are in src/, see README.md.
 */

// View
const VIEW_SIZE = 1300; // World units that fit across the shorter side of the window
const DRAG_SPEED = 1; // Mouse drag sensitivity, multiplier, 1 = default
const ZOOM_SPEED = 0.2; // Mouse wheel sensitivity, multiplier, 1 = default
const PLANET_SPIN = 0.1; // Self-rotation speed, radians per second

let sceneRenderer; // The WebGL canvas
let planetAngle = 0; // How far the planet has spun round, radians

function setup() {
    sceneRenderer = createCanvas(windowWidth, windowHeight, WEBGL);

    // The planet starts with water only, elements are added from the palette
    makeWater();
    makeTornadoParts();
    makeFishParts();

    makeMusic();
    makePanel();
    makeThumbnails();
    setupPalette();
    setupInteraction();
}

function draw() {
    const frameStart = performance.now();

    background(255);
    noStroke();

    if (!isUsingPanel && !dragState && !pointerOverInterface()) {
        orbitControl(DRAG_SPEED, DRAG_SPEED, ZOOM_SPEED);
    }

    // Fit the view to the window, then spin everything together, but not while something is being dragged
    scale(min(width, height) / VIEW_SIZE);
    if (!dragState) {
        planetAngle += (min(deltaTime, 50) / 1000) * PLANET_SPIN;
    }
    rotateY(planetAngle);

    // Let the water flow on, then follow the pointer through the camera and spin just set
    updateWater();
    updateInteraction();

    // What to draw this frame, a new element being dropped included
    const tornadoList = elementsToDraw("tornado");
    const floeList = elementsToDraw("ice");
    const schoolList = elementsToDraw("fish");

    for (const school of schoolList) {
        updateFishSchool(school);
    }

    // See-through layers go from the back to the front, so each one shows what is behind it.
    // Far half of the planet, then the core inside it.
    drawWater(planet, PLANET_RADIUS, "far");
    drawWater(core, params.coreRadius, "far");
    drawWater(core, params.coreRadius, "near");

    // On the surface, before the near side of the planet, so the ones round the back show through the water
    for (const tornado of tornadoList) {
        drawTornado(tornado);
    }
    for (const floe of floeList) {
        drawIceFloe(floe);
    }

    // Fish in the water, after everything they can swim behind, since they don't mark what they cover
    for (const school of schoolList) {
        drawFishSchool(school, false);
    }

    // Near side of the planet, over everything inside, marking no depth so the glow below can be drawn behind it
    drawWithoutDepth(() => {
        drawWater(planet, PLANET_RADIUS, "near");
    });

    // A glowing copy of each school over the water, and the outline round the selected or hovered element
    for (const school of schoolList) {
        drawFishSchool(school, true);
    }
    drawHighlight();

    // The near side of the planet again, marking depth without colour, so the splash is hidden behind the planet
    // and under the waves. After the glow and the outline, which are inside the water and must stay seen.
    drawingContext.colorMask(false, false, false, false);
    drawWater(planet, PLANET_RADIUS, "near");
    drawingContext.colorMask(true, true, true, true);

    // Splash round the bottom of the tornadoes, over the water so it stays white
    drawWithoutDepth(() => {
        for (const tornado of tornadoList) {
            drawSplash(tornado);
        }
    });

    updateReadouts(frameStart);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
