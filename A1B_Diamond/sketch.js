let diamonds = [];
let ripples = [];

const CONFIG = {
    layers: 10, // Tower layers (before symmetry), example: 3 layers = 5 rows (1, 2, 3, 2, 1)
    diamondWidth: 32,
    diamondHeight: 58,
    topColor: "#ececec",
    version1Color: "#be2d69", // red
    version2Color: "#2457B8", // blue
};

let version = 1;

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(255);

    buildTower();

    const hint = createP("Press 1 or 2 to switch version");
    hint.class("hint");
}

// Rebuild the tower in the current version's colour
function buildTower() {
    const bottomColor = version === 1 ? CONFIG.version1Color : CONFIG.version2Color;

    diamonds = [];

    createTower(
        color(CONFIG.topColor),
        color(bottomColor),
        CONFIG.diamondWidth,
        CONFIG.diamondHeight,
        CONFIG.layers,
    );
}

function draw() {
    // Update all ripples
    for (let index = ripples.length - 1; index >= 0; index -= 1) {
        // Move the wave outward
        ripples[index].update();

        // Delete ripples that have completed their animation
        if (ripples[index].isFinished()) {
            ripples.splice(index, 1); // use backwards loop to avoid skipping elements when removing
        }
    }

    // Draw every diamond
    for (let index = 0; index < diamonds.length; index += 1) {
        diamonds[index].display(ripples);
    }
}

function mousePressed() {
    // Start the wave where the user clicked
    ripples.push(new Ripple(mouseX, mouseY));
}

function keyPressed() {
    if (key !== "1" && key !== "2") {
        return;
    }

    version = Number(key);
    buildTower();
}

// Create a tower of diamonds
function createTower(topColor, bottomColor, diamondWidth, diamondHeight, layers) {
    const totalRows = layers * 2 - 1; // The tower is symmetrical, example: 3 layers = 5 rows (1, 2, 3, 2, 1)
    const towerHeight = (totalRows * diamondHeight) / 2; // The diamonds are stacked, so the height is half the diamond height per row
    const firstY = (height - towerHeight) / 2; // Y position of the first diamond's center

    for (let row = 0; row < totalRows; row += 1) {
        // Get diamond count for this row (row start with 0), example: 5 rows (1, 2, 3, 2, 1)
        const diamondCount = row < layers ? row + 1 : totalRows - row;

        // Calculate the row color based on its distance from the center
        const distanceFromCenter = abs(layers - 1 - row);
        const colorAmount = distanceFromCenter / (layers - 1);
        const baseColor = lerpColor(bottomColor, topColor, colorAmount);

        // Calculate the Y position for this row
        const diamondCenterY = firstY + (row * diamondHeight) / 2;

        addRow(diamondCount, diamondCenterY, diamondWidth, diamondHeight, baseColor);
    }
}

// Add a row of diamonds to the tower
function addRow(diamondCount, diamondCenterY, diamondWidth, diamondHeight, baseColor) {
    const rowWidth = diamondCount * diamondWidth;
    // Calculate the X position of the first diamond's center
    const firstX = width / 2 - rowWidth / 2 + diamondWidth / 2;

    for (let column = 0; column < diamondCount; column += 1) {
        diamonds.push(
            new Diamond(firstX + column * diamondWidth, diamondCenterY, diamondWidth, diamondHeight, baseColor),
        );
    }
}

class Diamond {
    constructor(x, y, diamondWidth, diamondHeight, baseColor) {
        this.x = x; // Center X position of the diamond
        this.y = y; // Center Y position of the diamond
        this.diamondWidth = diamondWidth;
        this.diamondHeight = diamondHeight;
        this.baseColor = baseColor;
    }

    display(activeRipples) {
        let waveAmount = 0;

        // Match if the diamond is within the wave width and return the highest brightness
        for (let index = 0; index < activeRipples.length; index += 1) {
            waveAmount = max(waveAmount, activeRipples[index].getBrightness(this.x, this.y));
        }

        const displayColor = lerpColor(this.baseColor, color(255), waveAmount);

        // Draw the diamond
        fill(displayColor);
        noStroke();
        quad(
            this.x,
            this.y - this.diamondHeight / 2, // Top point
            this.x + this.diamondWidth / 2,
            this.y, // Right point
            this.x,
            this.y + this.diamondHeight / 2, // Bottom point
            this.x - this.diamondWidth / 2,
            this.y, // Left point
        );
    }
}

class Ripple {
    constructor(x, y) {
        this.x = x; // Wave start position
        this.y = y; // Wave start position
        this.framesMoved = 0; // Frames since the wave started
        this.speed = 8; // Pixels per frame
        this.width = 40; // Wave width
        this.framesDuration = 120; // Animation length (frames) (120 frames = 2s)
    }

    // Move the wave front outward one frame at a time.
    update() {
        this.framesMoved += 1;
    }

    // Return a value between 0 and 1 to indicate how much the diamond should brighten
    getBrightness(x, y) {
        const distanceFromClick = dist(this.x, this.y, x, y); // Distance from the wave's origin to the diamond
        const pixelsMoved = this.framesMoved * this.speed; // Distance from the wave's origin to the wave front
        const distanceToWave = abs(distanceFromClick - pixelsMoved); // Distance from the diamond to the wave front

        // How close the diamond is to the wave front (1 = on the wave front, 0 = outside the wave width)
        return constrain(1 - distanceToWave / this.width, 0, 1);
    }

    // Return true when the wave has completed its animation
    isFinished() {
        return this.framesMoved >= this.framesDuration;
    }
}
