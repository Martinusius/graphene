import {
  BufferAttribute,
  BufferGeometry,
  Color,
  LineCurve3,
  Material,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
} from "three";
import {
  MeshLine,
  MeshLineGeometry,
  MeshLineMaterial,
} from "@lume/three-meshline";

import { v4 } from "uuid";

// @ts-ignore
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";

export class Draw {
  static scene: Scene;
  static camera: OrthographicCamera;

  static init(scene: Scene, camera: OrthographicCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  // static vertex(position: Vector3) {
  //   const material = materials["node-default-default-unlocked"].clone();
  //   material.opacity = 0.3;

  //   const vertex = new Mesh(new PlaneGeometry(1, 1), material);
  //   vertex.userData.temporary = true;

  //   vertex.rotation.x = -Math.PI / 2;
  //   vertex.position.copy(position);

  //   const z = 0.4 / this.graph.camera.zoom;
  //   vertex.scale.set(z, z, z);

  //   this.graph.scene.add(vertex);
  // }

  static edge(a: Vector3, b: Vector3) {
    const size = 0.2 / this.camera.zoom;
    const dist = a.distanceTo(b);

    if (dist < size * 2) return;

    const edge = new MeshLine(
      new MeshLineGeometry(),
      new MeshLineMaterial({
        lineWidth: 7,
        color: new Color("black"),
        transparent: true,
        opacity: 0.3,
      } as any)
    );

    edge.material.lineWidth = 0.07 / this.camera.zoom;

    edge.geometry.setPoints(
      [a.clone().lerp(b, size / dist), b.clone().lerp(a, size / dist)].map(
        (point) => point.clone().sub(new Vector3(0, 0.1, 0))
      )
    );
    edge.userData.temporary = true;

    this.scene.add(edge);
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

    // planegeometry
    const geometry = new PlaneGeometry(sx, sy);

    // meshlinegeometry
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

    // material
    const material = new MeshBasicMaterial({
      color: new Color(0x0040ff),
      opacity: 0.3,
      transparent: true,
    });

    // meshlinematerial
    const material2 = new MeshLineMaterial({
      lineWidth: 0.04 / this.camera.zoom,
      color: new Color(0x0080ff),
    } as any);

    // mesh
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
      .forEach((child) => child.visible = false);
  }

  static ruler(start: Vector3, end: Vector3) {
    if (start.distanceTo(end) < 0.001) return;

    const dentGeometries: BufferGeometry[] = [];
    const curve = new LineCurve3(start, end);

    const stepSize = 5 ** Math.round(-Math.log(this.camera.zoom) / Math.log(5));

    const curveLength = curve.getLength();

    for (let i = 0; i <= curveLength; i += stepSize) {
      const dent = new MeshLineGeometry();

      const t = i / curveLength;

      const tangent = curve
        .getTangentAt(t)
        .normalize()
        .multiplyScalar(0.2 / this.camera.zoom);

      const dentDir = new Vector2(tangent.x, tangent.z).rotateAround(
        new Vector2(0, 0),
        Math.PI / 2
      );

      dent.setPoints([
        curve.getPointAt(t).sub(new Vector3(dentDir.x, 0, dentDir.y)),
        curve.getPointAt(t).add(new Vector3(dentDir.x, 0, dentDir.y)),
      ]);

      dentGeometries.push(dent);
    }

    if (dentGeometries.length === 0) return;

    const combinedDents = mergeGeometries(
      dentGeometries,
      false
    ) as MeshLineGeometry;
    dentGeometries.forEach((geometry) => geometry.dispose());

    const material = new MeshLineMaterial({
      lineWidth: 0.06 / this.camera.zoom,
      color: new Color(0x3b82f6),
    } as any);

    const dents = new MeshLine(combinedDents, material);
    dents.userData.temporary = true;
    this.scene.add(dents);

    const lineGeometry = new MeshLineGeometry();
    lineGeometry.setPoints([start, end]);

    const line = new MeshLine(lineGeometry, material);
    line.userData.temporary = true;
    this.scene.add(line);
  }

  // static label(position: Vector3, text: string) {
  //   const screenPosition: Vector3 = position.clone().project(this.camera);
  //   const div = document.createElement("div");
  //   div.innerHTML = `
  //   <div class='temporary absolute flex pointer-events-none'>
  //     <div class='px-2.5 mt-3 rounded-full text-white text-sm' style='background-color: dodgerblue'>
  //       ${text}
  //     </div>
  //   </div>
  //   `.trim();

  //   const label = div.firstChild as HTMLImageElement;
  //   this.container.append(label);

  //   label.style.left =
  //     ((screenPosition.x + 1) * this.container.clientWidth -
  //       label.clientWidth) /
  //       2 +
  //     "px";
  //   label.style.top =
  //     ((-screenPosition.y + 1) * this.container.clientHeight -
  //       label.clientHeight) /
  //       2 +
  //     "px";
  // }

  private static deleteObject3D(object: Object3D): void {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      (object.material as Material).dispose();
    }

    if (object instanceof Sprite) {
      object.material.dispose();
    }

    object.parent?.remove(object);
  }
}
