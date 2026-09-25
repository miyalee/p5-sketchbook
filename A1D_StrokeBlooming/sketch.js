/**
 * AID
 * Name: Stroke Blooming
 * A interactive tool that turns mouse-drawn paths into blooming flowers. Inspired by Living Line 1 and Reordering Rectangles
 */
const FLOWER_SPACING = 40; // Minimum distance between flowers
const FLOWER_OPEN_SPEED = 0.012; // Percentage of flower opens each frame
const FLOWER_HOLD_TIME = 3000; // Time to hold the flower open (ms)
const FLOWER_FADE_TIME = 1200; // Time for the flower to fade out (ms)

const flowers = [];

// Record flower position for calculating distance between flowers
let lastFlowerX = 0;
let lastFlowerY = 0;

let flowerVersion = 1; // 1 = Cherry blossom, 2 = Blue sun flower

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();

    const hint = createP("Press 1 or 2 to switch version");
    hint.class("hint");
}

function draw() {
    background(255);

    // When continuously drawing, calculate the distance between every flower
    if (mouseIsPressed && dist(mouseX, mouseY, lastFlowerX, lastFlowerY) > FLOWER_SPACING) {
        createFlower(mouseX, mouseY);

        lastFlowerX = mouseX;
        lastFlowerY = mouseY;
    }

    for (let index = flowers.length - 1; index >= 0; index -= 1) {
        flowers[index].display();

        // Remove dead flowers
        if (flowers[index].isDead) {
            flowers.splice(index, 1);
        }
    }
}

function mousePressed() {
    createFlower(mouseX, mouseY);
    lastFlowerX = mouseX;
    lastFlowerY = mouseY;
}

// Reset
function mouseReleased() {
    lastFlowerX = 0;
    lastFlowerY = 0;
}

function keyPressed() {
    if (key !== "1" && key !== "2") {
        return;
    }

    flowerVersion = Number(key);
}

function createFlower(x, y) {
    const FlowerType = flowerVersion === 2 ? FlowerV2 : Flower;

    flowers.push(new FlowerType(x, y));
}

class Flower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.petalLength = 18;
        this.petalWidth = 9;
        this.open = 0; // Current open percentage (0 = closed, 1 = fully open)
        this.fullyOpenedTime = null;
        this.opacity = 1;
        this.isDead = false;
        this.colors = ["#f7efef", "#f2a6a6"];
    }

    updateLifecycle() {
        this.open = min(1, this.open + FLOWER_OPEN_SPEED);

        // Record the time when the flower is fully opened
        if (this.open === 1 && this.fullyOpenedTime === null) {
            this.fullyOpenedTime = millis();
        }

        // When the flower is fully opened
        if (this.fullyOpenedTime !== null) {
            const timeSinceFullyOpened = millis() - this.fullyOpenedTime;

            // Start fading out after the hold time has passed
            if (timeSinceFullyOpened > FLOWER_HOLD_TIME) {
                this.opacity = constrain(1 - (timeSinceFullyOpened - FLOWER_HOLD_TIME) / FLOWER_FADE_TIME, 0, 1);
            }
        }

        // Mark the flower as dead when it is fully faded out
        if (this.opacity <= 0) {
            this.isDead = true;
        }
    }

    display() {
        this.updateLifecycle();

        if (this.isDead) {
            return;
        }

        const easedOpen = 1 - pow(1 - this.open, 3); // Current open percentage (Slow -> fast opening)
        const petalLength = this.petalLength * easedOpen;
        const petalWidth = this.petalWidth * easedOpen;
        const context = drawingContext;

        context.save();
        context.globalAlpha = this.opacity;
        push();
        translate(this.x, this.y);
        rotate((PI / 2) * easedOpen);

        // Draw each petal
        for (let petal = 0; petal < 5; petal += 1) {
            push();
            rotate((TWO_PI / 5) * petal);
            this.drawPetal(petalWidth, petalLength);
            pop();
        }

        pop();
        context.restore();
    }

    drawPetal(width, length) {
        if (length < 1) {
            return;
        }

        const context = drawingContext;
        const gradient = context.createLinearGradient(0, 0, 0, -length);

        // Gradient pink for the petal color
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.4, this.colors[0]);
        gradient.addColorStop(1, this.colors[1]);

        context.save();

        // Draw the petal shape
        context.beginPath();
        context.moveTo(0, 0);
        context.bezierCurveTo(-width * 0.52, -length * 0.34, -width, -length * 0.72, -width * 0.72, -length * 0.93);
        context.bezierCurveTo(
            -width * 0.62,
            -length * 1.04,
            -width * 0.07,
            -length * 1.2,
            -width * 0.2,
            -length * 0.91,
        );
        context.bezierCurveTo(-width * 0.12, -length * 0.92, -width * 0.01, -length * 0.85, 0, -length * 0.84);
        context.bezierCurveTo(width * 0.01, -length * 0.85, width * 0.12, -length * 0.92, width * 0.2, -length * 0.91);
        context.bezierCurveTo(width * 0.07, -length * 1.2, width * 0.62, -length * 1.04, width * 0.72, -length * 0.93);
        context.bezierCurveTo(width, -length * 0.72, width * 0.52, -length * 0.34, 0, 0);
        context.closePath();

        context.fillStyle = gradient;
        context.fill();

        context.strokeStyle = this.colors[1];
        context.lineWidth = 0.5;
        context.stroke();

        context.restore();
    }
}

class FlowerV2 extends Flower {
    constructor(x, y) {
        super(x, y);

        this.petalLength = 14;
        this.petalWidth = 8;
        this.petalDistance = 14; // Distance from the center to the petal
        this.petalCount = 10;
        this.pistilSize = 20;
    }

    display() {
        this.updateLifecycle();

        if (this.isDead) {
            return;
        }

        const easedOpen = 1 - pow(1 - this.open, 3);
        const context = drawingContext;

        context.save();
        context.globalAlpha = this.opacity;
        push();
        translate(this.x, this.y);
        rotate((PI / 2) * easedOpen);

        // Draw each petal
        fill("#5bb7ba");
        for (let petal = 0; petal < this.petalCount; petal += 1) {
            push();
            rotate((TWO_PI / this.petalCount) * petal);
            ellipse(0, -this.petalDistance * easedOpen, this.petalWidth * easedOpen, this.petalLength * easedOpen);
            pop();
        }

        // Draw the pistil
        fill("#ffc329");
        circle(0, 0, this.pistilSize * easedOpen);

        pop();
        context.restore();
    }
}
