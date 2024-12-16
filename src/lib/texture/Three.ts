import { Vector2, type Camera, type Scene, type WebGLRenderer } from "three";

export class Three {
  constructor(
    public readonly renderer: WebGLRenderer,
    public readonly camera: Camera,
    public readonly scene: Scene
  ) {}

  get resolution() {
    return new Vector2(
      this.renderer.domElement.width,
      this.renderer.domElement.height
    );
  }

  screenToImage(screenCoords: Vector2) {
    return screenCoords
      .clone()
      .addScalar(1)
      .multiplyScalar(0.5)
      .multiply(this.resolution);
  }

  imageToScreen(imageCoords: Vector2) {
    return imageCoords
      .clone()
      .divide(this.resolution)
      .multiplyScalar(2)
      .subScalar(1);
  }
}
