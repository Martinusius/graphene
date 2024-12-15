import { Box2, Camera, DataTexture, FloatType, Mesh, PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, Vector2, WebGLRenderTarget, type WebGLRenderer } from "three";
import { computeVertex } from "./compute.glsl";

type Globals = {
  renderer: WebGLRenderer;
  camera: Camera;
  scene: Scene;
  mesh: Mesh;
}


export class ComputeTexture {
  private textures: [WebGLRenderTarget, WebGLRenderTarget];

  constructor(public readonly globals: Globals, public readonly width: number, public readonly height: number) {
    this.textures = [
      new WebGLRenderTarget(width, height, { type: FloatType, format: RGBAFormat }),
      new WebGLRenderTarget(width, height, { type: FloatType, format: RGBAFormat })
    ];
  }

  read(x: number, y: number, width: number, height: number) {
    const buffer = new Float32Array(4 * width * height);
    this.globals.renderer.readRenderTargetPixels(this.readable(), x, y, width, height, buffer);
    return buffer;
  }

  write(x: number, y: number, width: number, height: number, data: Float32Array) {
    const texture = new DataTexture(data, width, height, RGBAFormat, FloatType);
    texture.needsUpdate = true;
    this.globals.renderer.copyTextureToTexture(
      texture,
      this.readable().texture,
      new Box2(new Vector2(), new Vector2(width, height)),
      new Vector2(x, y)
    );
    texture.dispose();
  }

  readable() {
    return this.textures[0];
  }

  writable() {
    return this.textures[1];
  }

  swap() {
    this.textures.reverse();
  }
}

export class ComputeProgram {
  private readonly material: ShaderMaterial;

  constructor(
    private readonly globals: Globals,
    public readonly fragmentShader: string,
    uniforms: any = {}
  ) {
    this.material = new ShaderMaterial({
      uniforms: Object.fromEntries(Object.entries(uniforms).map(([key, value]) => [key, { value }])),
      vertexShader: computeVertex,
      fragmentShader,
    });
  }

  private computeTextureUniforms: { [key: string]: ComputeTexture } = {};


  setUniform(key: string, value: any) {
    if (key in this.computeTextureUniforms) {
      this.material.uniforms[key].value = null;
      delete this.computeTextureUniforms[key];
    }

    if (value instanceof ComputeTexture) {
      this.computeTextureUniforms[key] = value;
    } else {
      this._setUniform(key, value);
    }
  }

  private _setUniform(key: string, value: any) {
    if (!this.material.uniforms[key]) {
      this.material.uniforms[key] = { value };
    } else {
      this.material.uniforms[key].value = value;
    }
  }

  execute(output: ComputeTexture) {
    const prevTarget = this.globals.renderer.getRenderTarget();

    for (const [key, value] of Object.entries(this.computeTextureUniforms)) {
      this._setUniform(key, value.readable().texture);
    }

    this.globals.mesh.material = this.material;
    this.globals.renderer.setRenderTarget(output.writable());
    this.globals.renderer.render(this.globals.scene, this.globals.camera);
    output.swap();

    this.globals.renderer.setRenderTarget(prevTarget);
  }
}

export class Compute {
  private scene: Scene;
  private camera: Camera;
  private mesh: Mesh;

  constructor(public readonly renderer: WebGLRenderer) {
    this.scene = new Scene();
    this.camera = new Camera();

    this.mesh = new Mesh(new PlaneGeometry(2, 2));
    this.scene.add(this.mesh);
  }

  createTexture(width: number, height: number) {
    return new ComputeTexture(
      { renderer: this.renderer, mesh: this.mesh, camera: this.camera, scene: this.scene },
      width,
      height
    );
  }

  createProgram(fragmentShader: string, uniforms: any = {}) {
    return new ComputeProgram(
      { renderer: this.renderer, mesh: this.mesh, camera: this.camera, scene: this.scene },
      fragmentShader,
      uniforms
    );
  }
}