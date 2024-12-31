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
import { Float, Float2, Int2 } from "./TextureFormat";

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

  private vertexPositions: ComputeTexture;
  private edgeVertices: ComputeTexture;

  private selectionVertices: ComputeTexture;
  private selectionEdges: ComputeTexture;

  private vertices: Vertices;
  private edges: Edges;

  private raycastTarget: DynamicRenderTarget;

  private flagProgram: ComputeProgram;
  private selectProgram: ComputeProgram;
  private selectEdgesProgram: ComputeProgram;

  private dragProgram: SpecialComputeProgram;

  constructor(
    private readonly three: Three,
    maxVertices: number,
    maxEdges: number
  ) {
    this.compute = new Compute(three.renderer);

    const verticesSize = Math.ceil(Math.sqrt(maxVertices));
    const edgesSize = Math.ceil(Math.sqrt(maxEdges));

    this.vertexPositions = this.compute.createTexture(
      verticesSize,
      verticesSize,
      Float2
    );

    this.selectionVertices = this.compute.createTexture(
      verticesSize,
      verticesSize,
    );

    this.edgeVertices = this.compute.createTexture(edgesSize, edgesSize, Int2);
    this.selectionEdges = this.compute.createTexture(edgesSize, edgesSize);

    this.vertices = new Vertices(
      three,
      maxVertices,
      this.vertexPositions,
      this.selectionVertices
    );

    this.edges = new Edges(three, maxEdges, this.edgeVertices, this.selectionEdges, this.vertexPositions);

    this.raycastTarget = new DynamicRenderTarget(three.renderer, {
      format: RGBAFormat,
      type: FloatType,
    });

    this.flagProgram = this.compute.createProgram(flag);

    this.selectProgram = this.compute.createProgram(select);
    this.selectEdgesProgram = this.compute.createProgram(selectEdges);

    this.dragProgram = this.compute.createSpecialProgram(drag);
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

    this.selectProgram.setUniform('positions', this.vertexPositions);
    this.selectProgram.setUniform('selection', this.selectionVertices);

    this.selectProgram.execute(this.selectionVertices);

    this.selectEdgesProgram.setUniform('min', min);
    this.selectEdgesProgram.setUniform('max', max);
    this.selectEdgesProgram.setUniform('select', select);
    this.selectEdgesProgram.setUniform('preview', preview);

    this.selectEdgesProgram.setUniform('projectionMatrix', this.three.camera.projectionMatrix);
    this.selectEdgesProgram.setUniform('_viewMatrix', this.three.camera.matrixWorldInverse);
    this.selectEdgesProgram.setUniform('screenResolution', this.three.resolution);
    this.selectEdgesProgram.setUniform('size', this.three.camera.zoom * 400);

    this.selectEdgesProgram.setUniform('vertices', this.edgeVertices);
    this.selectEdgesProgram.setUniform('positions', this.vertexPositions);
    this.selectEdgesProgram.setUniform('selection', this.selectionEdges);

    this.selectEdgesProgram.execute(this.selectionEdges);
  }

  private flag(channel: number, type: ObjectType, id: number, set: boolean, unsetOther: boolean) {
    const texture = { vertex: this.selectionVertices, edge: this.selectionEdges }[type];

    this.flagProgram.setUniform('channel', channel);
    this.flagProgram.setUniform('set', set);
    this.flagProgram.setUniform('unsetOther', unsetOther);
    this.flagProgram.setUniform('id', id);
    this.flagProgram.setUniform('selection', texture);
    this.flagProgram.execute(texture);
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
    const texture = { vertex: this.selectionVertices, edge: this.selectionEdges }[type];

    const x = id % texture.width;
    const y = Math.floor(id / texture.width);

    const data = await texture.read(x, y, 1, 1)
    // console.log('typeid', type, id);
    // console.log('selected', data[0]);
    return data[0] > 0.5;
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
    this.dragProgram.setUniform('positions', this.vertexPositions);
    this.dragProgram.setUniform('edgeVertices', this.edgeVertices);
    this.dragProgram.setUniform('selectionVertices', this.selectionVertices);
    this.dragProgram.setUniform('selectionEdges', this.selectionEdges);

    this.dragProgram.setUniform('offset', offset);

    this.dragProgram.execute(this.vertexPositions.width * this.vertexPositions.height +
      2 * this.edgeVertices.width * this.edgeVertices.height, this.vertexPositions);
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

  private indexUv(index: number, size: number) {
    return new Vector2((index % size + 0.5) / size, (Math.floor(index / size) + 0.5) / size);
  }

  generateVertices() {
    const size = this.vertexPositions.width;
    const data = new Float32Array(size * size * 2);

    for (let i = 0; i < size * size; i++) {
      data[i * 2 + 0] = (i % size) * 20 + Math.random() * 10;
      data[i * 2 + 1] = Math.floor(i / size) * 20 + Math.random() * 10;
    }

    this.vertexPositions.write(0, 0, size, size, data);
    this.vertices.count = size * size;
  }

  generateEdges() {
    const vertexSize = this.vertexPositions.width;
    const size = this.edgeVertices.width;

    console.log(size);
    console.log(vertexSize);

    const data = new Int32Array(size * size * 2);

    let j = 0;
    for (let i = 0; i < size * size; i++) {
      if (i % size === size - 1) continue;

      data[j * 2 + 0] = (i) * 2 + 1;
      data[j * 2 + 1] = (i + 1) * 2 + 1;

      // data[j * 4 + 0] = this.indexUv(i, vertexSize).x + 1;
      // data[j * 4 + 1] = this.indexUv(i, vertexSize).y;
      // data[j * 4 + 2] = this.indexUv(i + 1, vertexSize).x + 1;
      // data[j * 4 + 3] = this.indexUv(i + 1, vertexSize).y;
      j++;
    }

    this.edgeVertices.write(0, 0, size, size, data);
    this.edges.count = j;
  }

  async invert() {
    const select = await this.selectionVertices.read(0, 0, this.selectionVertices.width, this.selectionVertices.height);

    for (let i = 0; i < select.length / 4; i++) {
      select[i * 4] = 1 - select[i * 4];
    }

    this.selectionVertices.write(0, 0, this.selectionVertices.width, this.selectionVertices.height, select);
  }

  async countSelected() {
    const promises = [
      this.selectionVertices.read(0, 0, this.selectionVertices.width, this.selectionVertices.height),
      this.selectionEdges.read(0, 0, this.selectionEdges.width, this.selectionEdges.height)
    ];

    const [vertices, edges] = await Promise.all(promises);

    let vertexCount = 0;
    for (let i = 0; i < this.vertices.count; i++) {
      vertexCount += vertices[i * 4] > 0.5 ? 1 : 0;
    }

    let edgeCount = 0;
    for (let i = 0; i < this.edges.count; i++) {
      edgeCount += edges[i * 4] > 0.5 ? 1 : 0;
    }

    console.log('vertexCount', vertexCount);
    console.log('edgeCount', edgeCount);
  }
}
