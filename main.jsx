// ─── Imports ──────────────────────────────────────────────────────────────────

import * as THREE from 'three'

// Loaders — GLTFLoader handles .glb files; DRACOLoader decompresses DRACO-compressed meshes
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Post-processing pipeline
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// FXAA anti-aliasing pass
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

import { Raycaster } from 'three/src/core/Raycaster.js';

// GLSL shaders — imported as raw strings by Vite via the ?raw suffix
import topLightVertexShader from './home-top-bg-vertex.glsl?raw';
import topLightFragmentShader from './home-top-bg-fragment.glsl?raw';
import funnelFragmentShader from './funnel-fragment.glsl?raw';

import Stats from 'three/addons/libs/stats.module.js';

import Lenis from 'lenis'

// All animation constants, camera values, model paths, and easing params
import * as vars from './vars.js';


// ─── Setup ────────────────────────────────────────────────────────────────────

// GSAP is loaded via CDN in index.html — register premium plugins before use
gsap.registerPlugin(ScrollTrigger, CustomWiggle, CustomEase, MotionPathPlugin);

// DRACO decoder hosted by Google — decompresses geometry in GLB files
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Performance stats overlay (FPS, memory) — visible in the corner during development
const stats = new Stats();
document.body.appendChild(stats.dom);

// Lenis smooth scroll — synced to GSAP's ticker so ScrollTrigger stays accurate
const lenis = new Lenis()
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
})
gsap.ticker.lagSmoothing(0)

const width = window.innerWidth, height = window.innerHeight


// ─── Global Scene Variables ───────────────────────────────────────────────────

var scene;      // main Three.js scene — everything portfolio-related lives here
var camera;     // shared across all render passes
var renderer;   // single WebGLRenderer instance
var composer;   // EffectComposer — runs the post-processing pipeline
var preLoader;  // temporary scene used only during the logo animation


// ─── Bootstrap ────────────────────────────────────────────────────────────────

// Creates camera and renderer before anything else
function initThree() {
    initCamera();
    initRenderer();
}


// ─── Scene 1 (First): Preloader ───────────────────────────────────────────────

// Sets up the temporary preloader scene and loads the logo model
function initPreLoader() {
    initPreLoaderScene();
    initLogo(vars.logoPath);
}

// Preloader gets its own scene with brighter lighting to make the logo pop
function initPreLoaderScene() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);

    const dirLight = new THREE.DirectionalLight(0xffffff, 10);
    dirLight.position.set(15, 15, 2);
    dirLight.lookAt(10, 10, 0);

    preLoader = new THREE.Scene()
    preLoader.add(dirLight);
    preLoader.add(ambientLight);
}

var logo;
// Loads Logo.glb, positions it at camera height, then kicks off the animation
function initLogo(url) {
    gltfLoader.load( url, (gltf) => {
        logo = gltf.scene;
        logo.position.y = vars.cameraInitialHeight;
        logo.scale.set(vars.logoInitialScale, vars.logoInitialScale, vars.logoInitialScale);
        preLoader.add(logo);
        logoGsap();
    });
}

// Logo intro animation — two label groups play in parallel:
// "scaleDown" — scale, position, and spin all animate together on entry
// "slide-left" — logo slides left while the logo-text image reveals beside it
// onComplete of "slide-left" triggers the main scene initialisation
function logoGsap() {

    const logoTimeline = gsap.timeline({});

    // Scale, drift in from offset position, and spin — all start together at "scaleDown"
    logoTimeline.from(logo.scale, {
        x: vars.logoGsapInitialScale,
        y: vars.logoGsapInitialScale,
        z: vars.logoGsapInitialScale,
        duration: 1,
        ease: "power2.out",
    }, "scaleDown");

    logoTimeline.from(logo.position, {
        x: vars.logoGsapInitialX,
        z: vars.logoGsapInitialZ,
        duration: 1,
        ease: "power2.out",
    }, "scaleDown");

    logoTimeline.from(logo.rotation, {
        y: Math.PI * 2,
        duration: 1,
        delay: 0.2,
        ease: "power2.inOut",
    }, "scaleDown");

    // Logo slides left; logo-text image reveals simultaneously at "slide-left"
    // onComplete kicks off the main scene — the preloader is done at this point
    logoTimeline.to(logo.position, {
        x: vars.logoInitialX,
        duration: 1,
        delay: 0.1,
        ease: "power3.inOut",

        onStart: () => {
            document.querySelector("#logo-text").style.display = "block";
        },
        onComplete: () => {
            initMainThree();
        }

    }, "slide-left");

    logoTimeline.from("#logo-text", {
        width: 0,
        duration: 0.8,
        delay: 0.2,
        ease: "power3.inOut",
    }, "slide-left");

}


// ─── Main Scene ───────────────────────────────────────────────────────────────

// Creates the one main scene, adds a directional light, and sets up post-processing
function initMainScene() {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(30, 0, 0);
    light.target.position.set(-13, 21, -14);

    scene = new THREE.Scene()
    scene.add(light);
    scene.add(light.target); // target must be added to scene for lookAt to work

    initBloom();
}


// ─── Camera ───────────────────────────────────────────────────────────────────

// FOV 60, positioned at z=20 and y=cameraInitialHeight — shared across all scenes
function initCamera() {
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 20;
    camera.position.y = vars.cameraInitialHeight;
}


// ─── Renderer ─────────────────────────────────────────────────────────────────

// Alpha transparent background lets the CSS body colour (#042730) show through
function initRenderer() {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.NoToneMapping; // tone mapping off — shaders handle colour output
    document.querySelector('#threejs').appendChild(renderer.domElement)
}


// ─── Post-processing ──────────────────────────────────────────────────────────

// Pipeline order: RenderPass → UnrealBloomPass → FXAAShader → OutputPass
function initBloom() {
    composer = new EffectComposer(renderer);

    // FXAA — full-screen anti-aliasing pass; resolution must be set in pixel units
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);

    const bloomStrength = 0.2;  // intensity of the bloom glow
    const bloomRadius = 2;      // spread of the bloom
    const bloomThreshold = 1;   // only pixels brighter than this value bloom — emissive materials exceed it

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        bloomStrength,
        bloomRadius,
        bloomThreshold
    )

    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloomPass);
    composer.addPass(fxaaPass);
    composer.addPass(new OutputPass()); // converts linear colour to sRGB for display
}


// ─── Scene 2: Background Particles ────────────────────────────────────────────

// Separate scene so particles are composited without going through the bloom pass
const particleScene = new THREE.Scene();
function initBackgroundParticles(count=700) {
    // Build a flat Float32Array of xyz positions for all particles
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
        const i3 = i * 3
        positions[i3 + 0] = (Math.random() - 0.5) * 30
        positions[i3 + 1] = (Math.random() - 0.5) * 30
        positions[i3 + 2] = (Math.random() - 0.5) * 30
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.025,
        sizeAttenuation: true,
        depthTest: false,  // prevents particles from clipping against 3D objects
        depthWrite: false,
    })

    const points = new THREE.Points(geometry, material)
    particleScene.add(points);
}


// ─── Scene 3: Background Gradient ─────────────────────────────────────────────

// Large shader plane positioned behind everything (z=1, y=10)
// Returns the material so uTime can be updated each frame in updateUtime()
function initTopBackgroundGradient() {
    const geometry = new THREE.PlaneGeometry( 60, 25 );
    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0.4 },
            uColor1: { value: new THREE.Color(0x8ae3ff) },
            uColor2: { value: new THREE.Color(0x005771) },
        },

        vertexShader: topLightVertexShader,
        fragmentShader: topLightFragmentShader,
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.position.z = 1;
    plane.position.y = 10;
    scene.add(plane);

    return material;
}


// ─── Scene 4: Funnel Tunnel ────────────────────────────────────────────────────

// Funnel-shaped plane sitting in front of the scene (z=15, y=0.5)
// Geometry is deformed by hand — each vertex's x is scaled by a power-5 curve
// based on its y position, pinching the bottom and widening the top like a funnel mouth
// Returns the material so uTime can be updated each frame in updateUtime()
function initFunnelTunnel() {
    const planeHeight = 15;

    const geometry = new THREE.PlaneGeometry( 16, planeHeight, 200, 30 );
    const positions = geometry.attributes.position;

    // Maps a vertex's y position to a 0–1 magnitude along a power-5 ease curve
    function returnNormalizedMagnitude(currentHeight) {
        const normalized = currentHeight/planeHeight + 0.5
        const easedNormalized = Math.pow(normalized, 5);
        return easedNormalized;
    }

    // Displaces each vertex's x by the curve magnitude — creates the funnel silhouette
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);

        const curveMagnitude = returnNormalizedMagnitude(y)
        positions.setX(i, x * Math.max(curveMagnitude, 0.002)); // 0.002 minimum prevents zero-width at the tip
    }

    positions.needsUpdate = true;

    const material = new THREE.ShaderMaterial({
        transparent: true,

        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0.9 },
            uColor1: { value: new THREE.Color(0x00c3ff) },
            uColor2: { value: new THREE.Color(0x7ce0ff) },
        },

        vertexShader: topLightVertexShader,
        fragmentShader: funnelFragmentShader,
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.position.z = 15;
    plane.position.y = 0.5;
    scene.add(plane);

    return material;
}


// ─── Scene 5: Cubes ────────────────────────────────────────────────────────────

// Loads both cube groups sequentially — initial cubes must finish before circle cubes start
async function initCubes() {
    await initInitialCubes();
    await initCircleCubes();
}

// Emissive values applied to all cube mesh children so they exceed the bloom threshold
const GlowColor = new THREE.Color(0xe7e7e7);
const GlowIntensity = 1.1;
// Traverses the GLB scene graph and sets emissive on every mesh child
function setupCubeMesh(cube, name) {
    cube.traverse((child) => {
        if (child.isMesh) {
            child.material.emissive = GlowColor;
            child.material.emissiveIntensity = GlowIntensity;
            child.name = name; // used later for raycasting identification
        }
    });
}

// The 10 initial cubes that scatter across the scene and funnel inward on scroll
var initialCubes = []
async function initInitialCubes() {

    for (const initCube of vars.initialCube) {
        const cube = await createCube(initCube.pathToCube);
        cube.position.copy(initCube.position); // randomPos() positions defined in vars.js

        setupCubeMesh(cube, initCube.name);

        // Random initial rotation so each cube starts in a different orientation
        cube.rotation.y = getRndNum(-0.8, 0.8);
        cube.rotation.x = getRndNum(-0.8, 0.8);

        // Idle wobble — loops forever, independent of the scroll timeline
        gsap.to(cube.rotation, {
            y: "+=" + getRndNum(-0.8, 0.8),
            x: "+=" + getRndNum(-0.8, 0.8),
            duration: getRndNum(4, 7),
            yoyo: true,
            repeat: -1,
            ease: "power1.inOut",
        });

        initialCubes.push(cube);
    }
}

// The 4 circle cubes — loaded at the funnel center position, hidden until the circle phase
var circleCubes = []
async function initCircleCubes() {

    for (const circleCube of vars.circleCubes) {
        const cube = await createCube(circleCube.pathToCube);
        cube.position.copy(new THREE.Vector3(... vars.funnelToPositionArr));

        setupCubeMesh(cube, circleCube.name);

        circleCubes.push(cube);
    }

}

// Promise-based GLB loader — adds the loaded model to scene and resolves with it
// Must be awaited so initGsap() can animate the returned object immediately after
function createCube(url) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(
            url,
            (gltf) => {
                const cube = gltf.scene;
                scene.add(cube);
                resolve(cube);
            },
        );
    });
}

// Returns a random float between min and max
function getRndNum(min, max) {
    return (Math.random() * (max - min) ) + min;
}


// ─── Scroll Timeline ──────────────────────────────────────────────────────────

// One global GSAP timeline scrubbed by scroll — covers the full 500vh of .section-body
// All scroll-driven animations are added to this timeline at named labels
let mainTimeline = gsap.timeline({scrollTrigger: {
    trigger: '.section-body',
    start: "top top",
    end: "99% bottom",
    scrub: vars.scrubAmount,
}});

function initGsap() {
    gsapBackgroundParallax();


    // ── Scene 5: Funnel Phase ("funnel-effect" label) ─────────────────────────
    // Each initial cube moves to the funnel center, shrinks, then hides
    // All 10 cube sub-timelines are added at the same label so they play together
    const cubeTimeline = gsap.timeline({});
    initialCubes.forEach((cube, index) => {

        // x uses a custom ease that overshoots slightly before settling — elastic feel
        cubeTimeline.to(cube.position, {
            x: vars.funnelToPosition.x,
            duration: getRndNum(0.3, 1.3),
            ease: CustomEase.create("custom", "M0,0 C0,0 0.3,0.531 0.385,0.722 0.497,0.976 0.577,1.136 0.649,1.059 0.747,0.952 1,1 1,1"),
            delay: getRndNum(0, 0.2),
        }, 0);

        // y and z on a separate tween at position 0 so all three axes animate simultaneously
        cubeTimeline.to(cube.position, {
            y: vars.funnelToPosition.y,
            z: vars.funnelToPosition.z,
            duration: 3,
            ease: "power2.out",
        }, 0);

        // Scale down to near-zero so cubes appear to disappear into the funnel tip
        cubeTimeline.to(cube.scale, {
            x: vars.funnelToScale,
            y: vars.funnelToScale,
            z: vars.funnelToScale,
            duration: 2,
        }, 0);

        // Hide once fully funnelled; onReverseComplete resets position for clean scroll-back
        cubeTimeline.to(cube, {
            visible: false,
            duration: 0.1,
            onReverseComplete: () => {
                cube.position.x = vars.funnelToPosition.x;
                cube.position.y = vars.funnelToPosition.y;
            },
        });

        mainTimeline.add(cubeTimeline, "funnel-effect");

    });


    // ── Scene 6: Circle Formation ("circle" label) — Currently Last ───────────
    // Circle cubes expand outward from the funnel center into a ring formation
    const offsetPerCube = 1/circleCubes.length; // stagger fraction so each cube reaches the ring at a different scroll position
    circleCubes.forEach((cube, index) => {

        // Make visible at the start of the circle phase
        mainTimeline.to(cube, {
            visible: true,
            duration: 0.1,
        }, "circle");

        // cubeCircleTimeline defines the x/y arc motion for one cube
        // Kept paused and driven manually via tempProgress below
        let cubeCircleTimeline = gsap.timeline();
        cubeCircleTimeline.pause();

        cube.visible = false; // start hidden; mainTimeline reveals it at "circle"

        // x overshoots past the radius and bounces back — custom ease mimics a spring
        cubeCircleTimeline.to(cube.position, {
            x: vars.circleRadius,
            ease: CustomEase.create("custom", "M0,0 C0.5,3 0.5,-3 1,0"),
        }, "stack");

        // y arcs upward then back down to radius — creates a curved outward trajectory
        cubeCircleTimeline.to(cube.position, {
            y: vars.circleRadius,
            ease: CustomEase.create("custom", "M0,0 C0.25,0 0.25,-1 0.5,-1 0.75,-1 0.75,0 1,0"),
        }, "stack");

        // tempProgress is a dummy object — its onUpdate manually drives cubeCircleTimeline.progress()
        // offsetPerCube * (index+1) staggers each cube so they reach the ring at different scroll positions
        let tempProgress = {tempProgress: 0}
        mainTimeline.to(tempProgress, {
            tempProgress: 1,
            onUpdate: function() {
                cubeCircleTimeline.progress(this.progress() * offsetPerCube * (index+1));
            },
            duration: 1.5,
        }, "circle");

        // Scale grows from the tiny funnel scale back up to full circle scale
        mainTimeline.fromTo(
            cube.scale,
            {
                x: vars.funnelToScale,
                y: vars.funnelToScale,
                z: vars.funnelToScale,
            },
            {
                x: vars.circleScale,
                y: vars.circleScale,
                z: vars.circleScale,
                ease: "power2.in",
                duration: 1.5,
            },

            "circle"
        );

        // Rotation tumbles in from an exaggerated offset for a dramatic reveal
        mainTimeline.from(cube.rotation, {
            x: 5,
            y: 7,
            z: 5,
            duration: 1.5,
        }, "circle");

        // Idle wobble for circle cubes — created paused, restarted once the circle phase completes
        // onReverseComplete re-pauses it if the user scrolls back through the timeline
        const idleRotate = gsap.to(cube.rotation, {
            y: "+=" + getRndNum(-0.5, 0.5),
            x: "+=" + getRndNum(-0.5, 0.5),
            duration: getRndNum(4, 7),
            yoyo: true,
            repeat: -1,
            ease: "power1.inOut",
        });
        idleRotate.pause();

        let temp = {temp: 0}
        mainTimeline.to( temp, {
            onComplete: () => {
                idleRotate.restart()
            },
            onReverseComplete: () => {
                idleRotate.pause()
            },
            duration: 0.01,
        });

    });
}


// ─── Camera Parallax ──────────────────────────────────────────────────────────

// Camera drifts down from y=10 to y=-10 over the full scroll — creates depth parallax
function gsapBackgroundParallax() {
    gsap.to(camera.position, {
        y: -10,
        scrollTrigger: {
            trigger: '.section-body',
            start: "top top",
            end: "99% bottom",
            scrub: vars.scrubAmount,
        }
    });
}


// ─── Render Helpers ───────────────────────────────────────────────────────────

// Renders particleScene on top of the composer output without clearing the framebuffer
// autoClear=false keeps the composer result; particles are then drawn over it
function renderBackgroundParticles() {
    renderer.autoClear = false;
    renderer.render(particleScene, camera);
    renderer.autoClear = true;
}

// Increments uTime for all animated shader materials each frame
function updateUtime() {
    bgMaterial.uniforms.uTime.value += 0.05;
    funnel.uniforms.uTime.value += 0.05;
}


// ─── Render Loop ──────────────────────────────────────────────────────────────

// Order matters:
// 1. mouseLook — updates camera rotation toward mouse position
// 2. updateUtime — advances shader animations
// 3. composer.render — renders main scene with full post-processing pipeline
// 4. renderBackgroundParticles — composites particles on top without post-processing
function animate () {
    requestAnimationFrame(animate)

    mouseLook();

    updateUtime();

    composer.render();
    renderBackgroundParticles();

    stats.update();
}


// ─── Mouse Tracking ───────────────────────────────────────────────────────────

// Tracks mouse in normalised device coordinates (-1 to +1) used by both mouseLook and raycasting
const mouse = new THREE.Vector2();
window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

// Lerps camera rotation toward mouse — subtle parallax look-around effect
// Divided by 70 keeps the rotation small so it feels like a gentle tilt, not full mouse-look
function mouseLook() {
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, (-mouse.x * Math.PI) / 70, 0.02)
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, (mouse.y * Math.PI) / 70, 0.02)
}


// ─── Raycasting / Click Interaction ──────────────────────────────────────────

window.addEventListener('click', (e) => {
    checkRaycast()
})

const raycaster = new THREE.Raycaster();
var hoveredCircleCube; // tracks the last clicked cube so it can be reset on the next click

// Casts a ray from camera through the current mouse position
// Only tests against circleCubes — the ring formation — not the initial scattered cubes
function checkRaycast() {
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(circleCubes);

    if (intersects.length > 0) {
        const hit = intersects[0].object;

        // Reset the previously clicked cube to normal scale before scaling the new one
        if (hoveredCircleCube && hoveredCircleCube != hit.parent) {
            gsap.to(hoveredCircleCube.scale, {
                x: vars.circleScale,
                y: vars.circleScale,
                z: vars.circleScale,
                duration: 0.5,
                ease: "elastic.out(1, 0.5)",
            });
        }

        hoveredCircleCube = hit.parent; // hit.parent is the GLB root; hit itself is the mesh child

        // Scale up the clicked cube with an elastic bounce
        gsap.to(hit.parent.scale, {
            x: vars.onCircleHoverScale,
            y: vars.onCircleHoverScale,
            z: vars.onCircleHoverScale,
            duration: 0.5,
            ease: "elastic.out(1, 0.5)",
        });

        // Brighten emissive on the hit mesh to give a selection highlight
        hit.emissiveIntensity = GlowIntensity+0.3;
    }
}


// ─── Initialisation ───────────────────────────────────────────────────────────

// Material references kept at module scope so updateUtime() can reach them each frame
var bgMaterial;
var funnel;

// Entry point — sets up renderer and camera, starts preloader, begins preloader render loop
async function init() {
    initThree();
    initPreLoader();
    animatePreLoader();
}

// Preloader render loop — runs until ready=true, which is set by onReady() after the main scene loads
function animatePreLoader() {
    if (ready) return;

    requestAnimationFrame(animatePreLoader)

    renderer.render( preLoader, camera );

    stats.update();
}

var ready = false;
// Called by logoGsap() onComplete — builds and starts the main scene
// Order is critical: all objects must be in scene before initGsap() animates them
async function initMainThree() {
    initMainScene();
    initBackgroundParticles(500);
    bgMaterial = initTopBackgroundGradient();
    funnel = initFunnelTunnel()
    await initCubes()

    initGsap();

    animate()

    onReady();
}

// Unlocks page scroll and cleans up preloader UI once the main scene is ready
function onReady() {
    ready = true;
    document.body.style.overflowY = 'visible';
    document.querySelector("#logo-text").style.display = "none";
}


// Kicks off everything on page load
window.addEventListener("load", () => {
    init();
});
