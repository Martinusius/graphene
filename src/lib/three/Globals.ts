import { Raycaster, Vector2, WebGLRenderTarget, Scene, type WebGLRenderer, OrthographicCamera, RGBAFormat, FloatType } from "three";

export class Globals {
  static renderer: WebGLRenderer;
  static scene: Scene;
  static camera: OrthographicCamera;

  static raycastScene: Scene;
  static raycastCamera: OrthographicCamera;
  static raycastRaycaster: Raycaster;
  static raycastTarget: WebGLRenderTarget;


  static init(renderer: WebGLRenderer, scene: Scene, camera: OrthographicCamera) {
    Globals.renderer = renderer;
    Globals.scene = scene;
    Globals.camera = camera;

    Globals.raycastScene = new Scene();
    Globals.raycastCamera = camera.clone();
    Globals.raycastRaycaster = new Raycaster();

    Globals.raycastTarget = new WebGLRenderTarget(Globals.resolution.x, Globals.resolution.y, { format: RGBAFormat, type: FloatType });
  }

  static get resolution() {
    return new Vector2(Globals.renderer.domElement.width, Globals.renderer.domElement.height);
  }
}