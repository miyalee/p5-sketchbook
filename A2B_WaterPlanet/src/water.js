/**
 * The water planet and the core inside it. Both are balls of radius 1 that the water shader moves and colours on the
 * graphics card, every point and every pixel, after A2A-strands-prototype.js.
 */

// Planet
const PLANET_RADIUS = 340; // Size of the planet, world units
const DETAIL_X = 200; // Segments around the planet, count, more = smoother, cheap as the graphics card moves them
const DETAIL_Y = 134; // Segments from pole to pole, count
const DEEP_COLOR = "#3e96c9"; // Water blue, in the dips
const SHALLOW_COLOR = "#6FD3F2"; // Aqua, in the middle
const CREST_COLOR = "#cdf3fd"; // Foam white, on the peaks
const PLANET_ALPHA = 0.91; // Opacity, 0 to 1

// Core, a smaller water ball inside, same bumps in deeper blues
const CORE_DEEP_COLOR = "#062A55"; // Navy, in the dips
const CORE_SHALLOW_COLOR = "#0B3C73"; // Deep blue, in the middle
const CORE_CREST_COLOR = "#3C7DBF"; // Lighter blue, on the peaks
const CORE_ALPHA = 0.7; // Opacity, 0 to 1
const CORE_DETAIL_X = 40; // Segments around the core, count
const CORE_DETAIL_Y = 28; // Segments from pole to pole, count

// Bumps and colours of both balls
const BUMP_HEIGHT = 0.021; // How far the surface moves in and out, 0.021 = ±2.1% of the radius
const BUMP_OCTAVES = 2; // Layers of noise in the bumps, few so the outline of the planet stays smooth
const COLOR_OCTAVES = 3; // Layers of noise in the colour, more = finer detail, past 3 it looks like clouds
const DEEP_NOISE = 0.19; // Noise at and below which the colour is the deep colour
const CREST_NOISE = 0.93; // Noise at and above which the colour is the crest colour, higher = less foam
const MIDDLE_LEVEL = 0.6; // Where the colour reaches the middle colour, 0 to 1, 0 = deepest dip, 1 = highest peak

let planet; // Outer water ball
let core; // Inner water ball
let waterShader; // Moves and colours both balls, see waterSurface()
let flowTime = 0; // How far the water has flowed, noise units, see updateWater()

/**
 * Builds the water shader, the planet and the core.
 */
function makeWater() {
    waterShader = buildColorShader(waterSurface);
    planet = makeWaterBall(DETAIL_X, DETAIL_Y, [DEEP_COLOR, SHALLOW_COLOR, CREST_COLOR], PLANET_ALPHA);
    core = makeWaterBall(
        CORE_DETAIL_X,
        CORE_DETAIL_Y,
        [CORE_DEEP_COLOR, CORE_SHALLOW_COLOR, CORE_CREST_COLOR],
        CORE_ALPHA,
    );
}

/**
 * Builds a ball of radius 1 as a grid of points. The water shader moves and colours them when it is drawn.
 * @param {number} detailX - Segments around the ball, count
 * @param {number} detailY - Segments from pole to pole, count
 * @param {string[]} colorNames - Hex colours for the dips, the middle and the peaks
 * @param {number} alpha - Opacity, 0 to 1
 * @returns {{geometry: p5.Geometry, colors: number[][], alpha: number}}
 *   The mesh, the three colours as [r, g, b] (0 to 1), and the opacity
 */
function makeWaterBall(detailX, detailY, colorNames, alpha) {
    const geometry = new p5.Geometry(detailX, detailY);

    // Row by row from the south pole to the north pole, this order makes the triangles face outwards
    for (let row = 0; row <= detailY; row++) {
        const fromNorth = map(row, 0, detailY, PI, 0);

        for (let column = 0; column <= detailX; column++) {
            const longitude = map(column, 0, detailX, 0, TWO_PI);

            geometry.vertices.push(sphereDirection(longitude, fromNorth));
        }
    }

    geometry.computeFaces(); // Joins the grid into triangles

    return {
        geometry: geometry,
        colors: colorNames.map(toRGB),
        alpha: alpha,
    };
}

/**
 * Lets the water flow on, once a frame before anything uses it.
 */
function updateWater() {
    flowTime += (params.flowSpeed * min(deltaTime, 50)) / 1000;
}

/**
 * The water shader. A p5.strands shader: written in JavaScript, run on the graphics card for every point and every
 * pixel of a water ball of radius 1. The bumps move the points in and out, and the colour is worked out again for
 * every pixel, so it stays sharp up close instead of blurring between the points.
 * The function is turned into shader code once, so it reads the constants once and gets what changes as uniforms.
 */
function waterSurface() {
    const flowTime = uniformFloat(); // The flowTime above, set every frame in drawWater()
    const noiseSize = uniformFloat(); // Noise units across the radius of the ball
    const deepColor = uniformVec3();
    const shallowColor = uniformVec3();
    const crestColor = uniformVec3();
    const opacity = uniformFloat();
    let direction = sharedVec3(); // From the centre to the point, filled in between the points for every pixel

    // Each point moved in or out by the noise there, which flows over time
    objectInputs.begin();
    const flow = [flowTime, -flowTime, flowTime * 0.5];
    noiseDetail(BUMP_OCTAVES, 0.5);
    const bump = noise(objectInputs.position * noiseSize + flow);
    direction = objectInputs.position;
    objectInputs.position = objectInputs.position * (1 + (bump - 0.5) * 2 * BUMP_HEIGHT);
    objectInputs.end();

    // Each pixel coloured by the noise right there, deep in the dips, the middle colour, then foam on the peaks
    finalColor.begin();
    noiseDetail(COLOR_OCTAVES, 0.5);

    const wave = noise(normalize(direction) * noiseSize + flow);
    const level = clamp((wave - DEEP_NOISE) / (CREST_NOISE - DEEP_NOISE), 0, 1); // 0 = deep colour, 1 = crest colour
    const lowColor = mix(deepColor, shallowColor, min(level / MIDDLE_LEVEL, 1));
    const waterColor = mix(lowColor, crestColor, max((level - MIDDLE_LEVEL) / (1 - MIDDLE_LEVEL), 0));
    finalColor.set([waterColor.x, waterColor.y, waterColor.z, opacity]);
    finalColor.end();
}

/**
 * Draws the far or the near half of a water ball with the water shader.
 * @param {Object} ball - planet or core
 * @param {number} ballRadius - Average radius, world units
 * @param {"far"|"near"} half - Which half to draw, see drawHalf()
 */
function drawWater(ball, ballRadius, half) {
    const [deepRGB, shallowRGB, crestRGB] = ball.colors;

    push();
    shader(waterShader);
    waterShader.setUniform("flowTime", flowTime);
    waterShader.setUniform("noiseSize", ballRadius * params.noiseScale);
    waterShader.setUniform("deepColor", deepRGB);
    waterShader.setUniform("shallowColor", shallowRGB);
    waterShader.setUniform("crestColor", crestRGB);
    waterShader.setUniform("opacity", ball.alpha);
    scale(ballRadius); // The ball is built with radius 1
    drawHalf(ball.geometry, half);
    pop();
}
