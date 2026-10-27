/**
 * The pointer and the keyboard: picking, selecting, dragging, resizing and deleting elements, and the hint at the
 * bottom. The canvas pixel under the pointer is turned into a ray through the scene, and every position found with it
 * is kept as a spot on the planet, so it stays right however the camera turns or zooms.
 */

const SCROLL_RESIZE_SPEED = 0.0008; // How fast scrolling resizes the selected element, per wheel pixel
const ELEMENT_NAMES = { ice: "Ice floe", tornado: "Tornado", fish: "Fish school" }; // For the hint

const pointer = { x: -1, y: -1, clientX: -1, clientY: -1 }; // Canvas pixels, and page pixels for the page itself
let selectedElement = null;
let hoveredElement = null; // The element under the pointer, found every frame
let dragState = null; // The element being dragged and how, see startDrag()
let planetToScreen = null; // Turns planet space into canvas pixels, the camera, the zoom and the spin together
let screenToPlanet = null; // The other way round

/**
 * Listens to the pointer on the canvas and to the keyboard. Dragging out of the palette is set up in palette.js.
 */
function setupInteraction() {
    const canvas = sceneRenderer.elt;

    canvas.style.cursor = "grab";

    // Pressing on an element starts dragging it, pressing on empty water lets p5 orbit the camera
    canvas.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || dragState || event.isPrimary === false) {
            return;
        }

        updatePointer(event);

        const element = pickElement(pointerRay(pointer.x, pointer.y));

        if (element) {
            event.preventDefault(); // Stops the mouse event that would also start p5's camera orbit
            startDrag(element, false, event, canvas);
        } else {
            selectedElement = null;
        }
    });

    // Scrolling resizes the selected element instead of zooming.
    // Stopping it here keeps the event from reaching p5's listener on window.
    canvas.addEventListener(
        "wheel",
        (event) => {
            if (!selectedElement || dragState) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            resizeElement(selectedElement, Math.exp(-event.deltaY * SCROLL_RESIZE_SPEED));
        },
        { passive: false },
    );

    window.addEventListener("pointermove", (event) => {
        if (event.isPrimary === false || (dragState && event.pointerId !== dragState.pointerId)) {
            return;
        }

        updatePointer(event);

        if (!dragState) {
            return;
        }

        // The release was missed, e.g. a trackpad that loses pointer capture before pointerup
        if (event.buttons === 0) {
            updateDrag();
            finishDrag(false);
            return;
        }

        if (Math.hypot(pointer.x - dragState.startX, pointer.y - dragState.startY) > 4) {
            dragState.moved = true;
        }
        updateDrag();
    });

    window.addEventListener("pointerup", (event) => {
        if (!dragState || event.pointerId !== dragState.pointerId) {
            return;
        }

        updatePointer(event);
        updateDrag(); // Uses the actual release position, even without a final move event
        finishDrag(false);
    });

    window.addEventListener("pointercancel", (event) => {
        if (dragState?.pointerId === event.pointerId) {
            finishDrag(true);
        }
    });

    window.addEventListener("blur", () => {
        if (dragState) {
            finishDrag(true);
        }
        isUsingPanel = false;
    });

    window.addEventListener("keydown", (event) => {
        // Escape cancels a drag, or else deselects
        if (event.key === "Escape") {
            if (dragState) {
                finishDrag(true);
            } else {
                selectedElement = null;
            }
        }

        // Backspace or Delete removes the selected element, but not while typing in the panel
        const isTyping = event.target.closest("input, textarea");

        if ((event.key === "Backspace" || event.key === "Delete") && selectedElement && !dragState && !isTyping) {
            event.preventDefault();
            deleteElement(selectedElement);
        }
    });
}

/**
 * Keeps where the pointer is, in canvas pixels and page pixels.
 * @param {PointerEvent} event - Any pointer event
 */
function updatePointer(event) {
    const rect = sceneRenderer.elt.getBoundingClientRect();

    pointer.clientX = event.clientX;
    pointer.clientY = event.clientY;
    pointer.x = ((event.clientX - rect.left) / rect.width) * width;
    pointer.y = ((event.clientY - rect.top) / rect.height) * height;
}

/**
 * Whether the pointer is over the palette, the panel or the sound button rather than the scene.
 * @returns {boolean}
 */
function pointerOverInterface() {
    const target = document.elementFromPoint(pointer.clientX, pointer.clientY);

    return Boolean(target?.closest(".element-palette, .lil-gui, .sound-button"));
}

/**
 * A ray from the camera through a canvas pixel, into planet space.
 * @param {number} x - Canvas pixels
 * @param {number} y - Canvas pixels
 * @returns {{origin: p5.Vector, direction: p5.Vector}|null} The ray, or null before the first frame
 */
function pointerRay(x, y) {
    if (!screenToPlanet) {
        return null;
    }

    // The pixel on the nearest and the farthest depth p5 draws, its screen depth runs from 0 to 1
    const near = screenToPlanet.multiplyAndNormalizePoint(createVector(x, y, 0));
    const far = screenToPlanet.multiplyAndNormalizePoint(createVector(x, y, 1));

    return { origin: near, direction: p5.Vector.sub(far, near).normalize() };
}

/**
 * Stops the camera drifting on after an orbit, so it doesn't move under an element being dragged.
 */
function stopOrbitMotion() {
    sceneRenderer.rotateVelocity.set(0, 0, 0);
    sceneRenderer.moveVelocity.set(0, 0, 0);
    sceneRenderer.zoomVelocity = 0;
}

/**
 * Starts dragging an element, a new one out of the palette or one already on the planet.
 * @param {Object} element - The element
 * @param {boolean} isNew - true for a new one out of the palette
 * @param {PointerEvent} event - The pointerdown that started it
 * @param {Element} source - The page element that got the pointerdown, it keeps the pointer until the release
 */
function startDrag(element, isNew, event, source) {
    stopOrbitMotion();

    // Where the element is on the screen, so the grab point keeps the same offset from it, even on a tall tornado
    const radius = element.type === "fish" ? fishOrbitRadius() : PLANET_RADIUS;
    const centre = planetToScreen.multiplyAndNormalizePoint(
        sphereDirection(element.spot.longitude, element.spot.fromNorth).mult(radius),
    );

    dragState = {
        element: element,
        isNew: isNew,
        source: source,
        pointerId: event.pointerId,
        originalSpot: { ...element.spot }, // Put back there if the drag is cancelled
        previousSelected: selectedElement,
        startX: pointer.x,
        startY: pointer.y,
        offsetX: isNew ? 0 : pointer.x - centre.x,
        offsetY: isNew ? 0 : pointer.y - centre.y,
        moved: false, // An existing element only moves once the pointer has, so a click just selects it
        valid: !isNew, // Over the planet, where it can be dropped
    };
    selectedElement = element;
    hoveredElement = null;
    source.setPointerCapture(event.pointerId);
    source.classList.add("is-dragging");
    document.body.classList.add("is-placing");
    document.querySelector("#drag-preview img").src = document.getElementById(`${element.type}-thumbnail`).src;
    updateDrag();
}

/**
 * Moves the dragged element to the spot under the pointer, if the pointer is over the planet.
 * Off the planet, a new element shows as a picture following the pointer instead.
 */
function updateDrag() {
    if (!dragState) {
        return;
    }

    const state = dragState;
    const preview = document.getElementById("drag-preview");

    if (!state.isNew && !state.moved) {
        return;
    }

    const ray = pointerRay(pointer.x - state.offsetX, pointer.y - state.offsetY);
    const distance = ray ? raySphereDistance(ray, createVector(0, 0, 0), PLANET_RADIUS) : null;
    const isOnCanvas = pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;

    state.valid = distance !== null && isOnCanvas && !pointerOverInterface();
    if (state.valid) {
        // Fish go into the water where they swim, everything else onto the surface
        const direction =
            state.element.type === "fish"
                ? rayHitDirection(ray, fishOrbitRadius())
                : p5.Vector.add(ray.origin, p5.Vector.mult(ray.direction, distance)).normalize();

        state.element.spot = directionToSpot(direction);
    }

    preview.hidden = !state.isNew || state.valid;
    preview.style.left = `${pointer.clientX}px`;
    preview.style.top = `${pointer.clientY}px`;
}

/**
 * Ends a drag: places a new element, or keeps a moved one where it is, or puts things back when it is cancelled
 * or released off the planet.
 * @param {boolean} cancelled - true for Escape, a lost window or a cancelled pointer
 */
function finishDrag(cancelled) {
    const state = dragState;

    if (!state) {
        return;
    }

    if (cancelled || !state.valid) {
        if (state.isNew && state.element.type === "ice") {
            freeGeometry(state.element.geometry);
        }
        if (!state.isNew) {
            state.element.spot = state.originalSpot;
        }
        selectedElement = state.previousSelected;
    } else if (state.isNew) {
        elementsOfType(state.element.type).push(state.element);
    }

    // Clear the state before releasing the pointer, which can itself send an event
    dragState = null;
    state.source.classList.remove("is-dragging");
    if (state.source.hasPointerCapture(state.pointerId)) {
        state.source.releasePointerCapture(state.pointerId);
    }
    document.body.classList.remove("is-placing");
    document.getElementById("drag-preview").hidden = true;
    stopOrbitMotion();
}

/**
 * Once a frame, after the camera, the zoom and the spin are set: keeps the screen matrices, follows a drag,
 * finds the element under the pointer and updates the hint.
 */
function updateInteraction() {
    planetToScreen = sceneRenderer.getWorldToScreenMatrix();
    screenToPlanet = planetToScreen.copy().invert(planetToScreen);

    if (dragState) {
        updateDrag();
        if (dragState.valid) {
            showHint("Release to place · Esc to cancel");
        } else {
            showHint("Move onto the planet · Release outside to cancel");
        }
        return;
    }

    hoveredElement = pointerOverInterface() ? null : pickElement(pointerRay(pointer.x, pointer.y));

    const element = hoveredElement || selectedElement;

    if (!element) {
        showHint("Drag the planet to orbit · Scroll to zoom");
    } else if (element === selectedElement) {
        showHint(`${ELEMENT_NAMES[element.type]} selected · Scroll to resize · Backspace to delete · Drag to move`);
    } else {
        showHint(`${ELEMENT_NAMES[element.type]} · Click to select · Drag to move`);
    }
}

/**
 * Outlines the selected element, or else the one under the pointer. A new element being dragged is only outlined
 * once it is over the planet.
 */
function drawHighlight() {
    const isOffPlanet = dragState?.isNew && !dragState.valid;

    if (selectedElement && !isOffPlanet) {
        drawElementOutline(selectedElement, true);
    } else if (hoveredElement) {
        drawElementOutline(hoveredElement, false);
    }
}

/**
 * Shows a line of help at the bottom of the window.
 * @param {string} text - The help
 */
function showHint(text) {
    const hint = document.getElementById("interaction-hint");

    if (hint.textContent !== text) {
        hint.textContent = text;
    }
}
