/**
 * Fish schools: ten glowing see-through fish swimming slowly sideways round the core, after fish.png.
 * Each fish is a 3D body plus a flat strip with a picture of its fins and tail on it. All fish share these meshes,
 * the picture and two shaders, the formation and the time make each one move its own way.
 */

const FISH_SIZE = 51; // Length of one fish, nose to fin tips, world units. The rest of the fish is measured in fish lengths
const FISH_BODY_ALPHA = 1; // Opacity of the body where it faces you, the edges are solid, 0 to 1
const FISH_FIN_COLOR = "#3F8FE0"; // See-through blue, inside the fins
const FISH_EDGE_COLOR = "#fcfeff"; // The glowing outline of the body and the fins
const FISH_GLOW_COLOR = "#7ecdf7"; // Bright blue, the glow round the fin edges
const FISH_TAIL_COLOR = "#FFFFFF"; // White at the body, fading to clear at the tip
const FISH_TAIL_ALPHA = 0.6; // Opacity of the tail at the body, 0 to 1
const FISH_ALPHA = 0.8; // Opacity inside the water, 0 to 1
const FISH_GLOW = 0.6; // Strength of the layer over the water, glowing fins and the true body colour, 0 to 1
const FISH_UNDERWATER = 0.3; // How much that layer looks seen through water, 0 = clear, 1 = sunk into the water
const FISH_ORBIT = 0.4; // Where the schools swim, 0 = on the core, 1 = at the water surface
const FISH_SPEED = 8; // Swimming speed round the core, world units per second
const FISH_BOB = 6; // How far the school drifts up and down, world units
const FISH_BOB_TIME = 18; // One slow drift up and down, seconds
const FISH_WOBBLE = 0.12; // How far each fish drifts around its place in the school, fish lengths
const FISH_WAG = 0.12; // How far the fin tips sway, fish lengths
const FISH_WAG_SPEED = 2.2; // How fast the fins sway, radians per second
// Where each fish swims in the school, [forwards, out from the core, south], fish lengths
// prettier-ignore
const FISH_FORMATION = [
    [1.16, 0, 0],
    [0.63, -0.12, -0.47],
    [0.69, 0.12, 0.41],
    [0.07, -0.09, -0.85],
    [0.16, 0.03, 0],
    [0.13, 0.15, 0.79],
    [-0.46, -0.12, -0.38],
    [-0.4, 0.09, 0.41],
    [-0.98, -0.03, -0.03],
    [-1.01, 0.12, 0.76],
];
// Shape of the body in the fish picture (512 × 256 pixels), tail end to nose, as Bézier curves [x0, y0, x1, y1, x2, y2, x3, y3].
// The gap in the picture and the 3D body are both made from these, so they fit together exactly.
// prettier-ignore
const FISH_BACK_CURVES = [
    [228, 122, 255, 108, 300, 82, 360, 80],
    [360, 80, 420, 78, 470, 92, 495, 128],
];
// prettier-ignore
const FISH_BELLY_CURVES = [
    [228, 134, 258, 150, 310, 176, 370, 176],
    [370, 176, 430, 176, 472, 160, 495, 128],
];

let fishTexture; // Picture of the fins and tail, a p5.Image so it is only sent to the graphics card once
let fishBody; // 3D body
let fishShader; // Gives the body glowing edges and soft shading
let finStrip; // Flat strip the fin picture goes on
let finShader; // Sways the fin strip

/**
 * Builds the picture, the meshes and the shaders all fish share.
 */
function makeFishParts() {
    fishTexture = makeFishTexture();
    smoothWhenSmall(fishTexture);
    fishBody = makeFishBody();
    fishShader = makeFishShader();
    finStrip = makeFinStrip();
    finShader = makeFinShader();
    textureMode(NORMAL); // Texture positions from 0 to 1, as the fin strip has them
}

/**
 * Builds the data for one school of fish.
 * @param {{longitude: number, fromNorth: number}} spot - Where the middle of the school is, radians
 * @returns {Object} The school
 */
function makeFishSchool(spot) {
    return {
        type: "fish",
        spot: spot,
        scale: 1, // Size, changed by scrolling when selected
        time: 0, // Seconds, set in updateFishSchool()
        timeOffset: random(100), // So each school moves at its own time
    };
}

/**
 * Draws the glowing see-through fins and tail of one fish facing right, after fish.png.
 * The body is left out, the 3D body from makeFishBody() goes in its place.
 * Uses the canvas drawing commands directly, for the glow (shadowBlur) and the fading gradients.
 * @returns {p5.Image} 512 × 256, transparent round the fins
 */
function makeFishTexture() {
    const picture = createGraphics(512, 256);

    picture.pixelDensity(1);

    const ctx = picture.drawingContext;
    const edgeFade = ctx.createLinearGradient(420, 0, 0, 0); // Fin outlines fade out towards their tips on the left

    edgeFade.addColorStop(0, cssColor(FISH_EDGE_COLOR, 0.9));
    edgeFade.addColorStop(1, cssColor(FISH_EDGE_COLOR, 0.05));

    const finFill = ctx.createLinearGradient(420, 0, 0, 0);

    finFill.addColorStop(0, cssColor(FISH_FIN_COLOR, 0.4));
    finFill.addColorStop(1, cssColor(FISH_FIN_COLOR, 0));

    const tailFill = ctx.createLinearGradient(240, 0, 0, 0);

    tailFill.addColorStop(0, cssColor(FISH_TAIL_COLOR, FISH_TAIL_ALPHA));
    tailFill.addColorStop(0.45, cssColor(FISH_TAIL_COLOR, FISH_TAIL_ALPHA * 0.3));
    tailFill.addColorStop(1, cssColor(FISH_TAIL_COLOR, 0));

    // Shapes, the nose is on the right
    // Body, along the back to the nose, then back along the belly
    const body = new Path2D();
    body.moveTo(FISH_BACK_CURVES[0][0], FISH_BACK_CURVES[0][1]);
    for (const c of FISH_BACK_CURVES) {
        body.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
    }
    for (const c of [...FISH_BELLY_CURVES].reverse()) {
        body.bezierCurveTo(c[4], c[5], c[2], c[3], c[0], c[1]);
    }
    body.closePath();

    // A tall sail rising from the back, swept far back. Only its outer edge is outlined,
    // its base reaches into the body, so there is no gap where they meet.
    const backFinEdge = new Path2D();
    backFinEdge.moveTo(405, 82);
    backFinEdge.bezierCurveTo(385, 52, 350, 30, 300, 26);
    backFinEdge.bezierCurveTo(240, 24, 150, 50, 50, 84);
    backFinEdge.bezierCurveTo(140, 84, 220, 96, 270, 98);

    const backFin = new Path2D(backFinEdge);
    backFin.lineTo(270, 122);
    backFin.lineTo(405, 104);
    backFin.closePath();

    // A lower, smaller fin under the belly
    const bellyFinEdge = new Path2D();
    bellyFinEdge.moveTo(360, 176);
    bellyFinEdge.bezierCurveTo(330, 200, 280, 214, 220, 216);
    bellyFinEdge.bezierCurveTo(160, 218, 100, 204, 50, 180);
    bellyFinEdge.bezierCurveTo(130, 178, 220, 170, 270, 160);

    const bellyFin = new Path2D(bellyFinEdge);
    bellyFin.lineTo(270, 134);
    bellyFin.lineTo(360, 150);
    bellyFin.closePath();

    // Tail, a long forked fan, its base also inside the body
    const tail = new Path2D();
    tail.moveTo(240, 122);
    tail.bezierCurveTo(180, 108, 100, 80, 8, 70);
    tail.bezierCurveTo(60, 100, 60, 156, 8, 186);
    tail.bezierCurveTo(100, 176, 180, 148, 240, 134);
    tail.closePath();

    ctx.shadowColor = cssColor(FISH_GLOW_COLOR, 1);

    // Tail, white fading to clear, with a soft glow
    ctx.shadowBlur = 8;
    ctx.fillStyle = tailFill;
    ctx.fill(tail);

    // Back fin and belly fin, see-through with a glowing outline
    for (const [fin, edge] of [
        [backFin, backFinEdge],
        [bellyFin, bellyFinEdge],
    ]) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = finFill;
        ctx.fill(fin);

        ctx.shadowBlur = 10;
        ctx.strokeStyle = edgeFade;
        ctx.lineWidth = 2;
        ctx.stroke(edge);
    }

    // Gap for the 3D body, the same shape as it, so the fins don't show through it
    ctx.globalCompositeOperation = "destination-out";
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000000"; // Solid, so the gap is cut out completely
    ctx.fill(body);
    ctx.globalCompositeOperation = "source-over";

    // As an image, which p5 uploads once, a p5.Graphics is uploaded again every time it is drawn
    const image = picture.get();

    picture.remove();

    return image;
}

/**
 * Adds smaller copies of a picture (mipmaps) for the graphics card to use when it is drawn small,
 * so thin outlines fade smoothly instead of flickering.
 * @param {p5.Image} image - Must not change after this
 */
function smoothWhenSmall(image) {
    const gl = drawingContext;
    const tex = sceneRenderer.getTexture(image);

    tex.update();
    gl.bindTexture(gl.TEXTURE_2D, tex.textureHandle.texture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

/**
 * Height of a body outline at one point along the fish, read off its Bézier curves.
 * @param {number[][]} curves - FISH_BACK_CURVES or FISH_BELLY_CURVES
 * @param {number} x - Picture pixels, from the tail end to the nose
 * @returns {number} y in picture pixels
 */
function outlineY(curves, x) {
    for (const c of curves) {
        if (x > c[6]) {
            continue;
        }

        // Step along the curve until it passes x
        let previous = createVector(c[0], c[1]);
        for (let t = 0.02; t < 1.01; t += 0.02) {
            const point = createVector(bezierPoint(c[0], c[2], c[4], c[6], t), bezierPoint(c[1], c[3], c[5], c[7], t));

            if (point.x >= x) {
                return map(x, previous.x, point.x, previous.y, point.y);
            }
            previous = point;
        }
    }

    return curves[curves.length - 1][7];
}

/**
 * Builds the see-through body of one fish, 1 fish length long, nose towards +x, back towards -y.
 * Its outline seen from the side follows FISH_BACK_CURVES and FISH_BELLY_CURVES.
 * Picture pixels become fish lengths by dividing by 512, the width of the picture.
 * @returns {p5.Geometry} The body mesh
 */
function makeFishBody() {
    const rows = 16; // Along the fish
    const columns = 16; // Round the fish
    const geometry = new p5.Geometry(columns, rows);
    const tailEnd = FISH_BACK_CURVES[0][0];
    const nose = FISH_BACK_CURVES[FISH_BACK_CURVES.length - 1][6];

    for (let row = 0; row <= rows; row++) {
        const pictureX = lerp(tailEnd, nose, row / rows);
        const top = outlineY(FISH_BACK_CURVES, pictureX);
        const bottom = outlineY(FISH_BELLY_CURVES, pictureX);
        const x = pictureX / 512 - 0.5;
        const middleY = ((top + bottom) / 2 - 128) / 512;
        const halfHeight = max((bottom - top) / 2 / 512, 0.002); // Not quite 0 at the nose, so every triangle has a size

        for (let column = 0; column <= columns; column++) {
            const angle = (column / columns) * TWO_PI;

            geometry.vertices.push(
                createVector(
                    x,
                    middleY - cos(angle) * halfHeight,
                    -sin(angle) * halfHeight * 0.6, // Flatter side to side. Going round this way makes the triangles face outwards
                ),
            );
        }
    }

    geometry.computeFaces(); // Joins the grid into triangles
    geometry.computeNormals(); // Which way each point faces, for the glowing edges

    return geometry;
}

/**
 * Shader for the fish body: edges that turn away from you glow, and a soft light from above gives it shape.
 * @returns {p5.Shader} Set uOpacity, uWaterColor and uUnderwater after shader()
 */
function makeFishShader() {
    const edgeRGB = toRGB(FISH_EDGE_COLOR);

    return baseMaterialShader().modify({
        uniforms: {
            "float uOpacity": 1, // Opacity of the whole body
            "vec3 uWaterColor": [0, 0, 0], // Colour of the water the fish are seen through
            "float uUnderwater": 0, // How much of that colour, 0 to 1
        },
        "Inputs getPixelInputs": `(Inputs inputs) {
            float edge = pow(1.0 - abs(inputs.normal.z), 1.3); // 0 facing you, 1 at the outline
            float light = 0.8 + 0.3 * dot(inputs.normal, normalize(vec3(-0.3, -0.8, 0.5))); // Soft light from above
            inputs.color.rgb = mix(inputs.color.rgb * light, vec3(${edgeRGB.join(", ")}), edge);
            inputs.color.rgb = mix(inputs.color.rgb, uWaterColor, uUnderwater);
            inputs.color.a = mix(inputs.color.a, 1.0, edge) * uOpacity;
            return inputs;
        }`,
    });
}

/**
 * Builds the flat strip the fin picture goes on, 1 fish length long, nose towards +x.
 * @returns {p5.Geometry} Texture positions run from 0 at the fin tips to 1 at the nose
 */
function makeFinStrip() {
    const steps = 16; // Pieces along the fish, more = smoother sway
    const geometry = new p5.Geometry(steps, 1);

    for (let row = 0; row <= 1; row++) {
        for (let step = 0; step <= steps; step++) {
            const across = step / steps; // 0 at the fin tips, 1 at the nose

            geometry.vertices.push(createVector(across - 0.5, (row - 0.5) * 0.5, 0)); // 1 fish length long, half as tall
            geometry.uvs.push(across, row);
        }
    }

    geometry.computeFaces();
    geometry.computeNormals();

    return geometry;
}

/**
 * Shader for the fin strip: the part by the body stays steady while a slow wave runs back through the fins.
 * Done on the graphics card, since bending every strip in JavaScript each frame was slow.
 * @returns {p5.Shader} Set uBeat for each fish, where it is in its sway, radians
 */
function makeFinShader() {
    const tailEnd = (FISH_BACK_CURVES[0][0] / 512).toFixed(3); // Where the body ends across the picture

    return baseMaterialShader().modify({
        uniforms: {
            "float uBeat": 0,
        },
        "Vertex getObjectInputs": `(Vertex inputs) {
            float fromNose = 1.0 - inputs.texCoord.x;
            float behindBody = max(0.0, ${tailEnd} - inputs.texCoord.x) / ${tailEnd}; // 0 up to the tail end of the body, 1 at the fin tips
            float sway = ${FISH_WAG.toFixed(2)} * pow(behindBody, 1.5); // The body part of the picture stays still, so the 3D body always covers its gap
            float wave = uBeat - fromNose * 3.0;
            inputs.position.y += sin(wave) * sway; // Up and down, seen from the side
            inputs.position.z += cos(wave) * sway * 0.3; // and a little side to side
            return inputs;
        }`,
    });
}

/**
 * Distance from the planet centre to where the fish swim, between the core and the surface.
 * @returns {number} World units
 */
function fishOrbitRadius() {
    return lerp(params.coreRadius, PLANET_RADIUS, FISH_ORBIT);
}

/**
 * Size of a whole school, for clicking and its outline.
 * @param {Object} school - A school from makeFishSchool()
 * @returns {number} Radius, world units
 */
function fishSchoolRadius(school) {
    return FISH_SIZE * 1.8 * school.scale;
}

/**
 * How far the school has drifted up or down right now.
 * @param {Object} school - A school from makeFishSchool()
 * @returns {number} World units, + is south
 */
function fishBob(school) {
    return FISH_BOB * sin((school.time / FISH_BOB_TIME) * TWO_PI);
}

/**
 * Swims one school sideways round the core, once a frame. A school being dragged keeps still.
 * @param {Object} school - A school from makeFishSchool()
 */
function updateFishSchool(school) {
    const seconds = min(deltaTime, 50) / 1000;

    // The circle round the core at this spot, smaller near the poles
    const circleRadius = fishOrbitRadius() * max(sin(school.spot.fromNorth), 0.3);

    school.time = millis() / 1000 + school.timeOffset;

    if (dragState?.element === school) {
        return;
    }

    school.spot.longitude += (FISH_SPEED / circleRadius) * seconds;
}

/**
 * Draws one school at its spot, drifting up and down.
 * @param {Object} school - A school from makeFishSchool()
 * @param {boolean} isGlow - false in the water, true for the glow over it
 */
function drawFishSchool(school, isGlow) {
    const bobSpeed = FISH_BOB * (TWO_PI / FISH_BOB_TIME) * cos((school.time / FISH_BOB_TIME) * TWO_PI);
    const tilt = -atan2(bobSpeed, FISH_SPEED) * 0.5; // Noses tip up a little while drifting up, and down while drifting down

    push();
    moveToSpot(school.spot); // From here +x is the way they swim and +z is south
    rotateX(-fishBob(school) / fishOrbitRadius()); // Drift north or south along the curve

    // Over the water the fish take the water's colour, in the water the real water already colours them
    drawFishGroup(school, isGlow, tilt, isGlow ? FISH_UNDERWATER : 0);
    pop();
}

/**
 * Draws the fish of one school round the planet centre, each near its place in the school.
 * Also used for the palette picture.
 * @param {Object} school - A school from makeFishSchool()
 * @param {boolean} isGlow - false in the water, true for the glow over it
 * @param {number} tilt - How much the noses tip up or down, radians
 * @param {number} underwater - How much the fish look seen through water, 0 to 1: the bodies take the water's colour
 *     and the fins dim
 */
function drawFishGroup(school, isGlow, tilt, underwater) {
    const alpha = isGlow ? FISH_GLOW : FISH_ALPHA;
    const radius = fishOrbitRadius();
    const size = FISH_SIZE * school.scale; // World units per fish length
    const bodyColor = color(params.fishColor);
    const finColor = lerpColor(color(255), color(DEEP_COLOR), underwater); // Multiplies the fin picture

    bodyColor.setAlpha(255 * FISH_BODY_ALPHA);
    finColor.setAlpha(255 * alpha * (1 - underwater)); // The fins add light, so they dim too, or they still glow on top

    // Moves to fish number i. Its place in the school is turned into angles round the planet centre,
    // so like the ice the school bends with the curve, and each fish faces along the curve where it is.
    const moveToFish = (i) => {
        const [x, y, z] = FISH_FORMATION[i];
        const wobbleX = (noise(school.time * 0.3, i * 10) - 0.5) * FISH_WOBBLE * 2;
        const wobbleZ = (noise(school.time * 0.3, i * 10 + 5) - 0.5) * FISH_WOBBLE * 2;

        rotateZ(((x + wobbleX) * size) / radius); // Forwards round the curve
        rotateX((-(z + wobbleZ) * size) / radius); // South round the curve
        translate(0, -radius - y * size, 0);
        rotateY(tilt);
        scale(size);
        rotateX(HALF_PI); // Back towards the north, so the fish swims upright and shows its side to the outside
    };

    // Fins first, then the bodies over them, so the shader only changes twice.
    // The fins don't mark depth, or the see-through parts of their picture would hide what is behind them.
    // Over the water the fins are added on as light, the bodies keep their own colour.
    drawWithoutDepth(() => {
        push();
        blendMode(isGlow ? ADD : BLEND);
        shader(finShader);
        texture(fishTexture);
        tint(finColor);
        for (let i = 0; i < FISH_FORMATION.length; i++) {
            push();
            moveToFish(i);
            finShader.setUniform("uBeat", school.time * FISH_WAG_SPEED + i * 1.7); // Each fish at its own beat
            model(finStrip);
            pop();
        }
        pop();
    });

    // The bodies mark depth, so only the side facing you is drawn
    push();
    blendMode(BLEND);
    shader(fishShader);
    fishShader.setUniform("uOpacity", alpha);
    fishShader.setUniform("uWaterColor", toRGB(DEEP_COLOR));
    fishShader.setUniform("uUnderwater", underwater);
    fill(bodyColor);
    for (let i = 0; i < FISH_FORMATION.length; i++) {
        push();
        moveToFish(i);
        model(fishBody);
        pop();
    }
    resetShader();
    pop();
}

/**
 * How far along a ray it hits a school, tested against a ball round it.
 * @param {{origin: p5.Vector, direction: p5.Vector}} ray - In the school's space, see toSpotSpace()
 * @param {Object} school - A school from makeFishSchool()
 * @returns {number|null} Distance along the ray, or null if it misses
 */
function pickFishSchool(ray, school) {
    const centre = createVector(0, -fishOrbitRadius(), fishBob(school));

    return raySphereDistance(ray, centre, fishSchoolRadius(school));
}

/**
 * Draws a ring round the school, bent round the curve like the school, to show it is selected or under the pointer.
 * Called by drawElementOutline() inside the school's space.
 * @param {Object} school - A school from makeFishSchool()
 */
function drawFishOutline(school) {
    const radius = fishOrbitRadius();
    const ringSize = fishSchoolRadius(school) / radius; // Radians

    rotateX(-fishBob(school) / radius);
    beginShape();
    for (let step = 0; step < 32; step++) {
        const angle = (step / 32) * TWO_PI;

        sphereVertex(createVector(cos(angle), sin(angle)).mult(ringSize), radius);
    }
    endShape(CLOSE);
}
