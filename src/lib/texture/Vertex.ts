import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  DataTexture,
  DoubleSide,
  FloatType,
  Matrix4,
  Mesh,
  NormalBlending,
  OrthographicCamera,
  PerspectiveCamera,
  Points,
  Raycaster,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
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
import { PIXEL_RADIUS, pixels } from "./pixels";

export class Vertices {
  private points: Points<BufferGeometry, ShaderMaterial>;
  private edges: Mesh;

  private vertexGeometry: BufferGeometry;
  private edgeGeometry: BufferGeometry;

  private vertexMaterial: ShaderMaterial;
  private edgeMaterial: ShaderMaterial;

  private compute: GPUComputationRenderer;
  // private edgeCompute: GPUComputationRenderer;

  private resolution: Vector2;

  private selectionVariable: Variable;

  private raycaster = new Raycaster();
  private raycastTarget: WebGLRenderTarget;
  private readonly size: number;

  private selectionTexture: DataTexture;

  constructor(
    public renderer: WebGLRenderer,
    public camera: OrthographicCamera,
    public scene: Scene,
    public readonly vertexCount: number,
    public readonly edgeCount: number = vertexCount / 2
  ) {
    this.vertexGeometry = new BufferGeometry();
    // this.edgeGeometry = new BufferGeometry();

    this.resolution = new Vector2(
      this.renderer.domElement.width,
      this.renderer.domElement.height
    );

    this.raycastTarget = new WebGLRenderTarget(this.resolution.x, this.resolution.y, {
      format: RGBAFormat,
      type: FloatType,
    });


    this.size = Math.ceil(Math.sqrt(Math.max(vertexCount, edgeCount)));

    this.compute = new GPUComputationRenderer(this.size, this.size, renderer);
    const positions = this.compute.createTexture();
    const selection = this.compute.createTexture();

    this.selectionTexture = selection;

    const data = new Float32Array(this.size * this.size * 3);

    for (let i = 0; i < vertexCount; i++) {
      data[i * 3 + 0] = (i % this.size) / this.size;
      data[i * 3 + 1] = Math.floor(i / this.size) / this.size;
      data[i * 3 + 2] = i + 1;
    }

    function random() {
      return Math.random() * 2 - 1;
    }

    for (let i = 0; i < vertexCount / 2; i++) {
      const x = random() * 100;
      const y = random() * 100;

      positions.image.data[i * 8 + 0] = x;
      positions.image.data[i * 8 + 1] = y;
      positions.image.data[i * 8 + 2] = 0;

      positions.image.data[i * 8 + 4] = x + random() * 20;
      positions.image.data[i * 8 + 5] = y + random() * 20;
      positions.image.data[i * 8 + 6] = 0;
    }

    const edges = new EdgeBuffer(edgeCount, this.size);
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
        raycast: { value: false },
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

    this.points.userData.raycast = true;

    scene.add(this.edges);
    scene.add(this.points);

    window.addEventListener("resize", () => {
      this.resolution.set(
        this.renderer.domElement.width,
        this.renderer.domElement.height
      );

      this.vertexMaterial.uniforms.resolution.value.copy(this.resolution);
      this.edgeMaterial.uniforms.resolution.value.copy(this.resolution);
      this.selectionVariable.material.uniforms.screenResolution.value.copy(
        this.resolution
      );
    });
  }

  screenCoordsToImageCoords(screenCoords: Vector2) {
    return screenCoords.clone().addScalar(1).multiplyScalar(0.5).multiply(this.resolution);
  }

  raycast(pointer: Vector2) {
    // this.raycaster.setFromCamera(pointer, this.camera);

    this.scene.children.forEach((child) => {
      child.userData.visibleBeforeRaycast = child.visible;
      child.visible = !!child.userData.raycast;
    });

    // const { origin, direction } = this.raycaster.ray;

    // const backup = this.camera.clone();

    // this.camera.position.copy(origin);
    // this.camera.lookAt(origin.clone().add(direction));

    this.points.material.uniforms.raycast.value = true;

    const pixel = this.screenCoordsToImageCoords(pointer);
    const min = pixel.clone().sub(new Vector2(PIXEL_RADIUS, PIXEL_RADIUS).multiplyScalar(0.5));




    this.renderer.setRenderTarget(this.raycastTarget);
    this.renderer.setScissor(min.x, min.y, PIXEL_RADIUS, PIXEL_RADIUS);
    this.renderer.setScissorTest(true);
    this.renderer.render(this.scene, this.camera);

    const pixelBuffer = new Float32Array(4 * PIXEL_RADIUS * PIXEL_RADIUS);

    this.renderer.readRenderTargetPixels(
      this.raycastTarget,
      min.x,
      min.y,
      PIXEL_RADIUS,
      PIXEL_RADIUS,
      // 0,
      // 0,
      // PIXEL_RADIUS,
      // PIXEL_RADIUS,
      pixelBuffer
    );


    this.renderer.setRenderTarget(null);
    this.renderer.setScissorTest(false);


    let id;

    for (let i = 0; i < pixels.length; i++) {
      const [x, y] = pixels[i];
      const index = (x + PIXEL_RADIUS * y) * 4;

      if (pixelBuffer[index] < 1) continue;

      // id = [pixelBuffer[index], pixelBuffer[index + 1]];
      id = pixelBuffer[index];
      break;
    }

    // this.camera.copy(backup);

    this.scene.children.forEach((child) => {
      child.visible = child.userData.visibleBeforeRaycast;
    });

    this.points.material.uniforms.raycast.value = false;

    if (!id) return;

    // return id[0] * this.size + id[1] * this.size * this.size;
    return id - 1;
  }

  select(id: number) {
    this.selectionTexture.image.data[id * 4] = 1;
    this.selectionTexture.image.data[id * 4 + 1] = 1;
    this.selectionTexture.needsUpdate = true;
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

    console.log(this.compute.getCurrentRenderTarget(this.selectionVariable).texture.image)

    // this.selectionTexture = this.vertexMaterial.uniforms.selection.value;
  }
}
