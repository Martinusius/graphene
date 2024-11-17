import * as THREE from 'three';
import { vertexColor, fragmentColor, vertexRaycast, fragmentRaycast } from './bezierarrows.glsl.js';

import { Globals } from './Globals.js';

export class BezierArrows {
  static instances = [];

  constructor(index) {
    this.index = index;
    BezierArrows.instances.push(this);
  }

  set(indices, values) {
    if (this.index === -1) throw new Error('BezierArrows is deleted');

    const i = this.index * 16;
    const bezierArrows = BezierArrows.geometry.attributes.bezierArrows.array;

    for (let j = 0; j < indices.length; j++) {
      bezierArrows[i + indices[j]] = values[j];
    }

    BezierArrows.geometry.attributes.bezierArrows.needsUpdate = true;
  }

  set p0(vector) {
    this.set([0, 1, 2], [vector.x, vector.y, vector.z]);
    this._p0 = vector;
  }

  set p1(vector) {
    this.set([4, 5, 6], [vector.x, vector.y, vector.z]);
    this._p1 = vector;
  }

  set p2(vector) {
    this.set([8, 9, 10], [vector.x, vector.y, vector.z]);
    this._p2 = vector;
  }

  set p3(vector) {
    this.set([12, 13, 14], [vector.x, vector.y, vector.z]);
    this._p3 = vector;
  }

  set color(color) {
    this.set([7, 11, 15], [color.r, color.g, color.b]);
    this._color = color;
  }

  set width(width) {
    this.set([3], [width])
    this._width = width;
  }

  get p0() {
    return this._p0;
  }

  get p1() {
    return this._p1;
  }

  get p2() {
    return this._p2;
  }

  get p3() {
    return this._p3;
  }

  get color() {
    return this._color;
  }

  get width() {
    return this._width;
  }


  get position() {
    return this._p0.clone().lerp(this._p3, 0.5);
  }

  set position(vector) {
    const delta = vector.clone().sub(this.position);
    this.p0 = this._p0.clone().add(delta);
    this.p1 = this._p1.clone().add(delta);
    this.p2 = this._p2.clone().add(delta);
    this.p3 = this._p3.clone().add(delta);
  }

  getPoint(t) {
    const k = 1.0 - t;
    const k2 = k * k;
    const k3 = k2 * k;
    const t2 = t * t;
    const t3 = t2 * t;

    return this._p0.clone().multiplyScalar(k3)
      .add(this._p1.clone().multiplyScalar(3.0 * t * k2))
      .add(this._p2.clone().multiplyScalar(3.0 * t2 * k))
      .add(this._p3.clone().multiplyScalar(t3));
  }

  changeIndex(index) {
    if (this.index === -1) throw new Error('BezierArrows is deleted');

    const j = index * 16;
    const k = this.index * 16;

    const bezierArrows = BezierArrows.geometry.attributes.bezierArrows.array;

    for (let i = 0; i < 16; i++) {
      bezierArrows[j + i] = bezierArrows[k + i];
      bezierArrows[k + i] = 0;
    }

    BezierArrows.geometry.attributes.bezierArrows.needsUpdate = true;
    this.index = index;
  }

  delete() {
    const lastBezierArrows = BezierArrows.instances.pop();

    BezierArrows.geometry.instanceCount--;

    if (lastBezierArrows !== this) {
      lastBezierArrows.changeIndex(this.index);
      BezierArrows.instances[this.index] = lastBezierArrows;
    }

    this.index = -1;
  }

  static init(maxBezierArrowsCount = 37768, arrowsPerBezier = 32) {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.instanceCount = 0;

    const arrowIndices = new Float32Array(arrowsPerBezier * 6);
    const sides = new Float32Array(arrowsPerBezier * 6 * 2);
    const indices = new Uint16Array(arrowsPerBezier * 12);

    const bezierArrows = new Float32Array(maxBezierArrowsCount * 16);
    const bezierArrowIndices = new Float32Array(maxBezierArrowsCount);

    let aidx = 0;
    for (let i = 0; i < arrowIndices.length; i += 6) {
      arrowIndices.set(new Array(6).fill(aidx), i);
      aidx += 1;
    }

    for (let i = 0; i < sides.length; i += 12) {
      sides.set([-1, -1, -1, 1, 0, -1, 0, 1, 1, -1, 1, 1], i);
    }

    let idx = 0;
    for (let i = 0; i < indices.length; i += 12) {
      indices.set([idx, idx + 1, idx + 2, idx + 2, idx + 1, idx + 3, idx + 2, idx + 3, idx + 4, idx + 4, idx + 3, idx + 5], i);
      idx += 6;
    }

    for (let i = 0; i < bezierArrowIndices.length; i++) {
      bezierArrowIndices[i] = i;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-100000, -100000, -1000, 100000, 100000, 100000]), 3));
    geometry.setAttribute('arrowIndex', new THREE.BufferAttribute(arrowIndices, 1));
    geometry.setAttribute('side', new THREE.BufferAttribute(sides, 2));

    geometry.setAttribute('bezierArrows', new THREE.InstancedBufferAttribute(bezierArrows, 16));
    geometry.setAttribute('bezierArrowsIndex', new THREE.InstancedBufferAttribute(bezierArrowIndices, 1));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    const colorMaterial = new THREE.ShaderMaterial({
      uniforms: {
        resolution: { value: new THREE.Vector2() },
        arrowCount: { value: arrowsPerBezier },
        distIncrement: { value: 0.1 }
      },
      vertexShader: vertexColor,
      fragmentShader: fragmentColor,
    });

    const raycastMaterial = new THREE.ShaderMaterial({
      uniforms: {
        resolution: { value: new THREE.Vector2() },
        arrowCount: { value: arrowsPerBezier },
        distIncrement: { value: 0.1 },
        tolerance: { value: 0 }
      },
      vertexShader: vertexRaycast,
      fragmentShader: fragmentRaycast,
    });

    colorMaterial.uniforms.resolution.value.copy(Globals.resolution);
    raycastMaterial.uniforms.resolution.value.copy(Globals.resolution);

    BezierArrows.geometry = geometry;
    BezierArrows.colorMaterial = colorMaterial;
    BezierArrows.raycastMaterial = raycastMaterial;
    BezierArrows.maxBezierArrowsCount = maxBezierArrowsCount;
    BezierArrows.arrowsPerBezier = arrowsPerBezier;

    Globals.scene.add(new THREE.Mesh(geometry, colorMaterial));
    Globals.raycastScene.add(new THREE.Mesh(geometry, raycastMaterial));
  }

  static resize() {
    BezierArrows.colorMaterial.uniforms.resolution.value.copy(Globals.resolution);
    BezierArrows.raycastMaterial.uniforms.resolution.value.copy(Globals.resolution);
  }

  static create(p0, p1, p2, p3, color = new THREE.Color(1, 1, 1), width = 1) {
    const bezierArrows = new BezierArrows(BezierArrows.geometry.instanceCount++);

    bezierArrows.p0 = p0;
    bezierArrows.p1 = p1;
    bezierArrows.p2 = p2;
    bezierArrows.p3 = p3;

    bezierArrows.color = color;
    bezierArrows.width = width;
  }
}