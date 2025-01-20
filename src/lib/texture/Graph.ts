import { FloatType, RGBAFormat, Vector2, Vector3 } from "three";
import { Compute, ComputeProgram, ComputeTexture, SpecialComputeProgram } from "./Compute";
import { DynamicRenderTarget } from "./DynamicRenderTarget";
import { Edges } from "./Edges";
import type { Three } from "./Three";
import { Vertices } from "./Vertices";
import { PIXEL_RADIUS, pixels } from "./pixels";
import { flag } from "./flag.glsl";
import { select } from "./select.glsl";
import { drag } from "./drag.glsl";
import { selectEdges } from "./selectEdges.glsl";
import { Byte, Float2, Float4, Int, Int2, Ubyte4, Uint } from "./TextureFormat";
import { floatBitsToUint, uintBitsToFloat } from "./reinterpret";
import { hash } from "./hash.glsl";
import { Forces } from "./Forces";
import { EadesAlgorithm, FruchtermanReingoldAlgorithm } from "./forceAlgorithm";

export type ObjectType = "vertex" | "edge";

function otherType(type: ObjectType): ObjectType {
  return type === "vertex" ? "edge" : "vertex";
}

export type RaycastResult = {
  type: ObjectType;
  id: number;
};

export class Graph {
  private compute: Compute;

  private vertexData: ComputeTexture;
  private edgeData: ComputeTexture;



  private vertices: Vertices;
  private edges: Edges;

  private raycastTarget: DynamicRenderTarget;

  private flagProgram: ComputeProgram;
  private selectProgram: ComputeProgram;
  private selectEdgesProgram: ComputeProgram;

  private dragProgram: SpecialComputeProgram;


  public forces: Forces;

  constructor(
    private readonly three: Three,
    maxVertices: number,
    maxEdges: number
  ) {
    this.compute = new Compute(three.renderer);

    // const verticesSize = Math.ceil(Math.sqrt(maxVertices));
    // const edgesSize = Math.ceil(Math.sqrt(maxEdges));

    this.vertexData = this.compute.createTextureBuffer(maxVertices);



    this.edgeData = this.compute.createTextureBuffer(maxEdges);

    this.vertices = new Vertices(
      three,
      maxVertices,
      this.vertexData,
    );

    this.edges = new Edges(three, maxEdges, this.edgeData, this.vertexData);

    this.raycastTarget = new DynamicRenderTarget(three.renderer, {
      format: RGBAFormat,
      type: FloatType,
    });

    this.flagProgram = this.compute.createProgram(flag);

    this.selectProgram = this.compute.createProgram(select);
    this.selectEdgesProgram = this.compute.createProgram(selectEdges);

    this.dragProgram = this.compute.createSpecialProgram(drag);

    const algorithm = new EadesAlgorithm();

    algorithm.repulsionStrength = 3000;

    // const algorithm = new FruchtermanReingoldAlgorithm();


    this.forces = new Forces(algorithm, this.compute, maxVertices, this.vertexData, this.edgeData);
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

    const x = id % texture.width;
    const y = Math.floor(id / texture.width);

    const data = await texture.read(x, y, 1, 1)
    return floatBitsToUint(data[2]) & 1;
  }

  unhover() {
    this.flag(2, "vertex", -1, true, true);
    this.flag(2, "edge", -1, true, true);
  }

  deselect() {
    this.flag(0, "vertex", -1, true, true);
    this.flag(0, "edge", -1, true, true);
    this.flag(1, "vertex", -1, true, true);
    this.flag(1, "edge", -1, true, true);
  }


  drag(offset: Vector2) {
    this.dragProgram.setUniform('vertexData', this.vertexData);
    this.dragProgram.setUniform('edgeData', this.edgeData);

    this.dragProgram.setUniform('offset', offset);

    this.dragProgram.execute(this.vertexData.width * this.vertexData.height +
      2 * this.edgeData.width * this.edgeData.height, this.vertexData);
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

  generateVertices() {
    const size = this.vertexData.width;
    const data = new Float32Array(size * size * 4);

    for (let i = 0; i < size * size; i++) {
      data[i * 4 + 0] = (i % size) * 20 + Math.random() * 2000;
      data[i * 4 + 1] = Math.floor(i / size) * 20 + Math.random() * 2000;
      data[i * 4 + 2] = uintBitsToFloat(0);
      data[i * 4 + 3] = 0;
    }

    this.vertexData.write(0, 0, size, size, data);
    this.vertices.count = size * size;
  }

  generateEdges() {
    const vertexSize = this.vertexData.width;
    const size = this.edgeData.width;

    console.log(size);
    console.log(vertexSize);

    const data = new Float32Array(size * size * 4);

    let j = 0;
    for (let i = 0; i < size * size; i++) {
      if (i % size === size - 1) continue;

      data[j * 4 + 0] = uintBitsToFloat((i) * 2 + 1);
      data[j * 4 + 1] = uintBitsToFloat((i + 1) * 2 + 1);
      data[j * 4 + 2] = uintBitsToFloat(0);
      data[j * 4 + 3] = 0;
      j++;
    }

    this.edgeData.write(0, 0, size, size, data);
    this.edges.count = j;
  }



  async countSelected() {
    const promises = [
      this.vertexData.read(0, 0, this.vertexData.width, this.vertexData.height),
      this.edgeData.read(0, 0, this.edgeData.width, this.edgeData.height)
    ];

    const [vertices, edges] = await Promise.all(promises);

    let vertexCount = 0;
    for (let i = 0; i < this.vertices.count; i++) {
      vertexCount += floatBitsToUint(vertices[i * 4 + 2]) & 1;
    }

    let edgeCount = 0;
    for (let i = 0; i < this.edges.count; i++) {
      edgeCount += floatBitsToUint(edges[i * 4 + 2]) & 1;
    }

    console.log('vertexCount', vertexCount);
    console.log('edgeCount', edgeCount);
  }
}
