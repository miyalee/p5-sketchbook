/** A1F — Tornado
 * A 3D cartoon tornado, inspired by "Spiral" and "Circle Morphing"
 * in the book Code as Creative Medium. */

// View
const TORNADO_HEIGHT = 760; // Height of the tornado, in pixels
const VIEW_HEIGHT = 1200; // Height of the view (tornado plus some space)
const DRAG_SPEED = 1; // Mouse drag sensitivity

// Tornado Shape
const RING_COUNT = 30; // Number of tornado rings

// Ring Shape
const BOTTOM_RADIUS = 30; // Size of the bottom ring
const TOP_RADIUS = 260; // Size of the toppest ring
const TUBE_MIN = 12; // Tube thickness range
const TUBE_MAX = 34; // Tube thickness range
const RING_DETAIL = 36; // Segments around each ring, how smooth
const TUBE_DETAIL = 12; // Segments around each tube, how smooth

const STREAKS_PER_RING = 6; // Little streaks around each ring, like wind gusts
const TILT = -10; // Rotation of the rings

// RRing Colour
const RING_ALPHA = 0.8; // opacity

// Motion
const NOISE_SPEED = 0.01; // Noise for radius, translation of single rings, and translation of whole tornado

const SPIN_SLOW = 1; // Self-rotation speed range, about 57 degrees per second
const SPIN_CYCLE = 20; // Seconds for one slow, fast, slow cycle
const SPIN_RAMP_TIME = 6; // Seconds to speed up, and again to slow down

const WOBBLE_BOTTOM = 0.3; // Radius change at the bottom, 0.3 = ±30%
const WOBBLE_TOP = 0.1; // Radius change at the top

// Live settings, adjustable in the panel
const params = {
    finesse: 4, // Finesse of the tornado
    topColor: "#7A889C", // Storm grey
    bottomColor: "#966C42", // Earth brown
    spinFast: 2, // Self-rotation speed range, about 115 degrees per second
    spinFastTime: 5, // Seconds at full speed in the middle of the cycle
    drift: 100, // How far the whole tornado wanders, in pixels
    driftSpeed: 0.3, // How fast it wanders, relative to the wobble
    swayBottom: 70, // Sideways sway at the bottom, in pixels
    swayTop: 10, // Sideways sway at the top, in pixels
};

let rings = [];
let spinAngle = 0; // Total spin so far, in radians
let isUsingPanel = false; // True while dragging a slider, so the camera stays still

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);

    // Control panel, top right
    const gui = new lil.GUI({ title: "Tornado" });

    gui.add(params, "finesse", 1, 6).name("Finesse");
    gui.addColor(params, "topColor").name("Top colour");
    gui.addColor(params, "bottomColor").name("Bottom colour");
    gui.add(params, "spinFast", SPIN_SLOW, 5).name("Spin fast (rad/s)");
    gui.add(params, "spinFastTime", 0, SPIN_CYCLE - 2 * SPIN_RAMP_TIME).name("Fast time (s)");
    gui.add(params, "drift", 0, 500).name("Drift (px)");
    gui.add(params, "driftSpeed", 0, 1).name("Drift speed");
    gui.add(params, "swayBottom", 0, 200).name("Sway bottom (px)");
    gui.add(params, "swayTop", 0, 200).name("Sway top (px)");

    gui.domElement.addEventListener("pointerdown", () => {
        isUsingPanel = true;
    });
    window.addEventListener("pointerup", () => {
        isUsingPanel = false;
    });

    // Radius and colour are worked out in draw(), so the panel can change them live
    for (let i = 0; i < RING_COUNT; i++) {
        const heightRatio = i / (RING_COUNT - 1); // 0 at the bottom, 1 at the top

        rings.push({
            heightRatio: heightRatio,
            y: TORNADO_HEIGHT / 2 - heightRatio * TORNADO_HEIGHT,
            tubeRadius: random(TUBE_MIN, TUBE_MAX),
            spinMultiplier: 2 - heightRatio, // Bottom spins twice as fast as the top
            streaks: makeStreaks(),
        });
    }
}

function makeStreaks() {
    const streaks = [];

    for (let i = 0; i < STREAKS_PER_RING; i++) {
        const arcLength = random(0.4, 1.4); // In radians

        // A flat arc on a circle of radius 1, scaled up to the ring size when drawn
        const arc = buildGeometry(() => {
            noFill();
            beginShape();
            for (let angle = 0; angle <= arcLength; angle += 0.05) {
                vertex(cos(angle), 0, sin(angle));
            }
            endShape();
        });

        streaks.push({
            arc: arc,
            startAngle: random(TWO_PI),
            tubeAngle: random(-1.1, 1.1), // Where it sits on the outer side of the tube
            weight: random(3, 6),
            isLight: random() < 0.5, // Half the streaks are lighter than the ring, half darker
        });
    }

    return streaks;
}

function draw() {
    background(255);
    if (!isUsingPanel) {
        orbitControl(DRAG_SPEED, DRAG_SPEED, DRAG_SPEED);
    }

    const noiseTime = frameCount * NOISE_SPEED;

    // Spin speed: slow, ease up to fast, hold, ease back down
    const cycleTime = (millis() / 1000) % SPIN_CYCLE;
    const distanceFromMiddle = abs(cycleTime - SPIN_CYCLE / 2);
    const fastEnd = params.spinFastTime / 2;
    const fastAmount = constrain(map(distanceFromMiddle, fastEnd, fastEnd + SPIN_RAMP_TIME, 1, 0), 0, 1);
    const easedAmount = (1 - cos(PI * fastAmount)) / 2;
    const spinSpeed = lerp(SPIN_SLOW, params.spinFast, easedAmount);

    spinAngle += (spinSpeed * deltaTime) / 1000;

    // Whole tornado drifts across the ground
    const driftX = map(noise(noiseTime * params.driftSpeed, 100), 0, 1, -params.drift, params.drift);
    const driftZ = map(noise(noiseTime * params.driftSpeed, 200), 0, 1, -params.drift, params.drift);

    translate(driftX, 0, driftZ);
    scale(height / VIEW_HEIGHT); // Scale after translating, so the drift is in real pixels, not scaled units

    const topColor = color(params.topColor);
    const bottomColor = color(params.bottomColor);

    for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];

        // Ring colour fades from bottom to top
        const baseColor = lerpColor(bottomColor, topColor, ring.heightRatio);
        const ringColor = color(red(baseColor), green(baseColor), blue(baseColor), 255 * RING_ALPHA);
        const lightColor = lerpColor(baseColor, color(255), 0.45);
        const darkColor = lerpColor(baseColor, color(0), 0.25);

        // Ring radius grows from bottom to top, finesse sets how sharply it opens up
        const baseRadius = lerp(BOTTOM_RADIUS, TOP_RADIUS, pow(ring.heightRatio, params.finesse));
        // Ring radius changes over time, more at the bottom than the top
        const wobble = lerp(WOBBLE_BOTTOM, WOBBLE_TOP, ring.heightRatio);
        const radius = baseRadius * map(noise(i * 0.1, noiseTime), 0, 1, 1 - wobble, 1 + wobble);
        // Tube radius (Avoid the tube radius being bigger than the ring radius, which would look weird)
        const tubeRadius = min(ring.tubeRadius, radius * 0.9);
        // Each ring sways sideways, more at the bottom than the top
        const sway = lerp(params.swayBottom, params.swayTop, ring.heightRatio);
        const swayX = map(noise(i * 0.07, noiseTime, 10), 0, 1, -sway, sway);
        const swayZ = map(noise(i * 0.07, noiseTime, 20), 0, 1, -sway, sway);

        // Tilt angle, 0 at the bottom, full tilt in the middle, 0 at the top
        const tilt = TILT * sin(PI * ring.heightRatio);

        push();
        translate(swayX, ring.y, swayZ);
        rotateZ(radians(tilt)); // Transform tilt to radian
        rotateY(spinAngle * ring.spinMultiplier);

        // Rounded so p5 can reuse the torus shape
        const tubeRaidusRounded = round(tubeRadius * 50) / 50;

        push();
        rotateX(HALF_PI); // torus is vertical as default, rotate so the torus is horizontal
        noStroke();
        fill(ringColor);
        torus(radius, tubeRaidusRounded, RING_DETAIL, TUBE_DETAIL);
        pop();

        // Streaks just outside the tube surface
        for (const streak of ring.streaks) {
            const offset = tubeRadius * 1.06;
            const circleRadius = radius + offset * cos(streak.tubeAngle);

            push();
            translate(0, -offset * sin(streak.tubeAngle), 0);
            rotateY(streak.startAngle);
            scale(circleRadius, 1, circleRadius);
            stroke(streak.isLight ? lightColor : darkColor);
            strokeWeight(streak.weight);
            model(streak.arc);
            pop();
        }

        pop();
    }
}
