/**
 * Small tools used all over the sketch: places on the planet, rays hitting things, two drawing helpers and colours.
 * A place on the planet is a spot, { longitude, fromNorth } in radians. Elements are stored as spots, not as screen
 * positions, so they stay in place however the camera moves.
 */

/**
 * Direction from the centre of a ball to a spot on its surface.
 * @param {number} longitude - Round the ball, radians, 0 faces the camera
 * @param {number} fromNorth - Down from the north pole, radians, 0 to PI
 * @returns {p5.Vector} The direction, length 1
 */
function sphereDirection(longitude, fromNorth) {
    return createVector(sin(fromNorth) * sin(longitude), -cos(fromNorth), sin(fromNorth) * cos(longitude));
}

/**
 * The spot a direction points at, the opposite of sphereDirection().
 * @param {p5.Vector} direction - From the planet centre, length 1
 * @returns {{longitude: number, fromNorth: number}} The spot, radians
 */
function directionToSpot(direction) {
    return {
        longitude: atan2(direction.x, direction.z),
        fromNorth: acos(constrain(-direction.y, -1, 1)),
    };
}

/**
 * Turns the coordinate system to a spot on the planet. Things built at the north pole then appear at that spot,
 * standing upright: from there +x points east, -y points out of the planet and +z points south.
 * Use inside push() and pop().
 * @param {{longitude: number, fromNorth: number}} spot - Where to go, radians
 */
function moveToSpot(spot) {
    rotateY(spot.longitude); // Turn round to the spot
    rotateX(-spot.fromNorth); // Tip down from the north pole
}

/**
 * The opposite of moveToSpot(): turns a vector in planet space into the space of an element at a spot.
 * Picking uses it to test a ray against an element built at the north pole.
 * @param {p5.Vector} vector - A position or a direction in planet space
 * @param {{longitude: number, fromNorth: number}} spot - The element's spot
 * @returns {p5.Vector} The same vector in the element's space
 */
function toSpotSpace(vector, spot) {
    // Undo the turn round, then the tip down
    const c = cos(spot.longitude);
    const s = sin(spot.longitude);
    const x = c * vector.x - s * vector.z;
    const z = s * vector.x + c * vector.z;
    const cf = cos(spot.fromNorth);
    const sf = sin(spot.fromNorth);

    return createVector(x, cf * vector.y - sf * z, sf * vector.y + cf * z);
}

/**
 * Adds one vertex at a point of a flat map round the north pole, wrapped onto a ball round the planet centre.
 * The ice floes and the outlines round elements are drawn on this map. Use between beginShape() and endShape().
 * @param {p5.Vector} mapPoint - Point on the flat map, radians from the north pole, +x east, +y south
 * @param {number} radius - Distance from the planet centre, world units
 */
function sphereVertex(mapPoint, radius) {
    const direction = sphereDirection(atan2(mapPoint.x, mapPoint.y), mapPoint.mag());

    vertex(direction.x * radius, direction.y * radius, direction.z * radius); // vertex() takes numbers, not a p5.Vector
}

/**
 * How far along a ray it meets a ball.
 * @param {{origin: p5.Vector, direction: p5.Vector}} ray - The direction has length 1
 * @param {p5.Vector} centre - Centre of the ball
 * @param {number} radius - Radius of the ball
 * @returns {number|null} Distance along the ray to the first hit in front of its origin, or null if it misses
 */
function raySphereDistance(ray, centre, radius) {
    const offset = p5.Vector.sub(ray.origin, centre);
    const b = offset.dot(ray.direction);
    const discriminant = b * b - (offset.magSq() - radius * radius);

    if (discriminant < 0) {
        return null;
    }

    const near = -b - sqrt(discriminant);
    const far = -b + sqrt(discriminant);

    if (near >= 0) {
        return near;
    }

    return far >= 0 ? far : null;
}

/**
 * How far along a ray it meets a triangle, the Möller–Trumbore test.
 * Written with plain numbers, since picking an ice floe tests every one of its triangles.
 * @param {{origin: p5.Vector, direction: p5.Vector}} ray - The direction has length 1
 * @param {p5.Vector} a - First corner
 * @param {p5.Vector} b - Second corner
 * @param {p5.Vector} c - Third corner
 * @returns {number|null} Distance along the ray, or null if it misses
 */
function rayTriangleDistance(ray, a, b, c) {
    const d = ray.direction;

    // The two edges from corner a
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const ez = b.z - a.z;
    const fx = c.x - a.x;
    const fy = c.y - a.y;
    const fz = c.z - a.z;

    // Near 0 when the ray runs along the triangle and can't hit it
    const px = d.y * fz - d.z * fy;
    const py = d.z * fx - d.x * fz;
    const pz = d.x * fy - d.y * fx;
    const determinant = ex * px + ey * py + ez * pz;

    if (abs(determinant) < 0.000001) {
        return null;
    }

    // How far the hit is towards corner b, 0 to 1 inside the triangle
    const tx = ray.origin.x - a.x;
    const ty = ray.origin.y - a.y;
    const tz = ray.origin.z - a.z;
    const u = (tx * px + ty * py + tz * pz) / determinant;

    if (u < 0 || u > 1) {
        return null;
    }

    // How far towards corner c, together with u at most 1 inside the triangle
    const qx = ty * ez - tz * ey;
    const qy = tz * ex - tx * ez;
    const qz = tx * ey - ty * ex;
    const v = (d.x * qx + d.y * qy + d.z * qz) / determinant;

    if (v < 0 || u + v > 1) {
        return null;
    }

    const distance = (fx * qx + fy * qy + fz * qz) / determinant;

    return distance >= 0 ? distance : null;
}

/**
 * Where a ray meets a ball round the planet centre. If it passes beside the ball, the nearest point on its edge.
 * @param {{origin: p5.Vector, direction: p5.Vector}} ray - The direction has length 1
 * @param {number} radius - Radius of the ball, world units
 * @returns {p5.Vector} Direction from the planet centre to that point, length 1
 */
function rayHitDirection(ray, radius) {
    const distance = raySphereDistance(ray, createVector(0, 0, 0), radius) ?? -ray.origin.dot(ray.direction);

    return p5.Vector.add(ray.origin, p5.Vector.mult(ray.direction, distance)).normalize();
}

/**
 * Draws only the far half or the near half of a closed shape, using WebGL face culling.
 * Drawing the far half, then what is inside, then the near half lets see-through layers show each other.
 * @param {p5.Geometry} geometry - A closed mesh with its triangles facing outwards
 * @param {"far"|"near"} half - Which half to draw
 */
function drawHalf(geometry, half) {
    const gl = drawingContext;

    gl.enable(gl.CULL_FACE);
    gl.cullFace(half === "far" ? gl.FRONT : gl.BACK); // Skip the faces facing the camera, or the ones facing away
    model(geometry);
    gl.disable(gl.CULL_FACE);
}

/**
 * Draws without marking depth, so see-through things don't hide what is drawn after them behind them.
 * p5 turns depth marking back on by itself whenever it thinks the blending has changed, which happens
 * every time the shader changes, so that is blocked while drawing.
 * @param {Function} drawSomething - Does the drawing
 */
function drawWithoutDepth(drawSomething) {
    const gl = drawingContext;

    gl.depthMask(false);
    gl.depthMask = () => {}; // Blocks p5, the real one comes back below
    try {
        drawSomething();
    } finally {
        delete gl.depthMask;
        gl.depthMask(true);
    }
}

/**
 * Turns a colour name into the format vertex colours and shaders want.
 * @param {string} colorName - Any colour format, such as "#1F7FB8"
 * @returns {number[]} [r, g, b], 0 to 1
 */
function toRGB(colorName) {
    const c = color(colorName);

    return [red(c) / 255, green(c) / 255, blue(c) / 255];
}

/**
 * Turns a colour and an opacity into the format the canvas drawing commands want.
 * @param {string} colorName - Any colour format, such as "#3F8FE0"
 * @param {number} alpha - Opacity, 0 to 1
 * @returns {string} Such as "rgba(63, 143, 224, 0.5)"
 */
function cssColor(colorName, alpha) {
    const c = color(colorName);

    return `rgba(${red(c)}, ${green(c)}, ${blue(c)}, ${alpha})`;
}
