function setup() {
    createCanvas(800, 600);
}

function draw() {
    // Sky color
    background("#c8e5f0");

    // Draw clouds
    randomClouds(10, "#fff");
    randomClouds(5, "#f9f1f1");
    randomClouds(5, "#FFF5B4");

    // Draw window's frame
    drawFrames(8);

    noLoop();
}

// numSectors: number of frames to draw
function drawFrames(numSectors) {
    let centreX = 400; // Center of the canvas
    let centreY = 300; // Center of the canvas
    let len = 800; // length of each frame line

    for (let i = 0; i < numSectors; i++) {
        // Calculate the angle
        let angle = (i * TWO_PI) / numSectors;
        // Calculate the end point of the line based on the angle
        let endX = centreX + cos(angle) * len;
        let endY = centreY + sin(angle) * len;

        stroke("#fff");
        strokeWeight(10);
        line(centreX, centreY, endX, endY);
    }
}

// number: number of clouds to draw
// color: color of the clouds
function randomClouds(number, color) {
    for (let i = 0; i < number; i++) {
        // Random position for the cloud
        let x = random(800);
        let y = random(600);
        // Length of the cloud's base line
        let len = 140;

        stroke(color);
        fill(color);
        strokeWeight(20);

        // Base line of the cloud
        line(x, y, x + len, y);

        ellipse(x + 30, y - 10, 25, 10); // Left part of the cloud
        ellipse(x + 70, y - 20, 40, 20); // Middle part of the cloud
        ellipse(x + 110, y - 10, 25, 10); // Right part of the cloud
    }
}

// function drawPie(numSectors) {
//     let centreX = 400;
//     let centreY = 300;
//     let radius = 1200;

//     let anglePerSector = 360 / numSectors;
//     for (let i = 0; i < numSectors; i++) {
//         let startAngle = radians(i * anglePerSector);
//         let endAngle = radians((i + 1) * anglePerSector);

//         stroke(255);
//         strokeWeight(10);
//         fill(138, 195, 206);

//         arc(centreX, centreY, radius, radius, startAngle, endAngle, PIE);

//     }
// }
