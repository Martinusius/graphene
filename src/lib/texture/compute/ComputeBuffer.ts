import { Box2, DataTexture, FloatType, NearestFilter, RGBAFormat, Vector2, WebGLRenderTarget } from "three";
import type { ComputeGlobals } from "./ComputeGlobals";

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}

export class ComputeBuffer {
  private textures: [WebGLRenderTarget, WebGLRenderTarget];

  public get width() {
    return this.textures[0].width;
  }

  public get capacity() {
    return this.textures[0].width * this.textures[0].width;
  }

  constructor(
    private readonly globals: ComputeGlobals,
    public size: number,
  ) {
    const width = Math.ceil(Math.sqrt(size));

    this.textures = this.generateTextures(width);

  }

  private generateTextures(width: number) {
    const textures = [
      new WebGLRenderTarget(width, width, {
        type: FloatType,
        format: RGBAFormat,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
      }),
      new WebGLRenderTarget(width, width, {
        type: FloatType,
        format: RGBAFormat,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
      }),
    ] as [WebGLRenderTarget, WebGLRenderTarget];

    this.globals.renderer.initRenderTarget(textures[0]);
    this.globals.renderer.initRenderTarget(textures[1]);

    return textures;
  }

  dispose() {
    this.textures[0].dispose();
    this.textures[1].dispose();
  }

  async resizeKeep(size: number, erase = true) {
    if (size <= this.capacity) {
      this.size = size;
      return;
    }

    const width = Math.ceil(Math.sqrt(size));

    const newTextures = this.generateTextures(width);

    const data = erase ? undefined : await this.read(0, size);

    this.textures[0].dispose();
    this.textures[1].dispose();

    this.textures = newTextures;

    if (data) await this.write(data);
  }

  resizeErase(size: number) {
    if (size <= this.capacity) {
      this.size = size;
      return;
    }

    const width = Math.ceil(Math.sqrt(size));

    const newTextures = this.generateTextures(width);

    this.textures[0].dispose();
    this.textures[1].dispose();

    this.textures = newTextures;
  }

  async read(start: number | undefined = undefined, length = start === undefined ? this.size : 1) {
    start = start ?? 0;

    if (length <= 0) throw new Error("length must be greater than 0");
    const end = start + length;

    const sy = Math.floor(start / this.width);
    const ey = Math.ceil(end / this.width);

    const sx = start % this.width;
    const ex = end % this.width;

    const x = ey - sy == 1 && (sx !== 0 || ex !== 0) ? sx : 0;
    const y = sy;

    const width = ey - sy == 1 && (sx !== 0 || ex !== 0) ? mod(ex - sx, this.width) : this.width;
    const height = ey - sy;

    // if read is within a single row just read the specific range
    // otherwise we need to read all the rows that are affected

    const buffer = new Float32Array(4 * width * height);
    const data = new Float32Array(4 * length);


    await this.globals.renderer.readRenderTargetPixelsAsync(
      this.readable(),
      x,
      y,
      width,
      height,
      buffer
    );

    for (let i = 0; i < 4 * length; i++)
      data[i] = buffer[4 * (sx - x) + i];

    return data;
  }

  async write(
    data: number[] | Float32Array,
    start = 0,
    length = Math.ceil(data.length / 4)
  ) {
    if (length <= 0) throw new Error("length must be greater than 0");
    const end = start + length;

    if (end > this.capacity) throw new Error("end is greater than the buffer capacity");


    const sy = Math.floor(start / this.width);
    const ey = Math.ceil(end / this.width);

    const sx = start % this.width;
    const ex = end % this.width;

    const x = ey - sy == 1 && (sx !== 0 || ex !== 0) ? sx : 0;
    const y = sy;

    const width = ey - sy == 1 && (sx !== 0 || ex !== 0) ? mod(ex - sx, this.width) : this.width;
    const height = ey - sy;

    const writeData = new Float32Array(4 * width * height);

    for (let i = 0; i < 4 * length; i++)
      writeData[4 * (sx - x) + i] = data[i] ?? 0;

    if (false /*ey - sy > 1 && (sx !== 0 || ex !== 0)*/) {
      // if we are writing to multiple rows and the start and end are not aligned
      // we need to read the current data to preserve the data that is not being overwritten

      const buffer = new Float32Array(4 * width * height);
      await this.globals.renderer.readRenderTargetPixelsAsync(
        this.readable(),
        x,
        y,
        width,
        height,
        buffer
      );

      // copy the data that is not being overwritten
      for (let i = 0; i < 4 * sx; i++)
        writeData[i] = buffer[i];

      for (let i = 4 * (width * height - width + ex); i < 4 * (width * height); i++)
        writeData[i] = buffer[i];
    }


    const texture = new DataTexture(writeData, width, height, RGBAFormat, FloatType);
    texture.needsUpdate = true;
    this.globals.renderer.copyTextureToTexture(
      texture,
      this.readable().texture,
      new Box2(new Vector2(), new Vector2(width, height)),
      new Vector2(x, y)
    );
    texture.dispose();

    this.size = Math.max(this.size, end);
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
};