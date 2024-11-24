import { BufferAttribute, BufferGeometry, NormalBlending, Points, Scene, ShaderMaterial, Vector2, WebGLRenderer } from "three";
import { GPUComputationRenderer } from "three/examples/jsm/Addons.js";

import {
  vertexColor,
  fragmentColor,
} from "./vertex.glsl";


export class Vertices {
  private points: Points;
  private geometry: BufferGeometry;

  private colorMaterial: ShaderMaterial;

  constructor(public renderer: WebGLRenderer, scene: Scene, vertexCount: number) {
    this.geometry = new BufferGeometry();

    const size = Math.ceil(Math.sqrt(vertexCount));

    const gpuCompute = new GPUComputationRenderer(size, size, renderer);
    const positions = gpuCompute.createTexture();

    const data = new Float32Array(size * size * 3);

    for (let i = 0; i < vertexCount; i++) {
      data[i * 3 + 0] = (i % size) / size;
      data[i * 3 + 1] = Math.floor(i / size) / size;
      data[i * 3 + 2] = i + 1;
    }




    for (let i = 0; i < size * size; i++) {
      positions.image.data[i * 4 + 0] = Math.random() * 1000;
      positions.image.data[i * 4 + 1] = Math.random() * 1000;
      positions.image.data[i * 4 + 2] = 0;
    }




    this.geometry.setAttribute('position', new BufferAttribute(data, 3));

    this.colorMaterial = new ShaderMaterial({
      uniforms: {
        positions: { value: positions },
        size: { value: 10 },
        resolution: { value: new Vector2(this.renderer.domElement.width, this.renderer.domElement.height) }
      },
      transparent: true,
      depthWrite: true,
      blendAlpha: 0.5,
      vertexShader: vertexColor,
      fragmentShader: fragmentColor,
    });

    this.points = new Points(this.geometry, this.colorMaterial);
    this.points.frustumCulled = false;

    scene.add(this.points);

    window.addEventListener('resize', () => {
      this.colorMaterial.uniforms.resolution.value.set(this.renderer.domElement.width, this.renderer.domElement.height);
    });
  }


}