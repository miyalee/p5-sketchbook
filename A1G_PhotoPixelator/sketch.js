/*
 * A1G - Photo Pixelator
 * A photo pixelator that recreates an image as blocks of color and a live color picker
 * Inspired by the example Subsample and Downsample
 */

const PIXEL_SIZE_MIN = 2;
const PIXEL_SIZE_MAX = 40;
const PICKER_SIZE = 44; // Radius of the colour picker circle
const PICKER_OFFSET = 30; // Distance from the cursor to the circle centre

let photo;
let pixelSize = 12;
let pixelLayer; // Pixelated photo
let photoArea = {}; // Where the photo sits on the canvas: x, y, width, height, scale

async function setup() {
    createCanvas(windowWidth, windowHeight);

    photo = await loadImage("assets/photo.png");
    photo.loadPixels();

    pixelLayer = createGraphics(width, height);
    pixelLayer.noStroke();

    // Pixel size slider
    const sliderBox = createDiv();
    const sizeLabel = createSpan(`Pixel size: ${pixelSize}`);
    const sizeSlider = createSlider(PIXEL_SIZE_MIN, PIXEL_SIZE_MAX, pixelSize, 1);

    sliderBox.class("slider-box");
    sizeLabel.parent(sliderBox);
    sizeSlider.parent(sliderBox);
    sizeSlider.input(() => {
        pixelSize = sizeSlider.value();
        sizeLabel.html(`Pixel size: ${pixelSize}`);
        drawPixelLayer();
    });
    // Pixel size slider end

    drawPixelLayer();
}

function draw() {
    background(255);
    image(pixelLayer, 0, 0);

    // Colour picker, only while the mouse is over the photo
    const isOverPhoto =
        mouseX >= photoArea.x &&
        mouseX < photoArea.x + photoArea.width &&
        mouseY >= photoArea.y &&
        mouseY < photoArea.y + photoArea.height;

    if (!isOverPhoto) {
        return;
    }

    const pickerX = mouseX + PICKER_OFFSET;
    const pickerY = mouseY - PICKER_OFFSET;

    stroke(255);
    strokeWeight(4);
    fill(colorAt(mouseX, mouseY));
    circle(pickerX, pickerY, PICKER_SIZE);

    // Thin dark ring
    stroke(0, 60);
    strokeWeight(1);
    noFill();
    circle(pickerX, pickerY, PICKER_SIZE + 4);
}

function drawPixelLayer() {
    // Fit the photo inside the canvas, centred
    photoArea.scale = min(width / photo.width, height / photo.height);
    photoArea.width = photo.width * photoArea.scale;
    photoArea.height = photo.height * photoArea.scale;

    photoArea.x = round((width - photoArea.width) / 2); // Left start of the photo area on the canvas
    photoArea.y = round((height - photoArea.height) / 2); // Top start of the photo area on the canvas

    const right = photoArea.x + photoArea.width;
    const bottom = photoArea.y + photoArea.height;

    pixelLayer.clear();

    for (let y = photoArea.y; y < bottom; y += pixelSize) {
        for (let x = photoArea.x; x < right; x += pixelSize) {
            const cellWidth = min(pixelSize, right - x);
            const cellHeight = min(pixelSize, bottom - y);

            pixelLayer.fill(colorAt(x, y));
            pixelLayer.rect(x, y, cellWidth, cellHeight);
        }
    }
}

// Colour of the cell centre
function colorAt(x, y) {
    // Calculate which pixel square is x,y in
    const cellLeft = floor((x - photoArea.x) / pixelSize) * pixelSize;
    const cellTop = floor((y - photoArea.y) / pixelSize) * pixelSize;
    // Calculate which pixel number of photo is x,y
    const photoX = constrain(floor((cellLeft + pixelSize / 2) / photoArea.scale), 0, photo.width - 1);
    const photoY = constrain(floor((cellTop + pixelSize / 2) / photoArea.scale), 0, photo.height - 1);
    // pixel index of photo.pixels (one dimensional array of r,g,b,a values)
    const index = (photoY * photo.width + photoX) * 4;

    return color(photo.pixels[index], photo.pixels[index + 1], photo.pixels[index + 2], photo.pixels[index + 3]);
}
