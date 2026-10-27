/**
 * Tornadoes: a funnel of open spiral strokes of wind standing on the water, with a crown of splashing water in layers
 * round its bottom. All tornadoes share the same stroke and crown meshes, each one turns and moves them its own way.
 * Sizes are in the same world units as PLANET_RADIUS.
 */

// Funnel
const TORNADO_HEIGHT = 100; // Height of the tornado, world units, the planet is 680 across
const TORNADO_SCALE = 1; // Size of a new tornado, 1 = TORNADO_HEIGHT tall, scrolling changes it when selected
const BOTTOM_RADIUS = 10; // Width of the funnel at the bottom, world units, Finesse in the panel opens it up
const TOP_RADIUS = 40; // Width of the funnel at the top, world units
const TORNADO_SPIN = 1.5; // Self-rotation speed, radians per second
const SWAY_BOTTOM = 24; // Sideways sway at the bottom, world units
const SWAY_TOP = 3; // Sideways sway at the top, world units
const SWAY_SPEED = 0.01; // How fast the funnel sways, noise units per frame

// Strokes of wind the funnel is made of, flat bands winding up round it
const STROKE_COUNT = 20; // Spiral strokes in the funnel, count
const STROKE_TURNS = 6; // How many times the spiral goes round from the bottom to the top, closer at the bottom
const STROKE_LENGTH_MIN = 0.35; // How much of the height one stroke covers, fraction
const STROKE_LENGTH_MAX = 0.6; // How much of the height one stroke covers, fraction
const STROKE_WIDTH_BOTTOM = 3; // Width of a stroke at the bottom, world units
const STROKE_WIDTH_TOP = 11; // Width of a stroke at the top, world units
const STROKE_THICKNESS = 0.3; // Thickness of a stroke, fraction of its width
const STROKE_STEPS = 48; // Pieces along each stroke, count, more = smoother
const STROKE_ALPHA = 0.85; // Opacity in the middle of a stroke, a little less towards its ends
const WISP_COUNT = 3; // Thin white strokes of wind just outside the funnel, count
const WISP_ALPHA = 0.4; // Opacity of the wisps
const TORNADO_TOP_COLOR = "#A9E4F7"; // Light aqua
const TORNADO_BOTTOM_COLOR = DEEP_COLOR; // Water blue
const TORNADO_INNER_COLOR = "#2B5E9E"; // Deep blue, on the inside of the strokes
const TORNADO_FOAM_COLOR = "#FFFFFF"; // White, at the bottom where it meets the splash, and on the strokes' top edge
const TORNADO_FOAM_HEIGHT = 0.3; // How far up the white goes before it is all funnel colour, fraction of the height

// Splash round the bottom, a crown of water in layers, the lower ones flatter, shorter and whiter
const CROWN_POINTS = 10; // Points round each layer, count
const CROWN_RADIUS = 13; // Where the crown leaves the water, world units, just outside the funnel
const CROWN_HEIGHT = 34; // Height of the tallest points of the top layer, world units, low so the funnel stands out
const CROWN_REACH = 30; // How far out the tallest points of the top layer lean, world units
const CROWN_WAVE = 1.4; // How fast the points rise and fall, noise units per second
// Layers from the top one down. height and reach: of the points, fraction of the top layer.
// colors and alphas: colour and opacity on the water, at the dips between the points, and at the points.
// prettier-ignore
const CROWN_LAYERS = [
    { height: 1, reach: 1, colors: ["#FFFFFF", "#F5FBFE", "#D6EEF8"], alphas: [0.94, 0.7, 0.2] },
    { height: 0.45, reach: 0.75, colors: ["#FFFFFF", "#FAFDFF", "#EEF8FC"], alphas: [0.96, 0.8, 0.45] },
    { height: 0.2, reach: 0.6, colors: ["#FFFFFF", "#FFFFFF", "#FFFFFF"], alphas: [1, 0.9, 0.7] },
];

const PICK_RINGS = 10; // Rings round the funnel that clicks are tested against, count

let tornadoStrokes = []; // The strokes of wind every tornado is made of, see makeTornadoStrokes()
let crownGeometry; // The crown of water round the bottom, its points moved every time it is drawn

/**
 * Builds the meshes all tornadoes share.
 */
function makeTornadoParts() {
    tornadoStrokes = makeTornadoStrokes();
    crownGeometry = makeCrownGeometry();
}

/**
 * Builds the data for one tornado.
 * @param {{longitude: number, fromNorth: number}} spot - Where it stands on the planet, radians
 * @returns {Object} The tornado
 */
function makeTornado(spot) {
    return {
        type: "tornado",
        spot: spot,
        scale: TORNADO_SCALE, // Size, changed by scrolling when selected
        turns: tornadoStrokes.map(() => random(TWO_PI)), // Every tornado turns the shared strokes its own way
        swayOffset: random(1000), // Where it reads the sway noise, so each tornado sways differently
    };
}

/**
 * Picks the strokes of wind every tornado is made of: spiral strokes spread from the bottom to the top,
 * and a few thin wisps just outside the funnel.
 * @returns {Object[]} The strokes as { start, end, middle, radius, twist, width, spinMultiplier, isWisp, geometry },
 *   start, end and middle are heights, 0 at the bottom, 1 at the top
 */
function makeTornadoStrokes() {
    const strokes = [];

    for (let k = 0; k < STROKE_COUNT + WISP_COUNT; k++) {
        const isWisp = k >= STROKE_COUNT; // Last, so they are drawn over the strokes
        const middle = isWisp ? random(0.35, 0.85) : (k + 0.5) / STROKE_COUNT;
        const length = isWisp ? random(0.15, 0.25) : random(STROKE_LENGTH_MIN, STROKE_LENGTH_MAX);
        const stroke = {
            start: max(0, middle - length / 2),
            end: min(1, middle + length / 2),
            middle: middle,
            radius: isWisp ? 1.25 : random(0.85, 1.12), // Fraction of the funnel width, wisps a little outside it
            twist: random(0.9, 1.1), // How tightly it winds compared with the others, so they cross
            width: isWisp ? random(0.2, 0.35) : random(0.7, 1.2), // Fraction of the stroke width at its height
            spinMultiplier: 2 - middle, // The bottom spins twice as fast as the top
            isWisp: isWisp,
        };

        stroke.geometry = makeStrokeGeometry(stroke);
        strokes.push(stroke);
    }

    return strokes;
}

/**
 * Rebuilds the strokes with the Finesse from the panel. They keep their heights and widths.
 */
function remakeStrokes() {
    for (const stroke of tornadoStrokes) {
        freeGeometry(stroke.geometry);
        stroke.geometry = makeStrokeGeometry(stroke);
    }
}

/**
 * Builds one stroke of wind, a flat band winding up round the funnel, thin at both ends.
 * The funnel stands at the origin, up is -y.
 * @param {Object} stroke - A stroke from makeTornadoStrokes()
 * @returns {p5.Geometry} The stroke mesh, with colours already on it
 */
function makeStrokeGeometry(stroke) {
    const geometry = new p5.Geometry(4, STROKE_STEPS);
    const bottomColor = color(TORNADO_BOTTOM_COLOR);
    const topColor = color(TORNADO_TOP_COLOR);
    const innerColor = color(TORNADO_INNER_COLOR);
    const foamColor = color(TORNADO_FOAM_COLOR);

    // Row by row along the stroke, each row going round the band
    for (let step = 0; step <= STROKE_STEPS; step++) {
        const along = step / STROKE_STEPS; // 0 at the start of the stroke, 1 at the end
        const heightRatio = lerp(stroke.start, stroke.end, along); // 0 at the bottom of the funnel, 1 at the top
        const angle = spiralAngle(heightRatio) * stroke.twist; // Winds round as it goes up
        const radius = funnelRadius(heightRatio) * stroke.radius;
        const taper = pow(sin(PI * along), 0.6); // Thin at both ends
        const width = lerp(STROKE_WIDTH_BOTTOM, STROKE_WIDTH_TOP, heightRatio) * stroke.width * taper;
        const thickness = width * STROKE_THICKNESS;
        const outwards = createVector(cos(angle), 0, sin(angle));
        const centre = p5.Vector.mult(outwards, radius).add(0, -heightRatio * TORNADO_HEIGHT, 0);

        // Funnel colour at this height, white at the bottom where it meets the splash, wisps all white
        const foam = stroke.isWisp ? 1 : constrain(1 - heightRatio / TORNADO_FOAM_HEIGHT, 0, 1);
        const funnelColor = lerpColor(lerpColor(bottomColor, topColor, heightRatio), foamColor, foam);
        const alpha = (stroke.isWisp ? WISP_ALPHA : STROKE_ALPHA) * lerp(0.6, 1, taper);

        const corners = [
            [createVector(0, -width / 2, 0), lerpColor(funnelColor, foamColor, 0.45)], // Top edge, lit
            [p5.Vector.mult(outwards, thickness / 2), funnelColor], // Outside
            [createVector(0, width / 2, 0), funnelColor], // Bottom edge
            [p5.Vector.mult(outwards, -thickness / 2), lerpColor(funnelColor, innerColor, 0.6)], // Inside, in shade
        ];

        corners.push(corners[0]); // Back to the top edge, closing the band
        for (const [offset, cornerColor] of corners) {
            geometry.vertices.push(p5.Vector.add(centre, offset));
            geometry.vertexColors.push(...toRGB(cornerColor), alpha);
        }
    }

    geometry.computeFaces(); // Joins the rows into triangles

    return geometry;
}

/**
 * Builds the crown of water round the bottom of a tornado, all its layers. drawCrown() moves the points every time.
 * Round each layer, the point on the water, the dip above it and the tip after it are three vertices in a row.
 * @returns {p5.Geometry} The crown mesh, with colours already on it
 */
function makeCrownGeometry() {
    const geometry = new p5.Geometry();

    for (const layer of CROWN_LAYERS) {
        const colors = layer.colors.map(toRGB);
        const first = geometry.vertices.length; // First vertex of this layer

        for (let k = 0; k < CROWN_POINTS; k++) {
            for (let i = 0; i < 3; i++) {
                geometry.vertices.push(createVector());
                geometry.vertexColors.push(...colors[i], layer.alphas[i]);
            }
        }

        // A band from the water up to the dips, and a tip between each two dips
        for (let k = 0; k < CROWN_POINTS; k++) {
            const water = first + 3 * k;
            const dip = water + 1;
            const tip = water + 2;
            const next = first + ((k + 1) % CROWN_POINTS) * 3;

            geometry.faces.push([water, next, next + 1], [water, next + 1, dip], [dip, next + 1, tip]);
        }
    }

    return geometry;
}

/**
 * Draws one tornado standing on the water, at its average height like the ice. The waves rise and fall round it.
 * @param {Object} tornado - A tornado from makeTornado()
 */
function drawTornado(tornado) {
    push();
    moveToSpot(tornado.spot);
    translate(0, -PLANET_RADIUS, 0); // Out to the water, from here -y points to the sky
    scale(tornado.scale); // Grows from its bottom, so it stays on the water
    drawFunnel(tornado);
    pop();
}

/**
 * Draws the strokes of one tornado standing at the origin, up is -y, every stroke spinning and swaying.
 * Also used for the palette picture.
 * @param {Object} tornado - A tornado from makeTornado()
 */
function drawFunnel(tornado) {
    const spinAngle = (millis() / 1000) * TORNADO_SPIN;

    for (let k = 0; k < tornadoStrokes.length; k++) {
        const stroke = tornadoStrokes[k];
        const sway = tornadoSway(tornado, stroke.middle);

        push();
        translate(sway.x, 0, sway.z);
        rotateY(spinAngle * stroke.spinMultiplier + tornado.turns[k]);
        model(stroke.geometry);
        pop();
    }
}

/**
 * Draws the crown of water round the bottom of one tornado on the planet, following the sway of the funnel's bottom.
 * Use inside drawWithoutDepth(), so the see-through layers don't hide each other.
 * @param {Object} tornado - A tornado from makeTornado()
 */
function drawSplash(tornado) {
    const bottom = tornadoSway(tornado, 0);

    push();
    moveToSpot(tornado.spot);
    translate(0, -PLANET_RADIUS, 0);
    scale(tornado.scale);
    translate(bottom.x, 0, bottom.z);
    drawCrown(tornado);
    pop();
}

/**
 * Draws the crown of water at the origin, on the water, up is -y. Also used for the palette picture.
 * Its points rise and fall, each layer turning a little faster than the one above.
 * @param {Object} tornado - A tornado from makeTornado()
 */
function drawCrown(tornado) {
    const time = millis() / 1000 + tornado.swayOffset; // Each tornado at its own time

    for (let l = 0; l < CROWN_LAYERS.length; l++) {
        const layer = CROWN_LAYERS[l];
        const height = CROWN_HEIGHT * layer.height;
        const reach = CROWN_REACH * layer.reach;
        const turn = time * TORNADO_SPIN * (0.4 + 0.15 * l); // Turns slowly with the tornado
        const seed = l * 1000; // Each layer reads a different part of the noise

        for (let k = 0; k < CROWN_POINTS; k++) {
            const step = k + l / CROWN_LAYERS.length; // The points of the layers fall between each other
            const angle = (step / CROWN_POINTS) * TWO_PI + turn;
            const offset = (noise(seed + k * 3.3) - 0.5) * 0.5; // Tips not quite halfway between, so uneven
            const tipAngle = ((step + 0.5 + offset) / CROWN_POINTS) * TWO_PI + turn;
            const dipHeight = height * (0.18 + 0.18 * noise(seed + k * 1.7 + 300, time * CROWN_WAVE * 0.85));
            const dipRadius =
                CROWN_RADIUS + reach * (0.22 + 0.15 * noise(seed + k * 1.7 + 400, time * CROWN_WAVE * 0.7));
            const tipHeight = height * (0.4 + 0.6 * noise(seed + k * 0.9, time * CROWN_WAVE));
            const tipRadius =
                CROWN_RADIUS + reach * (0.45 + 0.55 * noise(seed + k * 0.9 + 50, time * CROWN_WAVE * 0.8));
            const water = (l * CROWN_POINTS + k) * 3;

            crownGeometry.vertices[water].set(cos(angle) * CROWN_RADIUS, 0, sin(angle) * CROWN_RADIUS);
            crownGeometry.vertices[water + 1].set(cos(angle) * dipRadius, -dipHeight, sin(angle) * dipRadius);
            crownGeometry.vertices[water + 2].set(cos(tipAngle) * tipRadius, -tipHeight, sin(tipAngle) * tipRadius);
        }
    }

    crownGeometry.dirtyFlags.vertices = true; // Sends the moved points to the graphics card
    model(crownGeometry);
}

/**
 * How far the funnel has swayed sideways at one height, more at the bottom than the top.
 * @param {Object} tornado - A tornado from makeTornado()
 * @param {number} heightRatio - 0 at the bottom, 1 at the top
 * @returns {p5.Vector} x and z, world units, before the tornado's own scale
 */
function tornadoSway(tornado, heightRatio) {
    const sway = lerp(SWAY_BOTTOM, SWAY_TOP, heightRatio);
    const swayTime = frameCount * SWAY_SPEED;
    const along = heightRatio * 0.6; // Noise units up the funnel, so nearby heights sway together

    return createVector(
        map(noise(along, swayTime, tornado.swayOffset + 10), 0, 1, -sway, sway),
        0,
        map(noise(along, swayTime, tornado.swayOffset + 20), 0, 1, -sway, sway),
    );
}

/**
 * How far round the spiral has gone at one height, turning closer at the bottom, like a twisted tail.
 * @param {number} heightRatio - 0 at the bottom, 1 at the top
 * @returns {number} Radians
 */
function spiralAngle(heightRatio) {
    return pow(heightRatio, 0.6) * STROKE_TURNS * TWO_PI;
}

/**
 * Width of the funnel at one height, it opens up towards the top as sharply as Finesse in the panel says.
 * @param {number} heightRatio - 0 at the bottom, 1 at the top
 * @returns {number} Radius, world units
 */
function funnelRadius(heightRatio) {
    return lerp(BOTTOM_RADIUS, TOP_RADIUS, pow(heightRatio, params.finesse));
}

/**
 * Middle of the funnel at one height, in the space moveToSpot() turns to.
 * @param {Object} tornado - A tornado from makeTornado()
 * @param {number} heightRatio - 0 at the bottom, 1 at the top
 * @returns {p5.Vector} World units
 */
function tornadoCentre(tornado, heightRatio) {
    const sway = tornadoSway(tornado, heightRatio);

    return createVector(
        sway.x * tornado.scale,
        -PLANET_RADIUS - heightRatio * TORNADO_HEIGHT * tornado.scale,
        sway.z * tornado.scale,
    );
}

/**
 * How far along a ray it hits a tornado. Tests rings round the funnel, thick enough to fill the gaps between its
 * strokes, so all of it can be clicked but not the empty space beside it.
 * @param {{origin: p5.Vector, direction: p5.Vector}} ray - In the tornado's space, see toSpotSpace()
 * @param {Object} tornado - A tornado from makeTornado()
 * @returns {number|null} Distance along the ray, or null if it misses
 */
function pickTornado(ray, tornado) {
    const tubeRadius = (TORNADO_HEIGHT / (PICK_RINGS - 1) / 2 + 2) * tornado.scale;
    let closest = Infinity;

    for (let i = 0; i < PICK_RINGS; i++) {
        const heightRatio = i / (PICK_RINGS - 1);
        const centre = tornadoCentre(tornado, heightRatio);
        const radius = funnelRadius(heightRatio) * tornado.scale;
        const bound = radius + tubeRadius;
        let distance = raySphereDistance(ray, centre, bound);

        if (distance === null || distance > closest) {
            continue;
        }

        // Step along the ray using the distance to the ring, a doughnut shape, until it touches
        const limit = distance + bound * 2;
        for (let step = 0; step < 48 && distance < limit && distance < closest; step++) {
            const point = p5.Vector.add(ray.origin, p5.Vector.mult(ray.direction, distance)).sub(centre);
            const gap = Math.hypot(Math.hypot(point.x, point.z) - radius, point.y) - tubeRadius;

            if (gap < 0.7) {
                closest = distance;
                break;
            }
            distance += max(gap, 0.3);
        }
    }

    return closest === Infinity ? null : closest;
}

/**
 * Draws a spiral round the funnel, like its strokes, to show the tornado is selected or under the pointer.
 * Called by drawElementOutline() inside the tornado's space.
 * @param {Object} tornado - A tornado from makeTornado()
 */
function drawTornadoOutline(tornado) {
    const steps = 100;

    beginShape();
    for (let step = 0; step <= steps; step++) {
        const heightRatio = step / steps;
        const centre = tornadoCentre(tornado, heightRatio);
        const angle = spiralAngle(heightRatio);
        const radius = (funnelRadius(heightRatio) + STROKE_WIDTH_TOP / 2) * tornado.scale + 2;

        vertex(centre.x + cos(angle) * radius, centre.y, centre.z + sin(angle) * radius);
    }
    endShape();
}
