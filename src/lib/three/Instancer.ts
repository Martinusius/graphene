import { Globals } from "./Globals";

import { Bezier } from "./Bezier";
import { Point } from "./Point";
import {
  FloatType,
  RGBAFormat,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";
// import { BezierArrows } from "./BezierArrows";

const size = 30;

const pixelPositions: [number, number][] = [];

for (let x = 0; x < size; x++) {
  for (let y = 0; y < size; y++) {
    pixelPositions.push([x, y]);
  }
}

function distance([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

const center: [number, number] = [size / 2 - 0.5, size / 2 - 0.5];

pixelPositions.sort((a, b) => {
  const aDistance = distance(a, center);
  const bDistance = distance(b, center);

  return aDistance - bDistance;
});

console.log(pixelPositions);

export type InstancerRaycastResult =
  | {
      type: "Point";
      object: Point;
      position: Vector3;
    }
  | {
      type: "Bezier";
      object: Bezier;
      t: number;
      position: Vector3;
    };

export class Instancer {
  /**
   * Raycast the scene by rendering it to a texture and reading the pixel values
   * The information about the object is stored in the red and green channels (red = object type, green = object id)
   */
  static raycast(pointer: Vector2): InstancerRaycastResult | null {
    Globals.raycastRaycaster.setFromCamera(pointer, Globals.camera);
    // Globals.raycastCamera.copy(Globals.camera);

    Globals.raycastCamera.zoom = Globals.camera.zoom;

    Globals.raycastCamera.updateProjectionMatrix();

    const { origin, direction } = Globals.raycastRaycaster.ray;

    Globals.raycastCamera.position.copy(origin);
    Globals.raycastCamera.lookAt(origin.clone().add(direction));
    //this.intersectMaterial.uniforms.tolerance.value = tolerance;

    Globals.renderer.setRenderTarget(Globals.raycastTarget);
    Globals.renderer.render(Globals.raycastScene, Globals.raycastCamera);

    const pixelBuffer = new Float32Array(4 * size * size);
    Globals.renderer.readRenderTargetPixels(
      Globals.raycastTarget,
      Math.floor(Globals.resolution.x / 2 - size / 2),
      Math.floor(Globals.resolution.y / 2 - size / 2),
      size,
      size,
      pixelBuffer
    );

    Globals.renderer.setRenderTarget(null);
    //const dx = (Globals.resolution.x + 1) % 2, dy = (Globals.resolution.y + 1) % 2;

    let type, id;

    for (let i = 0; i < pixelPositions.length; i++) {
      const [x, y] = pixelPositions[i];
      const index = (x + size * y) * 4;

      if (pixelBuffer[index] < 2 || pixelBuffer[index + 1] - 1 < 0) continue;

      type = pixelBuffer[index];
      id = pixelBuffer[index + 1] - 1;
      break;
    }

    if (id === undefined) return null;

    if (type === 2)
      return {
        type: "Point",
        object: Point.instances[id],
        position: Point.instances[id].position,
      };
    else if (type === 3)
      return {
        type: "Bezier",
        object: Bezier.instances[id],
        t: pixelBuffer[2],
        position: Bezier.instances[id].getPoint(pixelBuffer[2]),
      };
    // else if (type === 4) return {
    //   type: 'BezierArrows',
    //   object: BezierArrows.instances[id],
    //   t: pixelBuffer[2],
    //   position: BezierArrows.instances[id].getPoint(pixelBuffer[2])
    // };

    throw new Error(`Unknown type ${type}`);
  }

  static resize() {
    Globals.raycastTarget.dispose();
    Globals.raycastTarget = new WebGLRenderTarget(
      Globals.resolution.x,
      Globals.resolution.y,
      { format: RGBAFormat, type: FloatType }
    );

    Bezier.resize();
    Point.resize();
    // BezierArrows.resize();
  }
}
