import { Camera, Mesh, PlaneGeometry, Scene, WebGLRenderer } from "three";
import { ComputeBuffer } from "./ComputeBuffer";
import { ComputeProgram, type ComputeProgramOptions } from "./ComputeProgram";

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


  createBuffer(size: number) {
    return new ComputeBuffer(
      {
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera,
        mesh: this.mesh,
      },
      size
    );
  }

  createProgram(shader: string, options: ComputeProgramOptions = {}) {
    return new ComputeProgram(
      {
        renderer: this.renderer,
        mesh: this.mesh,
        camera: this.camera,
        scene: this.scene,
      },
      shader,
      options
    );
  }

}
