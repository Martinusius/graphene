import {
  BufferAttribute,
  BufferGeometry,
  OrthographicCamera,
  Points,
  ShaderMaterial,
  Vector2,
} from "three";
import type { Three } from "./Three";
import type { ComputeTexture } from "./Compute";
import { vertexFragment, vertexVertex } from "./vertex.glsl";

export class Vertices {
  private points: Points<BufferGeometry, ShaderMaterial>;

  constructor(
    three: Three,
    vertexCount: number,
    positions: ComputeTexture,
    selection: ComputeTexture
  ) {
    const geometry = new BufferGeometry();
    geometry.setDrawRange(0, vertexCount);

    const material = new ShaderMaterial({
      uniforms: {
        positions: { value: null },
        selection: { value: null },
        size: { value: 40 },
        resolution: {
          value: three.resolution,
        },
        raycast: { value: false },
        bufferSize: { value: positions.width },
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

      this.points.material.uniforms.positions.value =
        positions.readable().texture;
      this.points.material.uniforms.selection.value =
        selection.readable().texture;

      this.points.material.uniforms.resolution.value.copy(three.resolution);
    };

    three.scene.add(this.points);
  }
}
