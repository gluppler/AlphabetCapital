import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import topLightVertexShader from './home-top-bg-vertex.glsl?raw';
import topLightFragmentShader from './home-top-bg-fragment.glsl?raw';

import * as vars from './vars.js';


gsap.registerPlugin(ScrollTrigger, CustomWiggle, CustomEase, MotionPathPlugin);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);



var scene;
var camera;
var renderer;

function initThree() {
    const width = window.innerWidth, height = window.innerHeight
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x042730);

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.z = 20
    camera.position.y = 10

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    document.querySelector('#threejs').appendChild(renderer.domElement)

    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);
}



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
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.025, sizeAttenuation: true })
    const points = new THREE.Points(geometry, material)
    scene.add(points)
}

var cubes = []

async function initCubes() {

    for (const cubePosition of vars.initialCubePositions) {
        const cube = await createCube(vars.pathToCube);
        cube.position.set(cubePosition[0], cubePosition[1], cubePosition[2]);

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
    const geometry = new THREE.PlaneGeometry( 60, 23 );
    const material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0.4 },
            uColor1: { value: new THREE.Color(0x7EBFD3) },
            uColor2: { value: new THREE.Color(0x276C86) },
            uColor3: { value: new THREE.Color(0x92C5D7) },
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


let mainTimeline = gsap.timeline({scrollTrigger: {trigger: '.section-body', start: "top top", end: "99% bottom", scrub: vars.scrubAmount, markers: true}});
function initGsap() {
    gsapBackgroundParallax();

    const offsetPerCube = 1/cubes.length;

    cubes.forEach((cube, index) => {
        mainTimeline.to(cube.position, {x: vars.funnelToPosition.x, duration: 0.3, ease: "circ.out"}, "funnel-effect");
        mainTimeline.to(cube.position, {y: vars.funnelToPosition.y, z: vars.funnelToPosition.z ,duration: 1}, "funnel-effect");
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
    renderer.render(scene, camera)
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
async function init() {
    initThree()
    initBackgroundParticles(500);
    bgMaterial = initTopBackgroundGradient();
    await initCubes()

    initGsap();
    animate()
}


document.addEventListener('DOMContentLoaded', () => {
    init();
});
