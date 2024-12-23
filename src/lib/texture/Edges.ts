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
    vertexPositions: ComputeTexture
  ) {
    const size = vertexPositions.width;
    console.log(size);

    const edges = new EdgeBuffer(edgeCount, size);
    // let j = -1;

    for (let i = 0; i < edgeCount; i++) {
      // const u = Math.floor(Math.random() * size * size);
      // const v = Math.floor(Math.random() * size * size);

      // if (j++ % size === size - 2) continue;


      edges.addEdge(i, i + 1, true, true);
    }

    const material = new ShaderMaterial({
      uniforms: {
        positions: { value: null },
        resolution: {
          value: new Vector2(
            three.renderer.domElement.width,
            three.renderer.domElement.height
          ),
        },
        size: { value: 40 },
        raycast: { value: false },
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

      this.edges.material.uniforms.resolution.value.copy(three.resolution)
    };

    three.scene.add(this.edges);
  }
}
