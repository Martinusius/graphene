import {
  BufferAttribute,
  BufferGeometry,
  OrthographicCamera,
  Points,
  ShaderMaterial,
} from "three";
import type { Three } from "./Three";
import type { ComputeTexture } from "./Compute";
import { vertexFragment, vertexVertex } from "./vertex.glsl";
import type { ComputeBuffer } from "./compute/ComputeBuffer";

export class Vertices {
  private points: Points<BufferGeometry, ShaderMaterial>;

  set count(value: number) {
    this.points.geometry.setDrawRange(0, value);
  }

  get count() {
    return this.points.geometry.drawRange.count;
  }

  constructor(
    three: Three,
    vertexData: ComputeBuffer,
  ) {
    const geometry = new BufferGeometry();
    geometry.setDrawRange(0, 0);

    const material = new ShaderMaterial({
      uniforms: {
        vertexData: { value: null },
        size: { value: 40 },
        resolution: {
          value: three.resolution,
        },
        raycast: { value: false },
        bufferSize: { value: vertexData.width },
      },
      transparent: true,
      depthWrite: true,
      blendAlpha: 0.5,
      vertexShader: vertexVertex,
      fragmentShader: vertexFragment,
    });

    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.userData.raycastable = true;

    this.points.onBeforeRender = (_, __, camera: OrthographicCamera) => {
      this.points.material.uniforms.size.value = camera.zoom * 400;
      this.points.material.uniforms.bufferSize.value = vertexData.width;

      this.points.material.uniforms.vertexData.value =
        vertexData.readable().texture;

      this.points.material.uniforms.resolution.value.copy(three.resolution);
    };

    three.scene.add(this.points);
  }
}
