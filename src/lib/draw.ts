import {
  Color,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  Vector2,
  Vector3,
} from "three";
import {
  MeshLine,
  MeshLineGeometry,
  MeshLineMaterial,
} from "@lume/three-meshline";

export class Draw {
  static scene: Scene;
  static camera: OrthographicCamera;

  static init(scene: Scene, camera: OrthographicCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  private static unproject(vector: Vector2) {
    const unprojected = new Vector3(vector.x, vector.y, 0).unproject(
      this.camera
    );

    return new Vector2(unprojected.x, unprojected.y);
  }

  private static selection: { plane: Mesh; outline: MeshLine } | null = null;

  static selectionRectangle(a: Vector2, b: Vector2) {
    a = this.unproject(a);
    b = this.unproject(b);

    const mid = a.clone().add(b).divideScalar(2);

    const [sx, sy] = [Math.abs(a.x - b.x), Math.abs(a.y - b.y)];

    if (isNaN(sx) || isNaN(sy)) return;

    const geometry = new PlaneGeometry(sx, sy);

    const geometry2 = new MeshLineGeometry();
    geometry2.setPoints([
      new Vector3(-sx / 2, -sy / 2, 3),
      new Vector3(sx / 2, -sy / 2, 3),
      new Vector3(sx / 2, sy / 2, 3),
      new Vector3(-sx / 2, sy / 2, 3),
      new Vector3(-sx / 2, -sy / 2, 3),
    ]);

    if (this.selection) {
      this.selection.plane.geometry.dispose();
      this.selection.outline.geometry.dispose();
      this.selection.plane.geometry = geometry;
      this.selection.outline.geometry = geometry2;
      this.selection.plane.visible = true;
      this.selection.outline.visible = true;
      this.selection.plane.position.x = mid.x;
      this.selection.plane.position.y = mid.y;
      this.selection.outline.position.x = mid.x;
      this.selection.outline.position.y = mid.y;
      this.selection.outline.material.lineWidth = 0.04 / this.camera.zoom;

      return;
    }

    const material = new MeshBasicMaterial({
      color: new Color(0x0040ff),
      opacity: 0.3,
      transparent: true,
    });

    const material2 = new MeshLineMaterial({
      lineWidth: 0.04 / this.camera.zoom,
      color: new Color(0x0080ff),
    } as any);

    const plane = new Mesh(geometry, material);
    plane.userData.temporary = true;
    plane.position.x = mid.x;
    plane.position.y = mid.y;

    const outline = new MeshLine(geometry2, material2);
    outline.userData.temporary = true;
    outline.position.x = mid.x;
    outline.position.y = mid.y;

    this.scene.add(plane);
    this.scene.add(outline);

    this.selection = { plane, outline };
  }

  static reset() {
    this.scene.children
      .filter((child) => (child as any).userData.temporary)
      .forEach((child) => (child.visible = false));
  }
}
