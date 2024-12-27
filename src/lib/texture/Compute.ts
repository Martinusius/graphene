import {
  Box2,
  BufferAttribute,
  BufferGeometry,
  Camera,
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  FloatType,
  Mesh,
  NearestFilter,
  PlaneGeometry,
  Points,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import {
  computeVertex,
  computeFragment,
  specialComputeFragment,
  specialComputeVertex,
} from "./compute.glsl";

type ComputeGlobals = {
  renderer: WebGLRenderer;
  camera: Camera;
  scene: Scene;
  mesh: Mesh;
  compute: Compute;
};

export class ComputeTexture {
  private textures: [WebGLRenderTarget, WebGLRenderTarget];

  constructor(
    private readonly globals: ComputeGlobals,
    public readonly width: number,
    public readonly height: number
  ) {
    this.textures = [
      new WebGLRenderTarget(width, height, {
        type: FloatType,
        format: RGBAFormat,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
      }),
      new WebGLRenderTarget(width, height, {
        type: FloatType,
        format: RGBAFormat,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
      }),
    ];

    this.globals.compute.zeros.execute(this);
    this.globals.compute.zeros.execute(this);
  }

  async read(x: number, y: number, width: number, height: number) {
    const buffer = new Float32Array(4 * width * height);

    // const target = this.globals.renderer.getRenderTarget();

    // this.globals.renderer.setRenderTarget(this.readable());
    await this.globals.renderer.readRenderTargetPixelsAsync(
      this.readable(),
      x,
      y,
      width,
      height,
      buffer
    );

    // this.globals.renderer.setRenderTarget(target);

    return buffer;
  }

  write(
    x: number,
    y: number,
    width: number,
    height: number,
    data: Float32Array
  ) {
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

/**
 * - Executed once for every pixel of output texture.
 * - Can only write its own pixel.
 * - Based on fragment shader.
 * - Set `gl_FragColor` to write pixel value.
 */
export class ComputeProgram {
  private readonly material: ShaderMaterial;

  constructor(
    private readonly globals: ComputeGlobals,
    public readonly shader: string,
    uniforms: any = {}
  ) {
    this.material = new ShaderMaterial({
      uniforms: Object.fromEntries(
        Object.entries(uniforms).map(([key, value]) => [key, { value }])
      ),
      vertexShader: computeVertex,
      fragmentShader: computeFragment + shader,
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
      const texture = value.readable().texture;

      this._setUniform(key, texture);
      this._setUniform(
        key + "Size",
        new Vector2(texture.image.width, texture.image.height)
      );
    }

    const texture = output.writable().texture;
    this._setUniform(
      "outputSize",
      new Vector2(texture.image.width, texture.image.height)
    );

    this.globals.mesh.visible = true;
    this.globals.mesh.material = this.material;
    this.globals.renderer.setRenderTarget(output.writable());
    this.globals.renderer.render(this.globals.scene, this.globals.camera);

    output.swap();

    this.globals.mesh.visible = false;
    this.globals.renderer.setRenderTarget(prevTarget);
  }
}

/**
 * - Executed n times.
 * - Can write at arbitrary positions of output texture.
 * - Based on vertex shader.
 * - Use `gl_VertexID` to retrieve instance ID.
 * - Call `write(textureCoord: vec2, color: vec4)` to write pixel value.
 */
export class SpecialComputeProgram {
  private readonly points: Points<BufferGeometry, ShaderMaterial>;

  constructor(
    private readonly globals: ComputeGlobals,
    public readonly shader: string,
    uniforms: any = {}
  ) {
    const material = new ShaderMaterial({
      uniforms: Object.fromEntries(
        Object.entries(uniforms).map(([key, value]) => [key, { value }])
      ),
      vertexShader: specialComputeVertex + shader,
      fragmentShader: specialComputeFragment,
    });

    const geometry = new BufferGeometry();

    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;

    this.globals.scene.add(this.points);
    this.points.visible = false;
  }

  private computeTextureUniforms: { [key: string]: ComputeTexture } = {};

  setUniform(key: string, value: any) {
    if (key in this.computeTextureUniforms) {
      this.points.material.uniforms[key].value = null;
      delete this.computeTextureUniforms[key];
    }

    if (value instanceof ComputeTexture) {
      this.computeTextureUniforms[key] = value;
    } else {
      this._setUniform(key, value);
    }
  }

  private _setUniform(key: string, value: any) {
    if (!this.points.material.uniforms[key]) {
      this.points.material.uniforms[key] = { value };
    } else {
      this.points.material.uniforms[key].value = value;
    }
  }

  execute(n: number, output: ComputeTexture) {
    const prevTarget = this.globals.renderer.getRenderTarget();

    for (const [key, value] of Object.entries(this.computeTextureUniforms)) {
      const texture = value.readable().texture;

      this._setUniform(key, texture);
      this._setUniform(
        key + "Size",
        new Vector2(texture.image.width, texture.image.height)
      );
    }

    const texture = output.writable().texture;
    this._setUniform(
      "outputSize",
      new Vector2(texture.image.width, texture.image.height)
    );

    this.points.visible = true;
    this.points.geometry.setDrawRange(0, n);

    const color = new Color();
    this.globals.renderer.getClearColor(color);
    const alpha = this.globals.renderer.getClearAlpha();

    this.globals.renderer.setRenderTarget(output.writable());
    this.globals.renderer.setClearColor(0x000000, 0);
    this.globals.renderer.render(this.globals.scene, this.globals.camera);
    output.swap();

    this.points.visible = false;
    this.globals.renderer.setClearColor(color, alpha);
    this.globals.renderer.setRenderTarget(prevTarget);
  }
}

export class Compute {
  private scene: Scene;
  private camera: Camera;
  private mesh: Mesh;

  public readonly zeros: ComputeProgram;

  constructor(public readonly renderer: WebGLRenderer) {
    this.scene = new Scene();
    this.camera = new Camera();

    this.mesh = new Mesh(new PlaneGeometry(2, 2));
    this.mesh.visible = false;
    this.scene.add(this.mesh);

    this.zeros = this.createProgram("void main() { gl_FragColor = vec4(0); }");
  }

  createTexture(width: number, height: number) {
    return new ComputeTexture(
      {
        renderer: this.renderer,
        mesh: this.mesh,
        camera: this.camera,
        scene: this.scene,
        compute: this,
      },
      width,
      height
    );
  }

  createProgram(shader: string, uniforms: any = {}) {
    return new ComputeProgram(
      {
        renderer: this.renderer,
        mesh: this.mesh,
        camera: this.camera,
        scene: this.scene,
        compute: this,
      },
      shader,
      uniforms
    );
  }

  createSpecialProgram(shader: string, uniforms: any = {}) {
    return new SpecialComputeProgram(
      {
        renderer: this.renderer,
        mesh: this.mesh,
        camera: this.camera,
        scene: this.scene,
        compute: this,
      },
      shader,
      uniforms
    );
  }
}
