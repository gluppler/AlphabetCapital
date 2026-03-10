import * as THREE from 'three';
import { Cube, randomPos } from './Cubes.js';



export const scrubAmount = 1;

export const cameraInitialHeight = 10;



export const logoInitialX = -8.5;

export const logoGsapInitialX = -7;
export const logoGsapInitialZ = 60;

export const logoInitialScale = 0.5;
export const logoGsapInitialScale = 15;


export const logoPath = '/img/Logo.glb';


// Timeline //

// Initial Cubes //
export const initialCube = [
    new Cube(randomPos(), '/img/4PL Innovation Partner.glb'),
    new Cube(randomPos(), '/img/AI & Cloud Synergy.glb'),
    new Cube(randomPos(), '/img/Deployment.glb'),
    new Cube(randomPos(), '/img/Execution Speed (4PL).glb'),
    new Cube(randomPos(), '/img/Financial Agility.glb'),
    new Cube(randomPos(), '/img/Intelligence-First Design.glb'),
    new Cube(randomPos(), '/img/Service Providers.glb'),
    new Cube(randomPos(), '/img/Smart Integration.glb'),
    new Cube(randomPos(), '/img/Sustainability Built-In.glb'),
    new Cube(randomPos(), '/img/Trusted Ecosystem.glb'),
]

export const funnelToPosition = {x: 0, y: -4, z: 0};
export const funnelToPositionArr = [funnelToPosition.x, funnelToPosition.y, funnelToPosition.z];
export const funnelToScale = 0.1;



// Circle Cubes //
export const circleCubes = [
    new Cube(new THREE.Vector3(...funnelToPositionArr), '/img/4PL Innovation Partner.glb', "circle cube"),
    new Cube(new THREE.Vector3(...funnelToPositionArr), '/img/AI & Cloud Synergy.glb', "circle cube"),
    new Cube(new THREE.Vector3(...funnelToPositionArr), '/img/Deployment.glb', "circle cube"),
    new Cube(new THREE.Vector3(...funnelToPositionArr), '/img/Execution Speed (4PL).glb', "circle cube"),
]

export const circleRadius = 8;
export const circleScale = 1;
export const onCircleHoverScale = 1.3;


// Stacking Cubes //
export const stackingCubes = [
    new Cube(new THREE.Vector3(...funnelToPositionArr), '/img/4PL Innovation Partner.glb', "stack-cube-1"),
    new Cube(new THREE.Vector3(...funnelToPositionArr), '/img/AI & Cloud Synergy.glb', "stack-cube-2"),
    new Cube(new THREE.Vector3(...funnelToPositionArr), '/img/Deployment.glb', "stack-cube-3"),
    new Cube(new THREE.Vector3(...funnelToPositionArr), '/img/Execution Speed (4PL).glb', "stack-cube-4"),
    new Cube(new THREE.Vector3(...funnelToPositionArr), '/img/Financial Agility.glb', "stack-cube-5"),
    new Cube(new THREE.Vector3(...funnelToPositionArr), '/img/Intelligence-First Design.glb', "stack-cube-6"),
]

export const stackCube1Position = { x: 0, y: -10, z: 0 };
export const stackCubeScale = 1;
export const stackSlabHeight = 0.7; // vertical gap between stacked cubes — increase to spread apart, decrease to bring closer
