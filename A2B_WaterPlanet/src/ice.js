/**
 * Ice floes: flat broken slabs of ice bent round the planet, white in the middle fading to blue at the edges.
 * Each floe is built at the north pole on a flat map round it, see sphereVertex(), and moveToSpot() puts it in place.
 */

const ICE_SIZE = 0.2; // Middle of a floe to a corner, radians, 0.2 covers about 0.8% of the planet surface
const ICE_CORNERS_MIN = 7; // Number range of corners on each floe, count
const ICE_CORNERS_MAX = 10; // Number range of corners on each floe, count
const ICE_UNEVEN = 0.25; // How uneven the corners are, fraction of the ice size, 0.25 = ±25%
const ICE_GRID_STEPS = 6; // Grids of the ice top, count per side
const ICE_TOP_COLOR = "#F2FBFF"; // Snow white, in the middle
const ICE_EDGE_COLOR = "#A8DDF2"; // Pale blue, at the edge
const ICE_SIDE_COLOR = "#6DB8DE"; // Ice blue, on the sides
const ICE_ALPHA = 0.8; // Opacity, 0 to 1

/**
 * Builds the data and the mesh for one floe.
 * @param {{longitude: number, fromNorth: number}} spot - Where its middle is on the planet, radians
 * @returns {Object} The floe
 */
function makeIceFloe(spot) {
    const floe = {
        type: "ice",
        spot: spot,
        scale: 1, // Size, changed by scrolling when selected
        shape: makeIceShape(),
        geometry: null,
    };

    rebuildFloe(floe);

    return floe;
}

/**
 * Makes a random broken outline for one floe. The size is applied later, so it can change without a new shape.
 * @returns {p5.Vector[]} Corners in order round the floe, about 1 from the middle
 */
function makeIceShape() {
    const cornerCount = floor(random(ICE_CORNERS_MIN, ICE_CORNERS_MAX + 1));
    const corners = [];

    for (let k = 0; k < cornerCount; k++) {
        const angle = ((k + random(-0.3, 0.3)) / cornerCount) * TWO_PI; // Corners not evenly spaced
        const distance = random(1 - ICE_UNEVEN, 1 + ICE_UNEVEN);

        corners.push(createVector(cos(angle), sin(angle)).mult(distance));
    }

    return corners;
}

/**
 * Builds the mesh of a floe from its shape, its size and the thickness in the panel.
 * Used when it is made, resized, or the thickness changes.
 * @param {Object} floe - A floe from makeIceFloe()
 */
function rebuildFloe(floe) {
    if (floe.geometry) {
        freeGeometry(floe.geometry);
    }
    floe.geometry = makeIceGeometry(floe.shape, ICE_SIZE * floe.scale, params.iceThickness);
}

/**
 * Rebuilds every floe with the thickness from the panel. Spots and shapes stay the same.
 */
function remakeFloes() {
    for (const floe of elementsToDraw("ice")) {
        rebuildFloe(floe);
    }
}

/**
 * Builds one floe at the north pole, moveToSpot() turns it into place when drawn.
 * @param {p5.Vector[]} shape - Corners from makeIceShape()
 * @param {number} size - Distance from the middle to a corner of 1 in the shape, radians
 * @param {number} thickness - World units
 * @returns {p5.Geometry} The floe mesh, with colours already on it
 */
function makeIceGeometry(shape, size, thickness) {
    const topColor = color(ICE_TOP_COLOR);
    const edgeColor = color(ICE_EDGE_COLOR);
    const sideColor = color(ICE_SIDE_COLOR);

    // Half above the surface of the planet, half below
    const topRadius = PLANET_RADIUS + thickness / 2;
    const bottomRadius = PLANET_RADIUS - thickness / 2;

    topColor.setAlpha(255 * ICE_ALPHA);
    edgeColor.setAlpha(255 * ICE_ALPHA);
    sideColor.setAlpha(255 * ICE_ALPHA);

    // Corners with size
    const corners = shape.map((corner) => p5.Vector.mult(corner, size));

    return buildGeometry(() => {
        beginShape(TRIANGLES);

        for (let k = 0; k < corners.length; k++) {
            const cornerA = corners[k];
            const cornerB = corners[(k + 1) % corners.length]; // The last corner joins back to the first

            // Top: a slice from the middle out to the edge cornerA–cornerB, cut into a grid
            for (let ring = 0; ring < ICE_GRID_STEPS; ring++) {
                const inner = ring / ICE_GRID_STEPS; // How far out from the middle, 0 to 1
                const outer = (ring + 1) / ICE_GRID_STEPS;
                const innerColor = lerpColor(topColor, edgeColor, inner);
                const outerColor = lerpColor(topColor, edgeColor, outer);

                for (let step = 0; step < ICE_GRID_STEPS; step++) {
                    const edgeStart = p5.Vector.lerp(cornerA, cornerB, step / ICE_GRID_STEPS);
                    const edgeEnd = p5.Vector.lerp(cornerA, cornerB, (step + 1) / ICE_GRID_STEPS);

                    // Two triangles make one grid cell, white in the middle fading to blue at the edge
                    fill(innerColor);
                    sphereVertex(p5.Vector.mult(edgeStart, inner), topRadius);
                    fill(outerColor);
                    sphereVertex(p5.Vector.mult(edgeStart, outer), topRadius);
                    sphereVertex(p5.Vector.mult(edgeEnd, outer), topRadius);

                    fill(innerColor);
                    sphereVertex(p5.Vector.mult(edgeStart, inner), topRadius);
                    fill(outerColor);
                    sphereVertex(p5.Vector.mult(edgeEnd, outer), topRadius);
                    fill(innerColor);
                    sphereVertex(p5.Vector.mult(edgeEnd, inner), topRadius);
                }
            }

            // Side wall under the edge cornerA–cornerB, so the ice has some thickness
            fill(sideColor);
            for (let step = 0; step < ICE_GRID_STEPS; step++) {
                const edgeStart = p5.Vector.lerp(cornerA, cornerB, step / ICE_GRID_STEPS);
                const edgeEnd = p5.Vector.lerp(cornerA, cornerB, (step + 1) / ICE_GRID_STEPS);

                sphereVertex(edgeStart, topRadius);
                sphereVertex(edgeStart, bottomRadius);
                sphereVertex(edgeEnd, bottomRadius);

                sphereVertex(edgeStart, topRadius);
                sphereVertex(edgeEnd, bottomRadius);
                sphereVertex(edgeEnd, topRadius);
            }
        }

        endShape();
    });
}

/**
 * Draws one floe in its place on the planet.
 * @param {Object} floe - A floe from makeIceFloe()
 */
function drawIceFloe(floe) {
    push();
    moveToSpot(floe.spot);
    model(floe.geometry);
    pop();
}

/**
 * How far along a ray it hits a floe, tested against every triangle of the floe after a quick test against a ball
 * round it.
 * @param {{origin: p5.Vector, direction: p5.Vector}} ray - In the floe's space, see toSpotSpace()
 * @param {Object} floe - A floe from makeIceFloe()
 * @returns {number|null} Distance along the ray, or null if it misses
 */
function pickIceFloe(ray, floe) {
    const bound = PLANET_RADIUS * ICE_SIZE * floe.scale * (1 + ICE_UNEVEN) + params.iceThickness;

    if (raySphereDistance(ray, createVector(0, -PLANET_RADIUS, 0), bound) === null) {
        return null;
    }

    let closest = Infinity;

    for (const face of floe.geometry.faces) {
        const [a, b, c] = face.map((index) => floe.geometry.vertices[index]);
        const distance = rayTriangleDistance(ray, a, b, c);

        if (distance !== null && distance < closest) {
            closest = distance;
        }
    }

    return closest === Infinity ? null : closest;
}

/**
 * Draws the outline of a floe just above the highest waves, to show it is selected or under the pointer.
 * Called by drawElementOutline() inside the floe's space.
 * @param {Object} floe - A floe from makeIceFloe()
 */
function drawIceOutline(floe) {
    const radius = PLANET_RADIUS * (1 + BUMP_HEIGHT) + params.iceThickness / 2 + 2;

    beginShape();
    for (const corner of floe.shape) {
        sphereVertex(p5.Vector.mult(corner, ICE_SIZE * floe.scale), radius);
    }
    endShape(CLOSE);
}
