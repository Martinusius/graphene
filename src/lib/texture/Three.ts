import { Object3D, OrthographicCamera, Vector2, type Camera, type Scene, type WebGLRenderer } from "three";

export class Three {
  constructor(
    public readonly renderer: WebGLRenderer,
    public readonly camera: OrthographicCamera,
    public readonly scene: Scene
  ) { }

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

  hide(flag: string) {
    this.scene.traverse(child => {
      if (child.userData[flag]) {
        child.userData[`visible_${flag}`] = child.visible;
        child.visible = false;
      }
    });
  }

  show(flag: string) {
    this.scene.traverse(child => {
      if (child.userData[flag]) {
        child.visible = child.userData[`visible_${flag}`];
      }
    });
  }

  trigger(func: string) {
    this.scene.traverse(child => {
      if (child.userData[func]) {
        child.userData[func]();
      }
    });
  }

  find(flag: string) {
    let found: Object3D | undefined = undefined;
    this.scene.traverse(child => {
      if (child.userData[flag]) {
        found = child;
      }
    });
    return found as Object3D | undefined;
  }
}
