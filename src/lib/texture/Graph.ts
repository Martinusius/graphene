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

  private selectionVertices: ComputeTexture;
  private selectionEdges: ComputeTexture;

  private vertices: Vertices;
  private edges: Edges;

  private raycastTarget: DynamicRenderTarget;

  private flagProgram: ComputeProgram;
  private selectProgram: ComputeProgram;

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
      verticesSize
    );

    this.selectionVertices = this.compute.createTexture(
      verticesSize,
      verticesSize
    );

    this.selectionEdges = this.compute.createTexture(edgesSize, edgesSize);

    this.vertices = new Vertices(
      three,
      maxVertices,
      this.vertexPositions,
      this.selectionVertices
    );

    this.edges = new Edges(three, maxEdges, this.vertexPositions, this.selectionEdges);

    this.raycastTarget = new DynamicRenderTarget(three.renderer, {
      format: RGBAFormat,
      type: FloatType,
    });

    this.flagProgram = this.compute.createProgram(flag);
    this.selectProgram = this.compute.createProgram(select);

    this.dragProgram = this.compute.createSpecialProgram(drag);
  }

  selection(min: Vector2, max: Vector2, select = true, preview = true) {
    this.selectProgram.setUniform('min', min);
    this.selectProgram.setUniform('max', max);
    this.selectProgram.setUniform('select', select);
    this.selectProgram.setUniform('preview', preview);

    this.selectProgram.setUniform('projectionMatrix', this.three.camera.projectionMatrix);
    this.three.camera.updateMatrixWorld();
    this.selectProgram.setUniform('_viewMatrix', this.three.camera.matrixWorldInverse);
    this.selectProgram.setUniform('screenResolution', this.three.resolution);
    this.selectProgram.setUniform('size', this.three.camera.zoom * 400);

    this.selectProgram.setUniform('positions', this.vertexPositions);
    this.selectProgram.setUniform('selection', this.selectionVertices);

    this.selectProgram.execute(this.selectionVertices);
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

  isSelected(type: ObjectType, id: number) {
    const texture = { vertex: this.selectionVertices, edge: this.selectionEdges }[type];

    const x = id % texture.width;
    const y = Math.floor(id / texture.width);

    const data = texture.read(x, y, 1, 1);
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
    this.dragProgram.setUniform('selectionVertices', this.selectionVertices);
    this.dragProgram.setUniform('selectionEdges', this.selectionEdges);

    this.dragProgram.setUniform('offset', offset);

    this.dragProgram.execute(this.vertexPositions.width * this.vertexPositions.height, this.vertexPositions);
  }

  raycast(pointer: Vector2) {
    return new Promise<RaycastResult | undefined>((resolve) => {
      this.three.scene.children.forEach((child) => {
        child.visible = !!child.userData.raycastable;

        if (child.userData.raycastable) {
          (child as any).material.uniforms.raycast.value = true;
        }
      });

      const target = this.raycastTarget.target();

      const pixel = this.three.screenToImage(pointer);
      const min = pixel
        .clone()
        .sub(new Vector2(PIXEL_RADIUS, PIXEL_RADIUS).multiplyScalar(0.5));

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

      this.three.renderer.readRenderTargetPixelsAsync(
        target,
        min.x,
        min.y,
        PIXEL_RADIUS,
        PIXEL_RADIUS,
        pixelBuffer
      ).then(() => {
        for (let i = 0; i < pixels.length; i++) {
          const [x, y] = pixels[i];
          const index = (x + PIXEL_RADIUS * y) * 4;

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

      this.three.scene.children.forEach((child) => {
        child.visible = true;

        if (child.userData.raycastable) {
          (child as any).material.uniforms.raycast.value = false;
        }
      });
    });
  }

  generateVertices() {
    const size = this.vertexPositions.width;
    const data = new Float32Array(size * size * 4);

    for (let i = 0; i < size * size; i++) {
      data[i * 4 + 0] = (i % size) * 20 + Math.random() * 10;
      data[i * 4 + 1] = Math.floor(i / size) * 20 + Math.random() * 10;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 1;
    }

    this.vertexPositions.write(0, 0, size, size, data);
  }
}
