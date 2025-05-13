import type { Camera, Mesh, Scene, WebGLRenderer } from "three";

export type ComputeGlobals = {
  renderer: WebGLRenderer;
  camera: Camera;
  scene: Scene;
  mesh: Mesh;
};
