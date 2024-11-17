import { vertexColor, fragmentColor, vertexRaycast, fragmentRaycast } from './point.glsl.js';

import { Globals } from './Globals.js';
import { BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, ShaderMaterial, Vector2, Vector3, type Texture } from 'three';

type AtlasTexture = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Point {
  static instances: Point[] = [];
  static geometry: InstancedBufferGeometry;
  static colorMaterial: ShaderMaterial;
  static raycastMaterial: ShaderMaterial;
  static maxPointCount: number;
  static atlasTexture: Texture;
  static atlasData: { [key: string]: AtlasTexture };

  private _position = new Vector3();
  private _size = 10;
  private _image = '';

  constructor(public index: number) {
    this.index = index;
    Point.instances.push(this);
  }

  // Set matrix values
  private set(indices: number[], values: number[]) {
    if (this.index === -1) throw new Error('Point is deleted');

    const i = this.index * 16;
    const points = Point.geometry.attributes.point.array;

    for (let j = 0; j < indices.length; j++) {
      points[i + indices[j]] = values[j];
    }

    Point.geometry.attributes.point.needsUpdate = true;
  }

  set position(vector) {
    this.set([0, 1, 2], [vector.x, vector.y, vector.z]);
    this._position = vector;
  }

  set size(value) {
    this.set([3], [value]);
    this._size = value;
  }

  set image(imageName) {
    const image = Point.atlasData[imageName];
    this.set([4, 5, 6, 7], [image.x, Point.atlasTexture.image.height - image.y, image.width, -image.height]);
    this._image = imageName;
  }

  get image() {
    return this._image;
  }

  get size() {
    return this._size;
  }

  get position() {
    return this._position;
  }

  changeIndex(index: number) {
    if (this.index === -1) throw new Error('Point is deleted');

    const j = index * 16;
    const k = this.index * 16;

    const points = Point.geometry.attributes.point.array;

    for (let i = 0; i < 16; i++) {
      points[j + i] = points[k + i];
      points[k + i] = 0;
    }

    Point.geometry.attributes.point.needsUpdate = true;
    this.index = index;
  }

  delete() {
    const lastPoint = Point.instances.pop();

    if (!lastPoint) return;

    Point.geometry.instanceCount--;

    if (lastPoint !== this) {
      lastPoint.changeIndex(this.index);
      Point.instances[this.index] = lastPoint;
    }

    this.index = -1;
  }

  static init(atlasTexture: Texture, atlasData: AtlasTexture[], maxPointCount = 65536) {
    const geometry = new InstancedBufferGeometry();

    geometry.instanceCount = 0;

    const positions = new Float32Array(4 * 3 + 6);
    const uvs = new Float32Array(4 * 2);

    const indices = new Uint16Array(6);

    const points = new Float32Array(maxPointCount * 16);
    const pointIndices = new Float32Array(maxPointCount);

    // position of a plane
    positions.set([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0, -100000, -100000, -100000, 100000, 100000, 100000]);

    // uv of a plane
    uvs.set([0, 0, 1, 0, 1, 1, 0, 1]);

    // indices of a plane
    indices.set([0, 1, 2, 0, 2, 3]);

    // set point indices to 0, 1, 2, 3, ...
    for (let i = 0; i < pointIndices.length; i++) {
      pointIndices[i] = i;
    }

    Point.atlasData = {};

    atlasData.forEach(({ name, x, y, width, height }) => {
      Point.atlasData[name] = { name, x, y, width, height };
    });


    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('uvs', new BufferAttribute(uvs, 2));

    geometry.setAttribute('point', new InstancedBufferAttribute(points, 16));
    geometry.setAttribute('pointIndex', new InstancedBufferAttribute(pointIndices, 1));
    geometry.setIndex(new BufferAttribute(indices, 1));

    const colorMaterial = new ShaderMaterial({
      uniforms: {
        resolution: { value: new Vector2() },
        atlas: { value: atlasTexture },
        atlasSize: { value: new Vector2() },
      },
      vertexShader: vertexColor,
      fragmentShader: fragmentColor,
    });

    const raycastMaterial = new ShaderMaterial({
      uniforms: {
        resolution: { value: new Vector2() },
        atlas: { value: atlasTexture },
        atlasSize: { value: new Vector2() },
        tolerance: { value: 0 }
      },
      vertexShader: vertexRaycast,
      fragmentShader: fragmentRaycast,
    });

    colorMaterial.uniforms.resolution.value.copy(Globals.resolution);
    raycastMaterial.uniforms.resolution.value.copy(Globals.resolution);
    colorMaterial.uniforms.atlasSize.value = new Vector2(atlasTexture.image.width, atlasTexture.image.height);
    raycastMaterial.uniforms.atlasSize.value = new Vector2(atlasTexture.image.width, atlasTexture.image.height);

    colorMaterial.transparent = true;

    Point.geometry = geometry;
    Point.colorMaterial = colorMaterial;
    Point.raycastMaterial = raycastMaterial;
    Point.maxPointCount = maxPointCount;
    Point.atlasTexture = atlasTexture;

    Globals.scene.add(new Mesh(geometry, colorMaterial));
    Globals.raycastScene.add(new Mesh(geometry, raycastMaterial));
  }

  static resize() {
    Point.colorMaterial.uniforms.resolution.value.copy(Globals.resolution);
    Point.raycastMaterial.uniforms.resolution.value.copy(Globals.resolution);
  }

  static create(position: Vector3, imageName: string, size = 10) {
    const point = new Point(Point.geometry.instanceCount++);

    point.position = position;
    point.image = imageName;
    point.size = size;

    return point;
  }
}