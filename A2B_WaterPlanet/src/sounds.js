/**
 * Sound: background music, played and paused by the button at the top left, and a short sound effect when an
 * element is picked up from the palette. The effects are short clips cut from longer recordings, saved in assets/sfx.
 */

const MUSIC_FILE = "assets/background-music.mp3"; // Played on a loop while the sound is on

// One clip for each element type, played when it is picked up from the palette
const SOUND_FILES = {
    ice: "assets/sfx/ice.mp3", // A clink of ice, 0.37 s
    tornado: "assets/sfx/wind.mp3", // A short gust of wind, 1.5 s
    fish: "assets/sfx/fish.mp3", // Bubbling water, fading out slowly, 1.76 s
};

let music;
let soundButton;
const sounds = {};

// Loaded straight away, so the first pick-up already has its sound
for (const name in SOUND_FILES) {
    sounds[name] = new Audio(SOUND_FILES[name]);
    sounds[name].preload = "auto";
}

/**
 * Loads the music and makes the sound button. The music starts paused, browsers only play sound after a click.
 */
function makeMusic() {
    music = createAudio(MUSIC_FILE);
    music.volume(params.musicVolume);
    soundButton = createButton("🔇");
    soundButton.class("sound-button");
    soundButton.mousePressed(toggleMusic);
}

/**
 * Plays or pauses the music when the sound button is clicked, and swaps its icon.
 */
function toggleMusic() {
    if (music.elt.paused) {
        music.loop();
        soundButton.html("🔊");
    } else {
        music.pause();
        soundButton.html("🔇");
    }
}

/**
 * Plays one sound effect. A copy is played, so the same clip can overlap itself.
 * @param {string} name - A key of SOUND_FILES
 */
function playSound(name) {
    const sound = sounds[name].cloneNode();

    sound.volume = params.effectsVolume;
    sound.play().catch(() => {}); // A missing or blocked sound must not stop the interaction
}
