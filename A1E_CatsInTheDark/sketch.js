/*
 * A1E - Cats in the Dark
 * Several cats asleep in the dark. Speak and a few crack their eyes open. The louder you get, the more of them wake up.
 * Inspired by the example Audio-Sensitive Animation
 */

const WAKE_LEVEL = 0.04; // Louder than this, the cats starts waking up
const WAKE_SPEED = 0.01; // How fast cats wake up (e.g. 1% of per frame, then 1 second = 12 cats waking up)
const SLEEP_SPEED = 0.005; // How fast cats fall back asleep, same as wake speed

const ASLEEP_FILE = "assets/cat-sleep.png";
const AWAKE_FILE = "assets/cat-open-eyes.png";

// The cat area, CAT_SPOTS are positions inside it
const AREA_W = 800;
const AREA_H = 600;

const CAT_SPOTS = [
    // first row
    [80, 216],
    [170, 220],
    [260, 224],
    [448, 228],
    [538, 232],
    [628, 236],
    [718, 240],

    // middle row
    [80, 354],
    [170, 358],
    [260, 362],
    [350, 366],
    [538, 370],
    [628, 374],
    [718, 378],

    // last row
    [125, 496],
    [215, 500],
    [305, 504],
    [493, 508],
    [583, 512],
    [673, 516],
];

// Status button, pinned to the top-right corner
const BUTTON_W = 150;
const BUTTON_H = 36;
const BUTTON_MARGIN = 20;

let asleepArt, awakeArt;
let cats = [];
let awakeRate = 0; // 0 = every cat asleep, 1 = all of them awake
let mode = "ready"; // "ready", "listening", "stopped"
let audio = null; // { stream, ctx, analyser, samples } while listening

async function setup() {
    createCanvas(windowWidth, windowHeight);

    // load cat images
    [asleepArt, awakeArt] = await Promise.all([ASLEEP_FILE, AWAKE_FILE].map((file) => loadImage(file)));

    cats = CAT_SPOTS.map(([x, y]) => ({
        x,
        y,
        wakeupOrder: random(), // wake up order
    }));

    // Cats overlap order, right one covers left one
    cats.sort((a, b) => a.x - b.x);

    startListening().catch(() => {
        // Failed to start listening
        mode = "ready";
    });
}

function draw() {
    const level = audio ? micLevel() : 0;

    updateAwakeRate(level);

    background("#1E222C");

    push();
    translate((width - AREA_W) / 2, (height - AREA_H) / 2); // Move the cat area to the centre of the screen
    for (const cat of cats) {
        drawCat(cat);
    }
    pop();

    drawButton();
}

function updateAwakeRate(level) {
    if (level > WAKE_LEVEL) {
        awakeRate += WAKE_SPEED;
    } else {
        awakeRate -= SLEEP_SPEED;
    }

    awakeRate = constrain(awakeRate, 0, 1); // Keep it between 0 and 1
}

function isAwake(cat) {
    return awakeRate > cat.wakeupOrder;
}

function drawCat(cat) {
    const art = isAwake(cat) ? awakeArt : asleepArt;

    image(art, cat.x - art.width / 2, cat.y - art.height);
}

async function startListening() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext();

    // Try to resume listening
    if (ctx.state === "suspended") {
        await ctx.resume();
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;

    ctx.createMediaStreamSource(stream).connect(analyser);
    audio = { stream, ctx, analyser, samples: new Uint8Array(analyser.fftSize) };
    mode = "listening";
}

// Stop recording
function stopListening() {
    audio.stream.getTracks().forEach((track) => track.stop());
    audio.ctx.close();
    audio = null;
    mode = "stopped";
}

// Loudness, RMS algorithm, 0 = quiet, 1 = shouting
function micLevel() {
    audio.analyser.getByteTimeDomainData(audio.samples);

    let sum = 0;

    // 1024 samples, each 0-255, 128 = silence, > 128 = louder
    for (const s of audio.samples) {
        const v = (s - 128) / 128;
        sum += v * v;
    }

    return Math.sqrt(sum / audio.samples.length);
}

function isOverButton() {
    const x = width - BUTTON_W - BUTTON_MARGIN;
    const y = BUTTON_MARGIN;

    return mouseX >= x && mouseX <= x + BUTTON_W && mouseY >= y && mouseY <= y + BUTTON_H;
}

function buttonClick() {
    if (audio) {
        stopListening();
    } else {
        startListening();
    }
}

function mousePressed() {
    if (isOverButton()) {
        buttonClick();
    }
}

function drawButton() {
    const MODES = {
        ready: { label: "Ready", dot: [130, 140, 160] },
        listening: { label: "Listening", dot: [240, 200, 90] },
        stopped: { label: "Stopped", dot: [150, 90, 80] },
    };
    const x = width - BUTTON_W - BUTTON_MARGIN;
    const y = BUTTON_MARGIN;
    const { label, dot } = MODES[mode];

    noStroke();
    fill(0, isOverButton() ? 200 : 150);
    rect(x, y, BUTTON_W, BUTTON_H, 6);

    // A slow glint while live
    const alpha = mode === "listening" ? 170 + 85 * sin(millis() / 350) : 255;
    fill(...dot, alpha);
    circle(x + 20, y + BUTTON_H / 2, 10);

    fill(235, 235, 235);
    textAlign(LEFT, CENTER);
    textSize(13);
    text(label, x + 36, y + BUTTON_H / 2 + 1);
}
