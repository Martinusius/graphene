import { InstancedBufferGeometry, Vector3, BufferAttribute, InstancedBufferAttribute, ShaderMaterial, Vector2, Color, Mesh } from 'three';
import { vertexColor, fragmentColor, vertexRaycast, fragmentRaycast } from './bezier.glsl.js';

import { Globals } from './Globals.js';

/**
 * Beziers drawn via instancing
 * 
 * Each bezier is defined by a 4x4 matrix:
 * p0.x p0.y p0.z lineWidth
 * p1.x p1.y p1.z colorR
 * p2.x p2.y p2.z colorG
 * p3.x p3.y p3.z colorB
 * 
 * p0 - start point
 * p1 - control point 1
 * p2 - control point 2
 * p3 - end point
*/
export class Bezier {
  static instances: Bezier[] = [];
  static geometry: InstancedBufferGeometry;
  static colorMaterial: ShaderMaterial;
  static raycastMaterial: ShaderMaterial;
  static maxBezierCount: number;
  static verticesPerBezier: number;

  private _p0 = new Vector3();
  private _p1 = new Vector3();
  private _p2 = new Vector3();
  private _p3 = new Vector3();
  private _color = new Color();
  private _width = 1;

  constructor(public index: number) {
    Bezier.instances.push(this);
  }

  // Set matrix values
  private set(indices: number[], values: number[]) {
    if (this.index === -1) throw new Error('Bezier is deleted');

    const i = this.index * 16;
    const beziers = Bezier.geometry.attributes.bezier.array;

    for (let j = 0; j < indices.length; j++) {
      beziers[i + indices[j]] = values[j];
    }

    Bezier.geometry.attributes.bezier.needsUpdate = true;
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

  set position(vector) {
    const delta = vector.clone().sub(this.position);
    this.p0 = this._p0.clone().add(delta);
    this.p1 = this._p1.clone().add(delta);
    this.p2 = this._p2.clone().add(delta);
    this.p3 = this._p3.clone().add(delta);
  }

  get position() {
    return this._p0.clone().lerp(this._p3, 0.5);
  }

  getPoint(t: number) {
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

  changeIndex(index: number) {
    if (this.index === -1) throw new Error('Bezier is deleted');

    const j = index * 16;
    const k = this.index * 16;

    const beziers = Bezier.geometry.attributes.bezier.array;

    for (let i = 0; i < 16; i++) {
      beziers[j + i] = beziers[k + i];
      beziers[k + i] = 0;
    }

    Bezier.geometry.attributes.bezier.needsUpdate = true;
    this.index = index;
  }

  delete() {
    const lastBezier = Bezier.instances.pop();
    if (!lastBezier) return;

    Bezier.geometry.instanceCount--;

    if (lastBezier !== this) {
      lastBezier.changeIndex(this.index);
      Bezier.instances[this.index] = lastBezier;
    }

    this.index = -1;
  }

  static init(maxBezierCount = 37768, verticesPerBezier = 128) {
    const pointCount = verticesPerBezier * 2;
    const geometry = new InstancedBufferGeometry();

    geometry.instanceCount = 0;

    const ts = new Float32Array(pointCount);
    const sides = new Float32Array(pointCount);
    const indices = new Uint16Array(((pointCount / 2) - 1) * 6);

    const beziers = new Float32Array(maxBezierCount * 16);
    const bezierIndices = new Float32Array(maxBezierCount);

    // set all indices to 0, 1, 2, 3, ...
    for (let i = 0; i < ts.length; i += 2) {
      ts[i] = i / (ts.length - 1);
      ts[i + 1] = i / (ts.length - 1);
    }

    // set sides to -1, 1, -1, 1, ...
    for (let i = 0; i < sides.length; i += 2) {
      sides[i] = -1;
      sides[i + 1] = 1;
    }

    // set indices to 0, 1, 2, 0, 2, 3, ...

    let idx = 0;
    for (let i = 0; i < indices.length; i += 6) {
      indices.set([idx, idx + 2, idx + 1, idx + 1, idx + 2, idx + 3], i);
      idx += 2;
    }

    // set bezier indices to 0, 1, 2, 3, ...
    for (let i = 0; i < bezierIndices.length; i++) {
      bezierIndices[i] = i;
    }

    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-100000, -100000, -100000, 100000, 100000, 100000]), 3));
    geometry.setAttribute('t', new BufferAttribute(ts, 1));
    geometry.setAttribute('side', new BufferAttribute(sides, 1));

    geometry.setAttribute('bezier', new InstancedBufferAttribute(beziers, 16));
    geometry.setAttribute('bezierIndex', new InstancedBufferAttribute(bezierIndices, 1));
    geometry.setIndex(new BufferAttribute(indices, 1));

    const colorMaterial = new ShaderMaterial({
      uniforms: {
        resolution: { value: new Vector2() }
      },
      vertexShader: vertexColor,
      fragmentShader: fragmentColor,
    });

    const raycastMaterial = new ShaderMaterial({
      uniforms: {
        resolution: { value: new Vector2() },
        tolerance: { value: 0 }
      },
      vertexShader: vertexRaycast,
      fragmentShader: fragmentRaycast,
    });

    colorMaterial.uniforms.resolution.value.copy(Globals.resolution);
    raycastMaterial.uniforms.resolution.value.copy(Globals.resolution);

    Bezier.geometry = geometry;
    Bezier.colorMaterial = colorMaterial;
    Bezier.raycastMaterial = raycastMaterial;
    Bezier.maxBezierCount = maxBezierCount;
    Bezier.verticesPerBezier = verticesPerBezier;

    Globals.scene.add(new Mesh(geometry, colorMaterial));
    Globals.raycastScene.add(new Mesh(geometry, raycastMaterial));
  }

  static resize() {
    Bezier.colorMaterial.uniforms.resolution.value.copy(Globals.resolution);
    Bezier.raycastMaterial.uniforms.resolution.value.copy(Globals.resolution);
  }

  static create(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, color = new Color(1, 1, 1), width = 1) {
    const bezier = new Bezier(Bezier.geometry.instanceCount++);

    bezier.p0 = p0;
    bezier.p1 = p1;
    bezier.p2 = p2;
    bezier.p3 = p3;

    bezier.color = color;
    bezier.width = width;

    return bezier;
  }
}