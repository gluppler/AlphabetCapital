import * as THREE from 'three';

export class Cube {
    constructor(position, pathToCube = '/img/4PL Innovation Partner.glb', name='cube') {
        this.position = position instanceof THREE.Vector3 ? position : new THREE.Vector3(...position);
        this.pathToCube = pathToCube;
        this.name = name;
    }
}

export function randomPos() {
    return new THREE.Vector3(
        THREE.MathUtils.randFloat(-25, 25),
        THREE.MathUtils.randFloat(15, 20),
        THREE.MathUtils.randFloat(-27, 5)
    );
}

