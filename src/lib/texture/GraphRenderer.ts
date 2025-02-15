import { FloatType, RGBAFormat, Vector2 } from "three";
import { DynamicRenderTarget } from "./DynamicRenderTarget";
import { Edges } from "./Edges";
import type { Three } from "./Three";
import { Vertices } from "./Vertices";
import { PIXEL_RADIUS, pixels } from "./pixels";
import { flag } from "./flag.glsl";
import { select } from "./select.glsl";
import { drag } from "./drag.glsl";
import { selectEdges } from "./selectEdges.glsl";
import { floatBitsToUint, uintBitsToFloat } from "./reinterpret";
import { Forces } from "./Forces";
import { EadesAlgorithm, FruchtermanReingoldAlgorithm } from "./ForceAlgorithm";
import { IndexedSet } from "../IndexedSet";
import { Counter } from "./Counter";
import { Compute } from "./compute/Compute";
import type { ComputeBuffer } from "./compute/ComputeBuffer";
import type { ComputeProgram } from "./compute/ComputeProgram";
import { Font } from "./text/Font";
import { Text } from "./text/Text";

export type ObjectType = "vertex" | "edge";

function otherType(type: ObjectType): ObjectType {
  return type === "vertex" ? "edge" : "vertex";
}

export type RaycastResult = {
  type: ObjectType;
  id: number;
};

export class GraphRenderer {
  private compute: Compute;

  public vertexData: ComputeBuffer;
  public edgeData: ComputeBuffer;

  public vertices: Vertices;
  public edges: Edges;

  private raycastTarget: DynamicRenderTarget;

  private selectProgram: ComputeProgram;
  private selectEdgesProgram: ComputeProgram;

  private flagProgram: ComputeProgram;

  private dragProgram: ComputeProgram;

  // private countOnScreenProgram: ComputeProgram;
  // private screenCountBuffer: ComputeTexture;

  // public text: VertexText;
  public text: Text;
  private font: Font;


  public forces: Forces;

  private counter: Counter;

  constructor(
    public readonly three: Three,
    maxVertices: number,
    maxEdges: number
  ) {
    this.compute = new Compute(three.renderer);

    this.counter = new Counter(this.compute);

    // const verticesSize = Math.ceil(Math.sqrt(maxVertices));
    // const edgesSize = Math.ceil(Math.sqrt(maxEdges));

    this.vertexData = this.compute.createBuffer(maxVertices);


    this.edgeData = this.compute.createBuffer(maxEdges);

    this.vertices = new Vertices(
      three,
      this.vertexData,
    );

    this.edges = new Edges(three, this.edgeData, this.vertexData);

    this.raycastTarget = new DynamicRenderTarget(three.renderer, {
      format: RGBAFormat,
      type: FloatType,
    });

    this.flagProgram = this.compute.createProgram(flag);

    this.selectProgram = this.compute.createProgram(select);
    this.selectEdgesProgram = this.compute.createProgram(selectEdges);

    this.dragProgram = this.compute.createProgram(drag);

    // this.countOnScreenProgram = this.compute.createProgram(countOnScreen, true);
    // this.screenCountBuffer = this.compute.createTextureBuffer(1);

    const algorithm = new EadesAlgorithm();

    algorithm.repulsionStrength = 3000;
    algorithm.springLength = 25;

    // const algorithm = new FruchtermanReingoldAlgorithm();

    // algorithm.springLength = 25;
    // algorithm.factor = 0.05;


    this.forces = new Forces(algorithm, this.compute, this.vertices, this.edges, this.vertexData, this.edgeData);

    this.font = new Font(this.compute);

    // this.text = new VertexText(this.three, this.compute, this.vertices, this.vertexData, this.edgeData, this.font);
    //this.text = new Autotext(this.three, this.compute, this.vertices, this.vertexData, this.edgeData, this.font);
    this.text = new Text(this.three, this.font, this.vertices, this.edges, this.vertexData, this.edgeData);
  }




  selection(min: Vector2, max: Vector2, select = true, preview = true) {
    this.three.camera.updateMatrixWorld();

    this.selectProgram.setUniform('min', min);
    this.selectProgram.setUniform('max', max);
    this.selectProgram.setUniform('select', select);
    this.selectProgram.setUniform('preview', preview);

    this.selectProgram.setUniform('projectionMatrix', this.three.camera.projectionMatrix);
    this.selectProgram.setUniform('_viewMatrix', this.three.camera.matrixWorldInverse);
    this.selectProgram.setUniform('screenResolution', this.three.resolution);
    this.selectProgram.setUniform('size', this.three.camera.zoom * 400);

    this.selectProgram.setUniform('vertexData', this.vertexData);

    this.selectProgram.execute(this.vertexData);

    this.selectEdgesProgram.setUniform('min', min);
    this.selectEdgesProgram.setUniform('max', max);
    this.selectEdgesProgram.setUniform('select', select);
    this.selectEdgesProgram.setUniform('preview', preview);

    this.selectEdgesProgram.setUniform('projectionMatrix', this.three.camera.projectionMatrix);
    this.selectEdgesProgram.setUniform('_viewMatrix', this.three.camera.matrixWorldInverse);
    this.selectEdgesProgram.setUniform('screenResolution', this.three.resolution);
    this.selectEdgesProgram.setUniform('size', this.three.camera.zoom * 400);

    this.selectEdgesProgram.setUniform('vertexData', this.vertexData);
    this.selectEdgesProgram.setUniform('edgeData', this.edgeData);

    this.selectEdgesProgram.execute(this.edgeData);
  }

  private flag(channel: number, type: ObjectType, id: number, set: boolean, unsetOther: boolean) {
    const texture = { vertex: this.vertexData, edge: this.edgeData }[type];

    this.flagProgram.setUniform('channel', channel);
    this.flagProgram.setUniform('set', set);
    this.flagProgram.setUniform('unsetOther', unsetOther);
    this.flagProgram.setUniform('id', id);
    this.flagProgram.setUniform('flagData', texture);
    this.flagProgram.execute(texture);
  }

  undrag() {
    this.flag(3, "vertex", -1, true, true);
    this.flag(3, "edge", -1, true, true);
  }

  select(type: ObjectType, id: number, select = true) {
    this.flag(0, type, id, select, false);
    this.flag(1, type, id, select, false);
  }

  hover(type: ObjectType, id: number) {
    this.flag(2, otherType(type), -1, false, true);
    this.flag(2, type, id, true, true);
  }

  async isSelected(type: ObjectType, id: number) {
    const texture = { vertex: this.vertexData, edge: this.edgeData }[type];

    const data = await texture.read(id);

    return floatBitsToUint(data[2]) & 1;
  }

  unhover() {
    this.flag(2, "vertex", -1, true, true);
    this.flag(2, "edge", -1, true, true);
  }

  deselectAll() {
    this.flag(0, "vertex", -1, true, true);
    this.flag(0, "edge", -1, true, true);
    this.flag(1, "vertex", -1, true, true);
    this.flag(1, "edge", -1, true, true);
  }


  drag(offset: Vector2) {
    this.dragProgram.setUniform('vertexData', this.vertexData);
    this.dragProgram.setUniform('edgeData', this.edgeData);
    this.dragProgram.setUniform('vertexCount', this.vertices.count);

    this.dragProgram.setUniform('offset', offset);

    this.dragProgram.execute(this.vertexData, this.vertices.count +
      2 * this.edges.count);
  }

  raycast(pointer: Vector2) {
    // render a PIXEL_RADIUS x PIXEL_RADIUS area around the pointer (mouse)
    // read the pixels in order from closest to furthest from the pointer
    // find the first pixel that contains an object and return the object

    return new Promise<RaycastResult | undefined>((resolve) => {
      // hide all objects that are not raycastable
      this.three.scene.children.forEach((child) => {
        child.userData.previouslyVisible = child.visible;
        child.visible = !!child.userData.raycastable;

        if (child.userData.raycastable) {
          (child as any).material.uniforms.raycast.value = true;
        }
      });

      const target = this.raycastTarget.target();

      // the pixel over which the pointer is
      const pixel = this.three.screenToImage(pointer);

      // min corner of the PIXEL_RADIUS x PIXEL_RADIUS area
      const min = pixel
        .clone()
        .sub(new Vector2(PIXEL_RADIUS, PIXEL_RADIUS).multiplyScalar(0.5));
      const max = min.clone().add(new Vector2(PIXEL_RADIUS, PIXEL_RADIUS));


      // prevent rendering objects outside the PIXEL_RADIUS x PIXEL_RADIUS area
      this.three.renderer.setRenderTarget(target);
      this.three.renderer.setScissor(
        min.x / window.devicePixelRatio,
        min.y / window.devicePixelRatio,
        PIXEL_RADIUS / window.devicePixelRatio,
        PIXEL_RADIUS / window.devicePixelRatio
      );
      this.three.renderer.setScissorTest(true);

      this.three.renderer.render(this.three.scene, this.three.camera);

      const pixelBuffer = new Float32Array(4 * PIXEL_RADIUS * PIXEL_RADIUS);

      const typeMap = [
        "vertex",
        "edge"
      ] as const;

      const oldMin = min.clone();

      // clamp min and max to the screen bounds (the pixel-reading function does not like invalid selections)
      min.max(new Vector2(0, 0));
      max.min(this.three.resolution);

      const size = max.clone().sub(min);


      this.three.renderer.readRenderTargetPixelsAsync(
        target,
        min.x,
        min.y,
        size.x,
        size.y,
        pixelBuffer
      ).then(() => {

        for (let i = 0; i < pixels.length; i++) {
          const [x, y] = pixels[i];

          // check if the pixel is within the bounds of the screen
          if (oldMin.x + x < 0 || oldMin.y + y < 0) continue;
          if (oldMin.x + x >= this.three.resolution.x || oldMin.y + y >= this.three.resolution.y) continue;


          const offsetMin = min.clone().sub(oldMin);

          // calculate index
          const index = (x - offsetMin.x + size.x * (y - offsetMin.y)) * 4;

          if (pixelBuffer[index + 1] < 1) continue;

          const type = typeMap[pixelBuffer[index]];
          const id = pixelBuffer[index + 1] - 1;

          resolve({
            type,
            id
          });


          break;
        }

        resolve(undefined);
      });

      this.three.renderer.setRenderTarget(null);
      this.three.renderer.setScissorTest(false);

      // restore visibility of previously visible objects
      this.three.scene.children.forEach((child) => {
        child.visible = child.userData.previouslyVisible;

        if (child.userData.raycastable) {
          (child as any).material.uniforms.raycast.value = false;
        }
      });
    });
  }

  async generateVertices() {
    const size = this.vertexData.size;
    const width = this.vertexData.width;

    const data = new Float32Array(size * 4);

    for (let i = 0; i < size; i++) {
      data[i * 4 + 0] = (i % width) * 20 + Math.random() * 2000;
      data[i * 4 + 1] = Math.floor(i / width) * 20 + Math.random() * 2000;
      data[i * 4 + 2] = uintBitsToFloat(0);
      data[i * 4 + 3] = 0;
    }

    await this.vertexData.write(data);
    this.vertices.count = size;
    console.log('generated', size);
  }

  async generateSpanningTree() {
    const vertexCount = this.vertices.count;
    if (vertexCount === 0) return;

    const set = new IndexedSet<number>([0]);

    const width = this.edgeData.width;
    const data = new Float32Array(width * width * 4);


    for (let i = 1; i < vertexCount; i++) {
      const random = set.at(Math.floor(Math.random() * set.size));

      data[(i - 1) * 4 + 0] = uintBitsToFloat(random * 2 + 1);
      data[(i - 1) * 4 + 1] = uintBitsToFloat(i * 2 + 1);
      data[(i - 1) * 4 + 2] = uintBitsToFloat(0);
      data[(i - 1) * 4 + 3] = 0;

      set.add(i);
    }

    await this.edgeData.write(data);
    this.edges.count = vertexCount - 1;
  }

  async generateEdges() {
    const size = this.edgeData.width;

    const data = new Float32Array(size * size * 4);

    let j = 0;
    for (let i = 0; i < size * size; i++) {
      if (i + 1 >= this.vertices.count) continue;
      if (i % size === size - 1) continue;

      data[j * 4 + 0] = uintBitsToFloat(i * 2 + 1);
      data[j * 4 + 1] = uintBitsToFloat((i + 1) * 2 + 1);
      data[j * 4 + 2] = uintBitsToFloat(0);
      data[j * 4 + 3] = 0;
      j++;
    }

    await this.edgeData.write([...data].slice(0, j * 4));
    this.edges.count = j;
  }

  // async countOnScreen() {
  //   this.three.camera.updateMatrixWorld();

  //   this.countOnScreenProgram.setUniform('vertexData', this.vertexData);

  //   this.countOnScreenProgram.setUniform('projectionMatrix', this.three.camera.projectionMatrix);
  //   this.countOnScreenProgram.setUniform('_viewMatrix', this.three.camera.matrixWorldInverse);
  //   this.countOnScreenProgram.setUniform('screenResolution', this.three.resolution);
  //   this.countOnScreenProgram.setUniform('size', this.three.camera.zoom * 400);


  //   this.countOnScreenProgram.execute(this.vertexData.width * this.vertexData.height, this.screenCountBuffer);

  //   const result = await this.screenCountBuffer.read(0, 0, 1, 1);
  //   return result[0];
  // }



  async countSelected() {
    const promises = [
      this.counter.count(this.vertexData, 0),
      this.counter.count(this.edgeData, 0)
    ];

    const [vertexCount, edgeCount] = await Promise.all(promises);

    console.log('vertexCount', vertexCount);
    console.log('edgeCount', edgeCount);
  }
}
