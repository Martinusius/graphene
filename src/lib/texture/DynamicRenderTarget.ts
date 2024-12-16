import {
  WebGLRenderTarget,
  type RenderTargetOptions,
  type WebGLRenderer,
} from "three";

export class DynamicRenderTarget {
  private renderTarget: WebGLRenderTarget | null = null;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly options?: RenderTargetOptions
  ) {}

  target() {
    if (
      !this.renderTarget ||
      this.renderTarget.width !== this.renderer.domElement.width ||
      this.renderTarget.height !== this.renderer.domElement.height
    ) {
      return (this.renderTarget = new WebGLRenderTarget(
        this.renderer.domElement.width,
        this.renderer.domElement.height,
        this.options
      ));
    }

    return this.renderTarget;
  }
}
