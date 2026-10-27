/**
 * Everything the user places on the planet: ice floes, tornadoes and fish schools. Their lists, and making, deleting,
 * resizing, picking and outlining any of them. What is special about each type is in ice.js, tornado.js and fish.js.
 */

const MIN_ELEMENT_SCALE = 0.4; // Smallest size when scrolling a selected element, 1 = normal
const MAX_ELEMENT_SCALE = 2.5; // Largest size
const SELECTED_COLOR = "#E8A735"; // Gold outline round the selected element
const HOVERED_COLOR = "#65BFD6"; // Blue outline round the element under the pointer

let iceFloes = [];
let tornadoes = [];
let fishSchools = [];

/**
 * Makes a new element of one type, not yet placed.
 * @param {"ice"|"tornado"|"fish"} type - Which kind
 * @param {{longitude: number, fromNorth: number}} spot - Where it is, radians
 * @returns {Object} The element
 */
function makeElement(type, spot) {
    if (type === "ice") {
        return makeIceFloe(spot);
    }
    if (type === "tornado") {
        return makeTornado(spot);
    }

    return makeFishSchool(spot);
}

/**
 * The list the placed elements of one type are kept in.
 * @param {"ice"|"tornado"|"fish"} type - Which kind
 * @returns {Object[]} iceFloes, tornadoes or fishSchools
 */
function elementsOfType(type) {
    if (type === "ice") {
        return iceFloes;
    }
    if (type === "tornado") {
        return tornadoes;
    }

    return fishSchools;
}

/**
 * The elements of one type to draw this frame: the placed ones, and a new one while it is dropped onto the planet.
 * @param {"ice"|"tornado"|"fish"} type - Which kind
 * @returns {Object[]} The elements
 */
function elementsToDraw(type) {
    const dropping = dragState?.isNew && dragState.valid ? dragState.element : null;

    return dropping?.type === type ? [...elementsOfType(type), dropping] : elementsOfType(type);
}

/**
 * Removes an element from the planet.
 * @param {Object} element - A placed element
 */
function deleteElement(element) {
    const elements = elementsOfType(element.type);

    elements.splice(elements.indexOf(element), 1);
    if (element.type === "ice") {
        freeGeometry(element.geometry);
    }
    selectedElement = null;
    hoveredElement = null;
}

/**
 * Makes an element bigger or smaller, within MIN_ELEMENT_SCALE and MAX_ELEMENT_SCALE.
 * @param {Object} element - A placed element
 * @param {number} factor - Above 1 = bigger, below 1 = smaller
 */
function resizeElement(element, factor) {
    const newScale = constrain(element.scale * factor, MIN_ELEMENT_SCALE, MAX_ELEMENT_SCALE);

    if (newScale === element.scale) {
        return;
    }

    element.scale = newScale;

    // Tornadoes and fish are scaled when drawn, a floe's mesh is rebuilt at its new size
    if (element.type === "ice") {
        rebuildFloe(element);
    }
}

/**
 * The element a ray from the pointer hits first.
 * @param {{origin: p5.Vector, direction: p5.Vector}|null} ray - In planet space, see pointerRay()
 * @returns {Object|null} The element, or null if the ray misses them all
 */
function pickElement(ray) {
    if (!ray) {
        return null;
    }

    // Things on the surface are hidden by the planet, with a little room for ice partly under the moving water.
    // Fish are under the see-through water, only the core hides them.
    const waterDistance = raySphereDistance(ray, createVector(0, 0, 0), PLANET_RADIUS);
    const coreDistance = raySphereDistance(ray, createVector(0, 0, 0), params.coreRadius);
    const surfaceLimit = waterDistance === null ? Infinity : waterDistance + PLANET_RADIUS * BUMP_HEIGHT * 2;
    const coreLimit = coreDistance === null ? Infinity : coreDistance;
    const hits = [];

    for (const element of [...iceFloes, ...tornadoes, ...fishSchools]) {
        // The ray in the element's own space, as it was built at the north pole
        const localRay = {
            origin: toSpotSpace(ray.origin, element.spot),
            direction: toSpotSpace(ray.direction, element.spot),
        };
        let distance;
        let limit = surfaceLimit;

        if (element.type === "ice") {
            distance = pickIceFloe(localRay, element);
        } else if (element.type === "tornado") {
            distance = pickTornado(localRay, element);
        } else {
            distance = pickFishSchool(localRay, element);
            limit = coreLimit;
        }

        if (distance !== null && distance < limit) {
            hits.push({ element, distance });
        }
    }

    if (hits.length === 0) {
        return null;
    }

    // Nearest first. If the selected one covers another, pick the one under it instead.
    hits.sort((a, b) => a.distance - b.distance);
    if (hits.length > 1 && hits[0].element === selectedElement) {
        return hits[1].element;
    }

    return hits[0].element;
}

/**
 * Draws an outline round one element, gold when it is selected, blue when it is only under the pointer.
 * @param {Object} element - A placed element, or one being dropped
 * @param {boolean} isSelected - Selected or only hovered
 */
function drawElementOutline(element, isSelected) {
    push();
    moveToSpot(element.spot);
    noFill();
    stroke(isSelected ? SELECTED_COLOR : HOVERED_COLOR);
    strokeWeight(isSelected ? 2.5 : 1.5);
    if (element.type === "ice") {
        drawIceOutline(element);
    } else if (element.type === "tornado") {
        drawTornadoOutline(element);
    } else {
        drawFishOutline(element);
    }
    pop();
}
