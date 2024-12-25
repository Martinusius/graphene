import {
  BufferGeometry,
  Mesh,
  OrthographicCamera,
  ShaderMaterial,
  Vector2,
} from "three";
import { EdgeBuffer } from "../EdgeBuffer";
import type { ComputeTexture } from "./Compute";
import type { Three } from "./Three";
import { edgeFragment, edgeVertex } from "./edge.glsl";

export class Edges {
  private edges: Mesh<BufferGeometry, ShaderMaterial>;

  constructor(
    three: Three,
    edgeCount: number,
    vertexPositions: ComputeTexture,
    selectionEdges: ComputeTexture
  ) {
    const vertexSize = vertexPositions.width;

    const size = selectionEdges.width;

    const edges = new EdgeBuffer(edgeCount, vertexSize);

    for (let i = 0; i < edgeCount; i++) {
      if (i % size === size - 1) continue;
      edges.addEdge(i, i + 1, true, true);
    }

    const material = new ShaderMaterial({
      uniforms: {
        positions: { value: null },
        selection: { value: null },
        resolution: {
          value: new Vector2(
            three.renderer.domElement.width,
            three.renderer.domElement.height
          ),
        },
        size: { value: 40 },
        raycast: { value: false },
        bufferSize: { value: size },
      },
      transparent: true,
      depthWrite: true,
      blendAlpha: 0.5,
      vertexShader: edgeVertex,
      fragmentShader: edgeFragment,
    });

    this.edges = new Mesh(edges.geometry, material);
    this.edges.frustumCulled = false;
    this.edges.userData.raycastable = true;

    this.edges.onBeforeRender = (_, __, camera: OrthographicCamera) => {
      this.edges.material.uniforms.size.value = camera.zoom * 400;

      this.edges.material.uniforms.positions.value =
        vertexPositions.readable().texture;
      this.edges.material.uniforms.selection.value =
        selectionEdges.readable().texture;

      this.edges.material.uniforms.resolution.value.copy(three.resolution)
    };

    three.scene.add(this.edges);
  }
}
