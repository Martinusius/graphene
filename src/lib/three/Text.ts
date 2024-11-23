import {
  vertexColor,
  fragmentColor,
} from "./text.glsl";

import { Globals } from "./Globals";
import {
  BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Texture,
} from "three";
import { drawFont } from "./drawFont";

type AtlasTexture = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export class Text {
  static instances: Text[] = [];
  static geometry: InstancedBufferGeometry;
  static colorMaterial: ShaderMaterial;
  static maxPointCount: number;
  static atlasTexture: Texture;
  static atlasData: { [key: string]: AtlasTexture };

  public data: any;

  private _position = new Vector3();
  private _size = 10;
  private _text = "";

  constructor(public index: number) {
    this.index = index;
    Text.instances.push(this);
  }

  private static font = drawFont();




  // Set matrix values

  set position(vector) {
    Text.geometry.attributes.transform.array.set([vector.x, vector.y, vector.z], this.index * 4);
    Text.geometry.attributes.transform.needsUpdate = true;

    this._position = vector;
  }

  set size(value) {
    Text.geometry.attributes.transform.array[this.index * 4 + 3] = value;
    Text.geometry.attributes.transform.needsUpdate = true;

    this._size = value;
  }

  set text(text: string) {
    for (let i = 0; i < 4; i++) {
      const letter = Text.font.letters[text[i]] ?? { x: 0, y: 0, width: 0, height: 0 };


      Text.geometry.attributes.letters.array.set([
        letter.x,
        letter.y,
        letter.width,
        letter.height,
      ], this.index * 16 + i * 4);
    }

    for (let i = 0; i < 4; i++) {
      const letter = Text.font.letters[text[i + 4]] ?? { x: 0, y: 0, width: 0, height: 0 };


      Text.geometry.attributes.letters2.array.set([
        letter.x,
        letter.y,
        letter.width,
        letter.height,
      ], this.index * 16 + i * 4);
    }

    Text.geometry.attributes.letters.needsUpdate = true;
    Text.geometry.attributes.letters2.needsUpdate = true;

    this._text = text.slice(0, 8);
  }


  get text() {
    return this._text;
  }

  get size() {
    return this._size;
  }

  get position() {
    return this._position;
  }

  changeIndex(index: number) {
    if (this.index === -1) throw new Error("Point is deleted");

    Text.geometry.attributes.letters.array.set(
      Text.geometry.attributes.letters.array.slice(this.index * 16, this.index * 16 + 16),
      index * 16
    );
    Text.geometry.attributes.letters.array.fill(0, this.index * 16, this.index * 16 + 16);
    Text.geometry.attributes.letters.needsUpdate = true;

    Text.geometry.attributes.letters2.array.set(
      Text.geometry.attributes.letters2.array.slice(this.index * 16, this.index * 16 + 16),
      index * 16
    );
    Text.geometry.attributes.letters2.array.fill(0, this.index * 16, this.index * 16 + 16);
    Text.geometry.attributes.letters2.needsUpdate = true;


    Text.geometry.attributes.transform.array.set(
      Text.geometry.attributes.transform.array.slice(this.index * 4, this.index * 4 + 4),
      index * 3
    );
    Text.geometry.attributes.transform.array.fill(0, this.index * 4, this.index * 4 + 4);
    Text.geometry.attributes.transform.needsUpdate = true;

    this.index = index;
  }

  delete() {
    const lastPoint = Text.instances.pop();

    if (!lastPoint) return;

    Text.geometry.instanceCount--;

    if (lastPoint !== this) {
      lastPoint.changeIndex(this.index);
      Text.instances[this.index] = lastPoint;
    }

    this.index = -1;
  }

  static init(
    maxPointCount = 65536
  ) {
    const geometry = new InstancedBufferGeometry();

    geometry.instanceCount = 0;

    const positions = new Float32Array(4 * 3 + 6);
    const uvs = new Float32Array(4 * 2);

    const indices = new Uint16Array(6);

    const transform = new Float32Array(maxPointCount * 4);
    const letters = new Float32Array(maxPointCount * 16);
    const letters2 = new Float32Array(maxPointCount * 16);


    const pointIndices = new Float32Array(maxPointCount);

    // position of a plane
    positions.set([
      -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0, -100000, -100000, -100000, 100000,
      100000, 100000,
    ]);

    // uv of a plane
    uvs.set([0, 0, 1, 0, 1, 1, 0, 1]);

    // indices of a plane
    indices.set([0, 1, 2, 0, 2, 3]);

    // set point indices to 0, 1, 2, 3, ...
    for (let i = 0; i < pointIndices.length; i++) {
      pointIndices[i] = i;
    }

    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("uvs", new BufferAttribute(uvs, 2));

    geometry.setAttribute("transform", new InstancedBufferAttribute(transform, 4));
    geometry.setAttribute("letters", new InstancedBufferAttribute(letters, 16));
    geometry.setAttribute("letters2", new InstancedBufferAttribute(letters2, 16));


    geometry.setAttribute(
      "pointIndex",
      new InstancedBufferAttribute(pointIndices, 1)
    );
    geometry.setIndex(new BufferAttribute(indices, 1));

    const colorMaterial = new ShaderMaterial({
      uniforms: {
        resolution: { value: new Vector2() },
        alphabet: { value: this.font.texture },
      },
      vertexShader: vertexColor,
      fragmentShader: fragmentColor,
    });

    colorMaterial.uniforms.resolution.value.copy(Globals.resolution);
    colorMaterial.transparent = true;

    Text.geometry = geometry;
    Text.colorMaterial = colorMaterial;
    Text.maxPointCount = maxPointCount;

    Globals.scene.add(new Mesh(geometry, colorMaterial));
  }

  static resize() {
    Text.colorMaterial.uniforms.resolution.value.copy(Globals.resolution);
  }

  static create(position: Vector3, text: string, size = 1) {
    const instance = new Text(Text.geometry.instanceCount++);

    instance.position = position;
    instance.text = text;
    instance.size = size;

    return instance;
  }
}
