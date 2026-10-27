/** Settings that can change while the sketch runs, and the panel at the top right that changes them. */

// Live settings, changed in the panel
const params = {
    noiseScale: 0.006, // Size of the water bumps, noise units per world unit, bigger = smaller bumps
    flowSpeed: 0.06, // How fast the water flows, noise units per second
    coreRadius: 100, // Size of the core, world units
    finesse: 4, // How sharply the tornado funnel opens up towards the top, power
    iceThickness: 20, // Thickness of the ice, world units
    fishColor: "#ff8f05", // Body colour of the fish, orange yellow
    musicVolume: 0.5, // 0 to 1
    effectsVolume: 0.7, // 0 to 1

    // Read only, filled in by draw()
    frameMs: 0, // Time draw() takes, 16.7 ms is the limit for 60 fps
    fps: 0, // Frames per second, tops out at the screen refresh rate
};
const READOUT_SMOOTHING = 0.05; // How fast the readouts follow each new frame, 0 to 1, smaller = steadier

let isUsingPanel = false; // True while a slider is dragged, so the camera keeps still

/**
 * Builds the panel at the top right.
 */
function makePanel() {
    const gui = new lil.GUI({ title: "Water Planet" });

    const planetFolder = gui.addFolder("Planet");
    planetFolder.add(params, "noiseScale", 0.002, 0.015).name("Noise scale");
    planetFolder.add(params, "flowSpeed", 0, 0.36, 0.01).name("Flow speed");
    planetFolder.add(params, "coreRadius", 50, 200).name("Core size");

    const tornadoFolder = gui.addFolder("Tornado");
    tornadoFolder.add(params, "finesse", 1, 7, 0.1).name("Finesse").onChange(remakeStrokes);

    const iceFolder = gui.addFolder("Ice");
    iceFolder.add(params, "iceThickness", 5, 40).name("Ice thickness").onChange(remakeFloes);

    const fishFolder = gui.addFolder("Fish");
    fishFolder.addColor(params, "fishColor").name("Body colour"); // Read every frame

    const soundFolder = gui.addFolder("Sound");
    soundFolder
        .add(params, "musicVolume", 0, 1)
        .name("Music volume")
        .onChange((value) => {
            music.volume(value);
        });
    soundFolder.add(params, "effectsVolume", 0, 1).name("Effects volume"); // Read each time a sound plays

    const performanceFolder = gui.addFolder("Performance");
    performanceFolder.add(params, "frameMs").name("Frame (ms)").decimals(2).listen().disable();
    performanceFolder.add(params, "fps").name("FPS").decimals(0).listen().disable();

    // Keep the camera still while dragging a slider
    gui.domElement.addEventListener("pointerdown", () => {
        isUsingPanel = true;
    });
    window.addEventListener("pointerup", () => {
        isUsingPanel = false;
    });
}

/**
 * Updates the performance readouts, at the end of draw().
 * @param {number} frameStart - performance.now() when draw() started
 */
function updateReadouts(frameStart) {
    params.frameMs = lerp(params.frameMs, performance.now() - frameStart, READOUT_SMOOTHING);
    params.fps = lerp(params.fps, frameRate(), READOUT_SMOOTHING);
}
