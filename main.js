import * as THREE from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

import topLightVertexShader from './home-top-bg-vertex.glsl?raw';
import topLightFragmentShader from './home-top-bg-fragment.glsl?raw';

import funnelFragmentShader from './funnel-fragment.glsl?raw';

import Stats from 'three/addons/libs/stats.module.js';

import * as vars from './vars.js';



gsap.registerPlugin(ScrollTrigger, CustomWiggle, CustomEase, MotionPathPlugin);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const stats = new Stats();
document.body.appendChild(stats.dom);



const width = window.innerWidth, height = window.innerHeight

var scene;
var camera;
var renderer;
var composer;

function initThree() {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x042730);

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.z = 20
    camera.position.y = 10

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.NoToneMapping;
    document.querySelector('#threejs').appendChild(renderer.domElement)

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(30, 0, 0);
    light.target.position.set(-13, 21, -14);
    scene.add(light);
    scene.add(light.target);

    initBloom();
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

var cubes = []

async function initCubes() {

    for (const cubePosition of vars.initialCubePositions) {
        const cube = await createCube(vars.pathToCube);
        cube.position.set(cubePosition[0], cubePosition[1], cubePosition[2]);

        cube.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0xe7e7e7);
                child.material.emissiveIntensity = 1.1;
            }
        });

        gsap.to(cube.rotation, {
            y: "+=0.3",
            x: "+=0.5",
            duration: 5,
            yoyo: true,
            repeat: -1,
            ease: "power1.inOut",
        });

        cubes.push(cube);
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

    const geometry = new THREE.PlaneGeometry( 12, planeHeight, 200, 30 );
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


function returnFunnelFunction() {
}


let mainTimeline = gsap.timeline({scrollTrigger: {trigger: '.section-body', start: "top top", end: "99% bottom", scrub: vars.scrubAmount, markers: true}});
function initGsap() {
    gsapBackgroundParallax();

    const offsetPerCube = 1/cubes.length;

    cubes.forEach((cube, index) => {
        mainTimeline.to(cube.position, {x: vars.funnelToPosition.x, duration: 0.7, ease: "circ.out"}, "funnel-effect");
        mainTimeline.to(cube.position, {y: vars.funnelToPosition.y, z: vars.funnelToPosition.z ,duration: 3, ease: "power2.out"}, "funnel-effect");
        mainTimeline.to(cube.scale, {x: vars.funnelToScale, y: vars.funnelToScale, z: vars.funnelToScale, duration: 0.3}, "funnel-effect");


        let cubeCircleTimeline = gsap.timeline({paused: true,});

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
            }
        }, "circle");

        mainTimeline.to(cube.scale, {x: vars.circleScale, y: vars.circleScale, z: vars.circleScale, ease: "power2.in"}, "circle");
    });
}



function gsapBackgroundParallax() {
    gsap.to(camera.position, {
        y: -10,
        scrollTrigger: {
            trigger: '.section-body',
            start: "top top",
            end: "99% bottom",
            markers: true,
            scrub: vars.scrubAmount,
        }
    });
}


function animate () {
    requestAnimationFrame(animate)
    mouseLook();
    bgMaterial.uniforms.uTime.value += 0.05;
    funnel.uniforms.uTime.value += 0.05;

    composer.render();
    // renderer.render(scene, camera)

    // Render particles on top, no post-processing
    renderer.autoClear = false;
    renderer.render(particleScene, camera);
    renderer.autoClear = true;

    stats.update();
}

const mouse = { x: 0, y: 0 }
window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

function mouseLook() {
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, (-mouse.x * Math.PI) / 70, 0.02)
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, (mouse.y * Math.PI) / 70, 0.02)
}


var bgMaterial;
var funnel;
async function init() {
    initThree()
    initBackgroundParticles(500);
    bgMaterial = initTopBackgroundGradient();
    funnel = initFunnelTunnel()
    await initCubes()

    initGsap();
    animate()
}


document.addEventListener('DOMContentLoaded', () => {
    init();
});
