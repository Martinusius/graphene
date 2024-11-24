import { BufferAttribute, BufferGeometry, Camera, NormalBlending, Points, Scene, ShaderMaterial, Vector2, WebGLRenderer } from "three";
import { GPUComputationRenderer, type Variable } from "three/examples/jsm/Addons.js";

import {
  vertexColor,
  fragmentColor,
} from "./vertex.glsl";
import { select } from "./select.glsl";


export class Vertices {
  private points: Points;
  private geometry: BufferGeometry;

  private colorMaterial: ShaderMaterial;

  private gpuCompute: GPUComputationRenderer;

  private selectionVariable: Variable;

  constructor(public renderer: WebGLRenderer, public camera: Camera, scene: Scene, vertexCount: number) {
    this.geometry = new BufferGeometry();

    const size = Math.ceil(Math.sqrt(vertexCount));

    this.gpuCompute = new GPUComputationRenderer(size, size, renderer);
    const positions = this.gpuCompute.createTexture();
    const selection = this.gpuCompute.createTexture();




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


    this.selectionVariable = this.gpuCompute.addVariable('selection', select, selection);

    this.selectionVariable.material.uniforms.positions = { value: positions };
    this.selectionVariable.material.uniforms.min = { value: new Vector2(100, 300) };
    this.selectionVariable.material.uniforms.max = { value: new Vector2(700, 900) };
    this.selectionVariable.material.uniforms.projectionMatrix = { value: camera.projectionMatrix };
    this.selectionVariable.material.uniforms._viewMatrix = { value: camera.matrixWorldInverse };
    this.selectionVariable.material.uniforms.size = { value: 10 };
    this.selectionVariable.material.uniforms.screenResolution = { value: new Vector2(renderer.domElement.width, renderer.domElement.height) };

    this.gpuCompute.init();






    this.geometry.setAttribute('position', new BufferAttribute(data, 3));

    this.colorMaterial = new ShaderMaterial({
      uniforms: {
        positions: { value: positions },
        selection: { value: selection },
        size: { value: 40 },
        resolution: { value: new Vector2(this.renderer.domElement.width, this.renderer.domElement.height) },
      },
      transparent: true,
      depthWrite: true,
      blendAlpha: 0.5,
      vertexShader: vertexColor,
      fragmentShader: fragmentColor,
    });

    this.points = new Points(this.geometry, this.colorMaterial);
    this.points.frustumCulled = false;

    this.points.onBeforeRender = (renderer, scene, camera) => {
      this.colorMaterial.uniforms.size.value = ((camera as any).zoom ?? 0.01) * 1000;
      this.selectionVariable.material.uniforms.size.value = this.colorMaterial.uniforms.size.value;
    };

    scene.add(this.points);

    window.addEventListener('resize', () => {
      this.colorMaterial.uniforms.resolution.value.set(this.renderer.domElement.width, this.renderer.domElement.height);
      this.selectionVariable.material.uniforms.screenResolution.value.set(this.renderer.domElement.width, this.renderer.domElement.height);
    });
  }

  selection(min: Vector2, max: Vector2) {
    this.selectionVariable.material.uniforms.min.value = min;
    this.selectionVariable.material.uniforms.max.value = max;
    this.selectionVariable.material.uniforms.projectionMatrix.value = this.camera.projectionMatrix;
    this.camera.updateMatrixWorld();
    this.selectionVariable.material.uniforms._viewMatrix.value = this.camera.matrixWorldInverse;

    this.gpuCompute.compute();

    this.colorMaterial.uniforms.selection.value = this.gpuCompute.getCurrentRenderTarget(this.selectionVariable).texture;
  }
}