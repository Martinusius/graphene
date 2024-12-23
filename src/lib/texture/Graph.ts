import { FloatType, RGBAFormat, Vector2, Vector3 } from "three";
import { Compute, ComputeTexture } from "./Compute";
import { DynamicRenderTarget } from "./DynamicRenderTarget";
import { Edges } from "./Edges";
import type { Three } from "./Three";
import { Vertices } from "./Vertices";
import { PIXEL_RADIUS, pixels } from "./pixels";

export class Graph {
  private compute: Compute;

  private vertexPositions: ComputeTexture;

  private selectionVertices: ComputeTexture;
  private selectionEdges: ComputeTexture;

  private vertices: Vertices;
  private edges: Edges;

  private raycastTarget: DynamicRenderTarget;

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

    this.edges = new Edges(three, maxEdges, this.vertexPositions);

    this.raycastTarget = new DynamicRenderTarget(three.renderer, {
      format: RGBAFormat,
      type: FloatType,
    });

  }

  select(id: number, select: boolean) {
    const x = id % this.selectionVertices.width;
    const y = Math.floor(id / this.selectionVertices.width);

    this.selectionVertices.write(
      x,
      y,
      1,
      1,
      new Float32Array([Number(select), Number(select), 0, 0])
    );
  }

  raycast(pointer: Vector2) {
    // print scene coordinates from pointer
    // console.log(new Vector3(pointer.x, pointer.y, 0).unproject(this.three.camera));

    return new Promise<number | undefined>((resolve) => {

      this.three.scene.children.forEach((child) => {
        child.visible = child.userData.raycastable;

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

          if (pixelBuffer[index] < 1) continue;

          resolve(pixelBuffer[index] - 1);
          break;
        }
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
      data[i * 4 + 0] = (i % size) * 20;
      data[i * 4 + 1] = Math.floor(i / size) * 20;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 1;
    }

    this.vertexPositions.write(0, 0, size, size, data);
  }
}
