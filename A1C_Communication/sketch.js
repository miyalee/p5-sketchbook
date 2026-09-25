/**
 * Communication
 *
 * Conditional:
 * Left side message shoots when pressed on the left side of the phone,
 * right side message shoots when pressed on the right side.
 *
 * Unpredictable:
 * The messages are randomly selected from a predefined text list.
 */

let messages = []; // Structure: { side: 'left' | 'right', text: string, fontsize: number }
let phoneBounds;
let chatBounds;
let inputBounds;
let version = 1;

const PHONE_WIDTH = 350;
const PHONE_HEIGHT = 650;

const COLORS = {
    page: "#FFFFFF",
    phoneFrame: "#1B1B1B",
    screen: "#f4f1ecef",
    notch: "#0C0C0C",
    leftBubble: "#FFFFFF",
    rightBubble: "#dafacf",
    text: "#141414",
};

function setup() {
    createCanvas(windowWidth, windowHeight);
    setupPhoneLayout();

    noStroke();
    textFont("Arial");

    const hint = createP("Press 1 or 2 to switch version");
    hint.class("hint");
}

function setupPhoneLayout() {
    phoneBounds = {
        x: (width - PHONE_WIDTH) / 2,
        y: (height - PHONE_HEIGHT) / 2,
        w: PHONE_WIDTH,
        h: PHONE_HEIGHT,
    };

    chatBounds = {
        x: phoneBounds.x + 16,
        y: phoneBounds.y + 26,
        w: phoneBounds.w - 32,
        h: phoneBounds.h - 80,
    };

    inputBounds = {
        x: phoneBounds.x + 26,
        y: phoneBounds.y + phoneBounds.h - 56,
        w: phoneBounds.w - 50,
        h: 30,
    };
}

function draw() {
    background(COLORS.page);
    drawPhone();
}

function mousePressed() {
    if (!isInsidePhone()) {
        return;
    }

    const side = mouseX < phoneBounds.x + phoneBounds.w / 2 ? "left" : "right";

    if (version === 1) {
        messages.push({ side, text: random(KAOMOJI_TEXTS), fontsize: 14 });
    } else {
        messages.push({ side, text: random(EMOJI_TEXTS), fontsize: 22 });
    }
}

function keyPressed() {
    if (key !== "1" && key !== "2") {
        return;
    }

    version = Number(key);
    messages = []; // Start a fresh chat so kaomoji and emoji don't mix
}

function isInsidePhone() {
    return (
        mouseX > phoneBounds.x &&
        mouseX < phoneBounds.x + phoneBounds.w &&
        mouseY > phoneBounds.y &&
        mouseY < phoneBounds.y + phoneBounds.h
    );
}

function drawPhone() {
    const bodyX = phoneBounds.x;
    const bodyY = phoneBounds.y;
    const bodyW = phoneBounds.w;
    const bodyH = phoneBounds.h;

    // Draw the two phone body lines
    stroke(COLORS.phoneFrame);
    strokeWeight(2);
    noFill();
    rect(bodyX + 1, bodyY + 1, bodyW - 2, bodyH - 2, 42);
    rect(bodyX + 12, bodyY + 12, bodyW - 24, bodyH - 24, 32);

    // Draw the phone screen
    noStroke();
    fill(COLORS.screen);
    const screenX = bodyX + 14;
    const screenY = bodyY + 14;
    const screenW = bodyW - 28;
    const screenH = bodyH - 28;
    rect(screenX, screenY, screenW, screenH, 34);

    // Draw the notch and chat area
    drawNotch(bodyX, bodyY, bodyW);
    drawChatArea();
    drawInputArea();
}

function drawInputArea() {
    const x = inputBounds.x;
    const y = inputBounds.y;
    const w = inputBounds.w;
    const h = inputBounds.h;
    const sendBtnSize = h;
    const gap = 10;
    const inputW = w - sendBtnSize - gap;

    // Draw the white input text area
    noStroke();
    fill("#FFFFFF");
    rect(x, y, inputW, h, h / 2);

    // Draw the send button
    const btnCx = x + inputW + gap + sendBtnSize / 2;
    const btnCy = y + h / 2;

    fill("#42C982");
    ellipse(btnCx, btnCy, sendBtnSize);
    fill("#FFFFFF");
    push();
    translate(btnCx, btnCy);
    rotate((-45 * PI) / 180);
    triangle(-6, -7, -6, 7, 8, 0);
    pop();
}

function drawNotch(bodyX, bodyY, bodyW) {
    const notchW = bodyW * 0.4;
    const notchH = 24;
    const notchX = bodyX + (bodyW - notchW) / 2;
    const notchY = bodyY + 12;

    noStroke();
    fill(COLORS.notch);
    rect(notchX, notchY, notchW, notchH, 0, 0, 12, 12);
}

function drawChatArea() {
    const bottomPadding = 16;
    const bubbleMargin = 12;
    const bubblePadding = 12;

    // Start from the bottom
    let currentBottom = chatBounds.y + chatBounds.h - bottomPadding;

    // Draw messages from the bottom up
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const bubble = getBubbleSize(msg.text);

        // Calculate the position of the left/right bubble
        const bubbleX =
            msg.side === "left" ? chatBounds.x + bubblePadding : chatBounds.x + chatBounds.w - bubble.w - bubblePadding;
        const bubbleY = currentBottom - bubble.h;

        // Stop drawing if the bubble goes above the chat area
        if (bubbleY < chatBounds.y + bubbleMargin) break;

        drawBubble(bubbleX, bubbleY, bubble.w, bubble.h, msg);
        // update the current bottom position for the next bubble
        currentBottom = bubbleY - bubbleMargin;
    }
}

function getBubbleSize(message) {
    const paddingX = 16;
    const paddingY = 10;
    const width = max(50, textWidth(message) + paddingX * 2);
    const height = 18 + paddingY * 2;

    return { w: width, h: height };
}

function drawBubble(x, y, width, height, message) {
    const bubblePadding = 12;

    // Draw the bubble rectangle
    if (message.side === "left") {
        fill(COLORS.leftBubble);
    } else {
        fill(COLORS.rightBubble);
    }
    rect(x, y, width, height, 16);

    // Draw the bubble tail
    if (message.side === "left") {
        fill(COLORS.leftBubble);
        triangle(x - 8, y + height * 0.9, x, y + height * 0.56, x + 4, y + height * 0.84);
    } else {
        fill(COLORS.rightBubble);
        triangle(x + width + 8, y + height * 0.9, x + width, y + height * 0.56, x + width - 4, y + height * 0.84);
    }

    fill(COLORS.text);
    textAlign(LEFT, TOP);
    textSize(message.fontsize || 16);
    text(message.text, x + bubblePadding, y + bubblePadding);
}
