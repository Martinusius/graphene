import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  DoubleSide,
  Mesh,
  NormalBlending,
  OrthographicCamera,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";
import {
  GPUComputationRenderer,
  type Variable,
} from "three/examples/jsm/Addons.js";

import {
  vertexColor as vertexVertexColor,
  fragmentColor as fragmentVertexColor,
} from "./vertex.glsl";
import {
  vertexColor as vertexEdgeColor,
  fragmentColor as fragmentEdgeColor,
} from "./edge.glsl";

import { select } from "./select.glsl";
import { EdgeBuffer } from "../edgebuffer";

export class Vertices {
  private points: Points;
  private edges: Mesh;

  private vertexGeometry: BufferGeometry;
  private edgeGeometry: BufferGeometry;

  private vertexMaterial: ShaderMaterial;
  private edgeMaterial: ShaderMaterial;

  private compute: GPUComputationRenderer;
  // private edgeCompute: GPUComputationRenderer;

  private selectionVariable: Variable;

  constructor(
    public renderer: WebGLRenderer,
    public camera: Camera,
    scene: Scene,
    public readonly vertexCount: number,
    public readonly edgeCount: number = vertexCount / 2
  ) {
    this.vertexGeometry = new BufferGeometry();
    // this.edgeGeometry = new BufferGeometry();

    const size = Math.ceil(Math.sqrt(Math.max(vertexCount, edgeCount)));

    this.compute = new GPUComputationRenderer(size, size, renderer);
    const positions = this.compute.createTexture();
    const selection = this.compute.createTexture();

    const data = new Float32Array(size * size * 3);

    for (let i = 0; i < vertexCount; i++) {
      data[i * 3 + 0] = (i % size) / size;
      data[i * 3 + 1] = Math.floor(i / size) / size;
      data[i * 3 + 2] = i + 1;
    }

    function random() {
      return Math.random() * 2 - 1;
    }

    for (let i = 0; i < vertexCount / 2; i++) {
      const x = random() * 5000;
      const y = random() * 5000;

      positions.image.data[i * 8 + 0] = x;
      positions.image.data[i * 8 + 1] = y;
      positions.image.data[i * 8 + 2] = 0;

      positions.image.data[i * 8 + 4] = x + random() * 20;
      positions.image.data[i * 8 + 5] = y + random() * 20;
      positions.image.data[i * 8 + 6] = 0;
    }

    const edges = new EdgeBuffer(edgeCount, size);
    for (let i = 0; i < edgeCount; i++) {
      edges.addEdge(i * 2, i * 2 + 1, true, true);
    }

    this.edgeGeometry = edges.geometry;

    this.selectionVariable = this.compute.addVariable(
      "selection",
      select,
      selection
    );

    this.selectionVariable.material.uniforms.positions = { value: positions };
    this.selectionVariable.material.uniforms.selection = { value: selection };
    this.selectionVariable.material.uniforms.select = { value: true };
    this.selectionVariable.material.uniforms.preview = { value: true };
    this.selectionVariable.material.uniforms.min = {
      value: new Vector2(100, 300),
    };
    this.selectionVariable.material.uniforms.max = {
      value: new Vector2(700, 900),
    };
    this.selectionVariable.material.uniforms.projectionMatrix = {
      value: camera.projectionMatrix,
    };
    this.selectionVariable.material.uniforms._viewMatrix = {
      value: camera.matrixWorldInverse,
    };
    this.selectionVariable.material.uniforms.size = { value: 10 };
    this.selectionVariable.material.uniforms.screenResolution = {
      value: new Vector2(renderer.domElement.width, renderer.domElement.height),
    };

    this.compute.setVariableDependencies(this.selectionVariable, [
      this.selectionVariable,
    ]);

    this.compute.init();

    this.vertexGeometry.setAttribute("position", new BufferAttribute(data, 3));

    this.vertexMaterial = new ShaderMaterial({
      uniforms: {
        positions: { value: positions },
        selection: { value: selection },
        size: { value: 40 },
        resolution: {
          value: new Vector2(
            this.renderer.domElement.width,
            this.renderer.domElement.height
          ),
        },
      },
      transparent: true,
      depthWrite: true,
      blendAlpha: 0.5,
      vertexShader: vertexVertexColor,
      fragmentShader: fragmentVertexColor,
    });

    this.points = new Points(this.vertexGeometry, this.vertexMaterial);
    this.points.frustumCulled = false;

    this.points.onBeforeRender = (
      renderer,
      scene,
      camera: OrthographicCamera
    ) => {
      this.vertexMaterial.uniforms.size.value = camera.zoom * 400;

      this.selectionVariable.material.uniforms.size.value =
        this.vertexMaterial.uniforms.size.value;
    };

    this.edgeMaterial = new ShaderMaterial({
      uniforms: {
        positions: { value: positions },
        resolution: {
          value: new Vector2(
            this.renderer.domElement.width,
            this.renderer.domElement.height
          ),
        },
        size: { value: 40 },
      },
      transparent: true,
      depthWrite: true,
      blendAlpha: 0.5,
      vertexShader: vertexEdgeColor,
      fragmentShader: fragmentEdgeColor,
    });

    this.edges = new Mesh(this.edgeGeometry, this.edgeMaterial);
    this.edges.frustumCulled = false;

    this.edges.onBeforeRender = (
      renderer,
      scene,
      camera: OrthographicCamera
    ) => {
      this.edgeMaterial.uniforms.size.value = camera.zoom * 400;
    };

    scene.add(this.edges);
    scene.add(this.points);

    window.addEventListener("resize", () => {
      this.vertexMaterial.uniforms.resolution.value.set(
        this.renderer.domElement.width,
        this.renderer.domElement.height
      );
      this.edgeMaterial.uniforms.resolution.value.set(
        this.renderer.domElement.width,
        this.renderer.domElement.height
      );

      this.selectionVariable.material.uniforms.screenResolution.value.set(
        this.renderer.domElement.width,
        this.renderer.domElement.height
      );
    });
  }

  selection(min: Vector2, max: Vector2, select = true, preview = true) {
    this.selectionVariable.material.uniforms.min.value = min;
    this.selectionVariable.material.uniforms.max.value = max;
    this.selectionVariable.material.uniforms.select.value = select;
    this.selectionVariable.material.uniforms.preview.value = preview;

    this.selectionVariable.material.uniforms.projectionMatrix.value =
      this.camera.projectionMatrix;
    this.camera.updateMatrixWorld();
    this.selectionVariable.material.uniforms._viewMatrix.value =
      this.camera.matrixWorldInverse;

    this.compute.compute();

    this.vertexMaterial.uniforms.selection.value =
      this.compute.getCurrentRenderTarget(this.selectionVariable).texture;
  }
}
