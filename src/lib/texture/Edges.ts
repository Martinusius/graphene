import {
  BufferGeometry,
  InstancedBufferGeometry,
  Mesh,
  OrthographicCamera,
  ShaderMaterial,
  Vector2,
} from "three";

import type { Three } from "./Three";
import { edgeFragment, edgeVertex } from "./edge.glsl";
import type { ComputeBuffer } from "./compute/ComputeBuffer";
import { EdgeBuffer } from "../EdgeBuffer";

export class Edges {
  private edges: Mesh<InstancedBufferGeometry, ShaderMaterial>;

  set count(value: number) {
    this.edges.geometry.instanceCount = value;
  }

  get count() {
    return this.edges.geometry.instanceCount;
  }

  constructor(
    three: Three,
    edgeData: ComputeBuffer,
    vertexData: ComputeBuffer
  ) {
    const vertexSize = vertexData.width;
    const edgeSize = edgeData.width;

    const edges = new EdgeBuffer();

    const material = new ShaderMaterial({
      uniforms: {
        edgeData: { value: null },
        vertexData: { value: null },
        resolution: {
          value: new Vector2(
            three.renderer.domElement.width,
            three.renderer.domElement.height
          ),
        },
        size: { value: 40 },
        raycast: { value: false },
        edgeSize: { value: edgeSize },
        vertexSize: { value: vertexSize },
      },
      transparent: true,
      depthWrite: true,
      blendAlpha: 0.5,
      vertexShader: edgeVertex,
      fragmentShader: edgeFragment,
    });

    this.edges = new Mesh(edges.geometry, material);
    this.edges.frustumCulled = false;
    this.edges.geometry.instanceCount = 0;
    this.edges.userData.raycastable = true;

    this.edges.onBeforeRender = (_, __, camera: OrthographicCamera) => {
      this.edges.material.uniforms.size.value = camera.zoom * 400;
      this.edges.material.uniforms.vertexSize.value = vertexData.width;
      this.edges.material.uniforms.edgeSize.value = edgeData.width;

      this.edges.material.uniforms.edgeData.value = edgeData.readable().texture;
      this.edges.material.uniforms.vertexData.value =
        vertexData.readable().texture;

      this.edges.material.uniforms.resolution.value.copy(three.resolution);
    };

    three.scene.add(this.edges);
  }
}
