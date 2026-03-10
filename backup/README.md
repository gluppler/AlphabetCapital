# AlphabetCapital

A single-page 3D WebGL portfolio built with Three.js, GSAP, and Lenis smooth scroll.

## Tech Stack

- **Three.js** — 3D rendering, GLB model loading, post-processing
- **GSAP** (CDN) — scroll-driven animations, ScrollTrigger, CustomEase, MotionPathPlugin
- **Lenis** — smooth scroll
- **Vite** — dev server and bundler
- **GLSL** — custom vertex/fragment shaders

## Getting Started

```bash
npm install
npx vite          # dev server at http://localhost:5173
npx vite build    # production build → dist/
npx vite preview  # preview production build
```

## How It Works

1. Preloader plays a logo animation using a temporary scene
2. On completion, the main scene initialises — 10 GLB cube models spawn at random positions
3. Scroll drives a funnel animation collapsing all cubes to center
4. 4 circle cubes expand into a ring formation
5. UnrealBloom + FXAA post-processing applied throughout

## Project Structure

```
main.jsx                  # all Three.js logic (~650 lines)
vars.js                   # all config — positions, scales, model paths, easing values
Cubes.js                  # Cube data class + randomPos() helper
home-top-bg-vertex.glsl   # shared vertex shader (pass-through UVs)
home-top-bg-fragment.glsl # background gradient fragment (Perlin noise, radial fade)
funnel-fragment.glsl      # funnel tunnel fragment (animated flow noise, edge fade)
index.html                # HTML shell — GSAP loaded via CDN here
index.css                 # body bg (#042730), .section-body height (500vh), sticky canvas
img/                      # all GLB models + textures
```

**Available assets in `img/`:**

| File | Used |
|---|---|
| `Logo.glb` | Yes — preloader logo |
| `4PL Innovation Partner.glb` | Yes — initial + circle cubes |
| `AI & Cloud Synergy.glb` | Yes — initial + circle cubes |
| `Deployment.glb` | Yes — initial + circle cubes |
| `Execution Speed (4PL).glb` | Yes — initial + circle cubes |
| `Financial Agility.glb` | Yes — initial cubes |
| `Intelligence-First Design.glb` | Yes — initial cubes |
| `Service Providers.glb` | Yes — initial cubes |
| `Smart Integration.glb` | Yes — initial cubes |
| `Sustainability Built-In.glb` | Yes — initial cubes |
| `Trusted Ecosystem.glb` | Yes — initial cubes |
| `globe.glb` | **No — available for use** |
| `grassy_globe.glb` | **No — available for use** |
| `grass.jpg` | No — available for use |

## Building on the Main Scene

Everything visible lives in a single `THREE.Scene` (`scene`). It is built up in `initMainThree()`, which runs once after the preloader completes. The order matters — objects must be added to `scene` before `initGsap()` animates them, and before `animate()` starts the render loop.

```
initMainScene()                          → scene + DirectionalLight + EffectComposer (Bloom → FXAA → Output)
bgMaterial = initTopBackgroundGradient() → shader plane added to scene (z=1,  y=10)
funnel     = initFunnelTunnel()          → shaped shader plane added to scene (z=15, y=0.5)
await initCubes()                        → all 14 GLB models added to scene (async)
initGsap()                               → scroll timeline wired to existing objects
animate()                                → render loop starts
```

To add something new: write an `init*()` function, call it in `initMainThree()` before `initGsap()`, and follow one of the patterns below.

---

### Pattern 1 — Adding a GLB model via `vars.js`

The simplest way. Add entries to the arrays in `vars.js` and `main.jsx` picks them up automatically — no changes needed there.

```js
// vars.js

// Scattered cubes — spawn at random positions and funnel inward on scroll
export const initialCube = [
    ...
    new Cube(randomPos(), '/img/YourModel.glb'),
];

// Ring cubes — start at funnel center, expand into circle on scroll
export const circleCubes = [
    ...
    new Cube(new THREE.Vector3(...funnelToPositionArr), '/img/YourModel.glb', 'circle cube'),
];
```

`randomPos()` returns a `THREE.Vector3` with x: −25 to 25, y: 15 to 20, z: −27 to 5.

The emissive glow (`GlowColor: 0xe7e7e7`, `GlowIntensity: 1.1`) is applied to every mesh child automatically via `setupCubeMesh()`. This is what makes models catch the UnrealBloom pass — any model added without it will appear flat.

---

### Pattern 2 — Adding a standalone GLB model

For a model that isn't part of the funnel/circle system. Mirrors the `createCube()` pattern: return a `Promise`, call `scene.add()` inside the loader callback, resolve with the object so it can be `await`-ed before `initGsap()` runs.

```js
var myModel;
function initMyModel() {
    return new Promise((resolve) => {
        gltfLoader.load('/img/YourModel.glb', (gltf) => {
            myModel = gltf.scene;
            myModel.position.set(0, 0, 5);
            myModel.scale.setScalar(1);

            // Apply emissive glow so UnrealBloom picks it up
            myModel.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = GlowColor;
                    child.material.emissiveIntensity = GlowIntensity;
                }
            });

            scene.add(myModel);
            resolve(myModel);
        });
    });
}
```

Call it in `initMainThree()` with `await`, before `initGsap()`:

```js
async function initMainThree() {
    initMainScene();
    initBackgroundParticles(500);
    bgMaterial = initTopBackgroundGradient();
    funnel = initFunnelTunnel();
    await initMyModel(); // ← add before initCubes or after, but always before initGsap
    await initCubes();
    initGsap();
    animate();
    onReady();
}
```

---

### Pattern 3 — Adding a shader plane

GLSL files are imported as raw strings via Vite's `?raw` suffix. The shared vertex shader (`home-top-bg-vertex.glsl`) passes UVs through and can be reused for any flat plane. Return the material so `uTime` can be incremented each frame.

```js
import myFragmentShader from './my-shader.glsl?raw';
import topLightVertexShader from './home-top-bg-vertex.glsl?raw';

function initMyPlane() {
    const geometry = new THREE.PlaneGeometry(60, 25);
    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
            uTime:    { value: 0 },
            uOpacity: { value: 0.8 },
            uColor1:  { value: new THREE.Color(0x8ae3ff) },
            uColor2:  { value: new THREE.Color(0x005771) },
        },
        vertexShader: topLightVertexShader,
        fragmentShader: myFragmentShader,
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.position.set(0, 10, 1);
    scene.add(plane);

    return material;
}
```

Wire up `uTime` in `updateUtime()` so it animates each frame:

```js
function updateUtime() {
    bgMaterial.uniforms.uTime.value  += 0.05;
    funnel.uniforms.uTime.value      += 0.05;
    myMaterial.uniforms.uTime.value  += 0.05; // ← add yours
}
```

---

### Adding scroll animations

All scroll-driven motion uses one global `mainTimeline` — a GSAP timeline scrubbed by the `.section-body` ScrollTrigger (500vh, scrub: 1). Add tweens at named labels inside `initGsap()` to sync with existing phases:

- `"funnel-effect"` — while cubes are converging inward
- `"circle"` — while ring formation is expanding

```js
// Inside initGsap()
mainTimeline.to(myObject.position, {
    y: 5,
    duration: 1.5,
}, 'circle');
```

All config values (positions, scales, durations) belong in `vars.js`, imported as `vars.*` in `main.jsx`.

---

## Example: Adding `globe.glb` to the Scene

`globe.glb` and `grassy_globe.glb` are in `img/` but unused — ready to drop in. This is a complete working example using the patterns above.

**`vars.js`** — add at the bottom:

```js
export const globePosition = { x: 0, y: 0, z: 5 };
export const globeScale = 0.5;
```

**`main.jsx`** — add this function near `initCubes`:

```js
var globe;
function initGlobe() {
    return new Promise((resolve) => {
        gltfLoader.load('/img/globe.glb', (gltf) => {
            globe = gltf.scene;
            globe.position.set(vars.globePosition.x, vars.globePosition.y, vars.globePosition.z);
            globe.scale.setScalar(vars.globeScale);

            globe.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = GlowColor;
                    child.material.emissiveIntensity = GlowIntensity;
                }
            });

            gsap.to(globe.rotation, {
                y: Math.PI * 2,
                duration: 8,
                repeat: -1,
                ease: 'none',
            });

            scene.add(globe);
            resolve(globe);
        });
    });
}
```

**`main.jsx` — `initMainThree()`** — call it before `initGsap()`:

```js
async function initMainThree() {
    initMainScene();
    initBackgroundParticles(500);
    bgMaterial = initTopBackgroundGradient();
    funnel = initFunnelTunnel();
    await initGlobe();   // ← add this
    await initCubes();
    initGsap();
    animate();
    onReady();
}
```

**`main.jsx` — `initGsap()`** — add scroll animation (optional):

```js
// Globe rises into view during the circle formation phase
mainTimeline.from(globe.position, {
    y: -20,
    duration: 2,
}, 'circle');
```
