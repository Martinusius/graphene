import {
  Box2,
  BufferGeometry,
  Camera,
  Color,
  CustomBlending,
  DataTexture,
  DstAlphaFactor,
  FloatType,
  GLSL3,
  Mesh,
  NearestFilter,
  OneFactor,
  PlaneGeometry,
  Points,
  RawShaderMaterial,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type PixelFormat,
  type WebGLRenderer,
} from "three";
import {
  computeVertex,
  computeFragment,
  specialComputeFragment,
  specialComputeVertex,
} from "./compute.glsl";
import { Float4, type TextureFormat } from "./TextureFormat";

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
    public readonly height: number,
    format: TextureFormat
  ) {
    this.textures = [
      new WebGLRenderTarget(width, height, {
        type: format.type,
        format: format.format,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
      }),
      new WebGLRenderTarget(width, height, {
        type: format.type,
        format: format.format,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
      }),
    ];

    this.globals.renderer.initRenderTarget(this.textures[0]);
    this.globals.renderer.initRenderTarget(this.textures[1]);
  }

  async read(x: number, y: number, width: number, height: number) {
    const buffer = new Float32Array(4 * width * height);


    await this.globals.renderer.readRenderTargetPixelsAsync(
      this.readable(),
      x,
      y,
      width,
      height,
      buffer
    );


    return buffer;
  }

  readUint(x: number, y: number, width: number, height: number) {
    const gl = this.globals.renderer.getContext() as WebGL2RenderingContext;
    const texture = (this.globals.renderer.properties.get(this.readable().texture) as any).texture as WebGLTexture;

    const array = new Uint8Array(width * height + 500);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
    const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);

    console.log(format, type);
    // console.log(gl.RED_INTEGER, gl.UNSIGNED_BYTE);

    gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, array);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return array;
  }

  write(
    x: number,
    y: number,
    width: number,
    height: number,
    data: Float32Array | Int32Array | Uint32Array | Uint8Array
  ) {


    const texture = new DataTexture(data, width, height, this.readable().texture.format as PixelFormat, this.readable().texture.type);
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
    this.material = new RawShaderMaterial({
      uniforms: Object.fromEntries(
        Object.entries(uniforms).map(([key, value]) => [key, { value }])
      ),
      vertexShader: computeVertex,
      fragmentShader: computeFragment + shader,
      glslVersion: GLSL3,
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
    additive = false,
    uniforms: any = {}
  ) {
    const material = new RawShaderMaterial({
      uniforms: Object.fromEntries(
        Object.entries(uniforms).map(([key, value]) => [key, { value }])
      ),
      vertexShader: specialComputeVertex + shader,
      fragmentShader: specialComputeFragment,
      glslVersion: GLSL3,
      ...(additive ? {
        blending: CustomBlending,
        blendDst: OneFactor,
        blendSrc: OneFactor
      } : {})
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

  constructor(public readonly renderer: WebGLRenderer) {
    this.scene = new Scene();
    this.camera = new Camera();

    this.mesh = new Mesh(new PlaneGeometry(2, 2));
    this.mesh.visible = false;
    this.scene.add(this.mesh);
  }

  createTexture(width: number, height: number, format: TextureFormat = Float4) {
    return new ComputeTexture(
      {
        renderer: this.renderer,
        mesh: this.mesh,
        camera: this.camera,
        scene: this.scene,
        compute: this,
      },
      width,
      height,
      format
    );
  }

  createTextureBuffer(capacity: number, format: TextureFormat = Float4) {
    const size = Math.ceil(Math.sqrt(capacity));
    return this.createTexture(size, size, format);
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

  createSpecialProgram(shader: string, additive = false, uniforms: any = {}) {
    return new SpecialComputeProgram(
      {
        renderer: this.renderer,
        mesh: this.mesh,
        camera: this.camera,
        scene: this.scene,
        compute: this,
      },
      shader,
      additive,
      uniforms
    );
  }
}
