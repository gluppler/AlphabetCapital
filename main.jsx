import * as THREE from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

import { Raycaster } from 'three/src/core/Raycaster.js';

import topLightVertexShader from './home-top-bg-vertex.glsl?raw';
import topLightFragmentShader from './home-top-bg-fragment.glsl?raw';

import funnelFragmentShader from './funnel-fragment.glsl?raw';

import Stats from 'three/addons/libs/stats.module.js';

import Lenis from 'lenis'

import * as vars from './vars.js';




gsap.registerPlugin(ScrollTrigger, CustomWiggle, CustomEase, MotionPathPlugin);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const stats = new Stats();
document.body.appendChild(stats.dom);


const lenis = new Lenis()
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
})
gsap.ticker.lagSmoothing(0)



const width = window.innerWidth, height = window.innerHeight

var scene;
var camera;
var renderer;
var composer;
var preLoader;


function initThree() {
    initCamera();
    initRenderer();
}


function initPreLoader() {
    initPreLoaderScene();
    initLogo(vars.logoPath);
}

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
function initLogo(url) {
    gltfLoader.load( url, (gltf) => {
        logo = gltf.scene;
        logo.position.y = vars.cameraInitialHeight;
        logo.scale.set(vars.logoInitialScale, vars.logoInitialScale, vars.logoInitialScale);
        preLoader.add(logo);
        logoGsap();
    });
}


function logoGsap() {

    const logoTimeline = gsap.timeline({});

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


function initMainScene() {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(30, 0, 0);
    light.target.position.set(-13, 21, -14);

    scene = new THREE.Scene()
    scene.add(light);
    scene.add(light.target);

    initBloom();
}


function initCamera() {
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 20;
    camera.position.y = vars.cameraInitialHeight;
}


function initRenderer() {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.NoToneMapping;
    document.querySelector('#threejs').appendChild(renderer.domElement)
}


function initBloom() {
    composer = new EffectComposer(renderer);

    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);

    const bloomStrength = 0.2;
    const bloomRadius = 2;
    const bloomThreshold = 1;

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        bloomStrength,
        bloomRadius,
        bloomThreshold
    )

    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloomPass);
    composer.addPass(fxaaPass);
    composer.addPass(new OutputPass());
}


const particleScene = new THREE.Scene();
function initBackgroundParticles(count=700) {
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
        depthTest: false,
        depthWrite: false,
    })

    const points = new THREE.Points(geometry, material)
    particleScene.add(points);
}



async function initCubes() {
    await initInitialCubes();
    await initCircleCubes();
}


const GlowColor = new THREE.Color(0xe7e7e7);
const GlowIntensity = 1.1;
function setupCubeMesh(cube, name) {
    cube.traverse((child) => {
        if (child.isMesh) {
            child.material.emissive = GlowColor;
            child.material.emissiveIntensity = GlowIntensity;
            child.name = name;
        }
    });
}


var initialCubes = []
async function initInitialCubes() {

    for (const initCube of vars.initialCube) {
        const cube = await createCube(initCube.pathToCube);
        cube.position.copy(initCube.position);

        setupCubeMesh(cube, initCube.name);

        cube.rotation.y = getRndNum(-0.8, 0.8);
        cube.rotation.x = getRndNum(-0.8, 0.8);

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


var circleCubes = []

async function initCircleCubes() {

    for (const circleCube of vars.circleCubes) {
        const cube = await createCube(circleCube.pathToCube);
        cube.position.copy(new THREE.Vector3(... vars.funnelToPositionArr));

        setupCubeMesh(cube, circleCube.name);

        circleCubes.push(cube);
    }

}

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


function getRndNum(min, max) {
    return (Math.random() * (max - min) ) + min;
}


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


function initFunnelTunnel() {
    const planeHeight = 15;

    const geometry = new THREE.PlaneGeometry( 16, planeHeight, 200, 30 );
    const positions = geometry.attributes.position;

    function returnNormalizedMagnitude(currentHeight) {
        const normalized = currentHeight/planeHeight + 0.5
        const easedNormalized = Math.pow(normalized, 5); 
        return easedNormalized;
    }

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);

        const curveMagnitude = returnNormalizedMagnitude(y)
        positions.setX(i, x * Math.max(curveMagnitude, 0.002));
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


let mainTimeline = gsap.timeline({scrollTrigger: {
    trigger: '.section-body',
    start: "top top",
    end: "99% bottom",
    scrub: vars.scrubAmount,
}});

function initGsap() {
    gsapBackgroundParallax();


    const cubeTimeline = gsap.timeline({});
    initialCubes.forEach((cube, index) => {

        cubeTimeline.to(cube.position, {
            x: vars.funnelToPosition.x,
            duration: getRndNum(0.3, 1.3),
            ease: CustomEase.create("custom", "M0,0 C0,0 0.3,0.531 0.385,0.722 0.497,0.976 0.577,1.136 0.649,1.059 0.747,0.952 1,1 1,1"),
            delay: getRndNum(0, 0.2),
        }, 0);

        cubeTimeline.to(cube.position, {
            y: vars.funnelToPosition.y,
            z: vars.funnelToPosition.z,
            duration: 3,
            ease: "power2.out",
        }, 0);

        cubeTimeline.to(cube.scale, {
            x: vars.funnelToScale,
            y: vars.funnelToScale,
            z: vars.funnelToScale,
            duration: 2,
        }, 0);

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


    const offsetPerCube = 1/circleCubes.length;
    circleCubes.forEach((cube, index) => {

        mainTimeline.to(cube, {
            visible: true,
            duration: 0.1,
        }, "circle");



        let cubeCircleTimeline = gsap.timeline();
        cubeCircleTimeline.pause();

        cube.visible = false;

        cubeCircleTimeline.to(cube.position, {
            x: vars.circleRadius, 
            ease: CustomEase.create("custom", "M0,0 C0.5,3 0.5,-3 1,0"),
        }, "stack");

        cubeCircleTimeline.to(cube.position, {
            y: vars.circleRadius, 
            ease: CustomEase.create("custom", "M0,0 C0.25,0 0.25,-1 0.5,-1 0.75,-1 0.75,0 1,0"),
        }, "stack");


        let tempProgress = {tempProgress: 0}
        mainTimeline.to(tempProgress, {
            tempProgress: 1,
            onUpdate: function() {
                cubeCircleTimeline.progress(this.progress() * offsetPerCube * (index+1));
            },
            duration: 1.5,
        }, "circle");

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


        mainTimeline.from(cube.rotation, {
            x: 5,
            y: 7,
            z: 5,
            duration: 1.5,
        }, "circle");


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


function renderBackgroundParticles() {
    renderer.autoClear = false;
    renderer.render(particleScene, camera);
    renderer.autoClear = true;
}

function updateUtime() {
    bgMaterial.uniforms.uTime.value += 0.05;
    funnel.uniforms.uTime.value += 0.05;
}


function animate () {
    requestAnimationFrame(animate)

    mouseLook();

    updateUtime();

    composer.render();
    renderBackgroundParticles();

    stats.update();
}

const mouse = new THREE.Vector2();
window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

function mouseLook() {
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, (-mouse.x * Math.PI) / 70, 0.02)
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, (mouse.y * Math.PI) / 70, 0.02)
}


window.addEventListener('click', (e) => {
    checkRaycast()
})



const raycaster = new THREE.Raycaster();
var hoveredCircleCube;
function checkRaycast() {
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(circleCubes);

    if (intersects.length > 0) {
        const hit = intersects[0].object;

        if (hoveredCircleCube && hoveredCircleCube != hit.parent) {
            gsap.to(hoveredCircleCube.scale, {
                x: vars.circleScale,
                y: vars.circleScale,
                z: vars.circleScale,
                duration: 0.5,
                ease: "elastic.out(1, 0.5)",
            });
        }

        hoveredCircleCube = hit.parent;

        gsap.to(hit.parent.scale, {
            x: vars.onCircleHoverScale,
            y: vars.onCircleHoverScale,
            z: vars.onCircleHoverScale,
            duration: 0.5,
            ease: "elastic.out(1, 0.5)",
        });

        hit.emissiveIntensity = GlowIntensity+0.3;
    }
}


var bgMaterial;
var funnel;
async function init() {
    initThree();
    initPreLoader();
    animatePreLoader();
}


function animatePreLoader() {
    if (ready) return;

    requestAnimationFrame(animatePreLoader)

    renderer.render( preLoader, camera );

    stats.update();
}


var ready = false;
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


function onReady() {
    ready = true;
    document.body.style.overflowY = 'visible';
    document.querySelector("#logo-text").style.display = "none";
}



window.addEventListener("load", () => {
    init();
});
