import type { OrthographicCamera } from "three";
import { Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";


const fragmentShader = `
  uniform float u_zoom;
  uniform vec2 u_resolution;
  uniform vec3 u_cameraPosition;
  uniform vec4 u_camera;

  float distanceFromGrid(vec2 coord, float cellSize) {
    return min(abs(mod(coord.x + cellSize / 2.0, cellSize) - cellSize / 2.0), abs(mod(coord.y + cellSize / 2.0, cellSize) - cellSize / 2.0));
  }

  float line(float dist, float thickness) {
    return mix(1.0, 0.0, smoothstep(0.5 * thickness, 1.5 * thickness, dist));
  }

  void main() {
    vec2 screenCoord = gl_FragCoord.xy / u_resolution * 2.0 - 1.0;
    vec2 coord = screenCoord * vec2(u_camera.y - u_camera.x, u_camera.z - u_camera.w) / u_zoom * 0.5
      + vec2(u_cameraPosition.x, u_cameraPosition.y);

    vec2 scale = vec2(u_camera.y - u_camera.x, u_camera.z - u_camera.w) / u_zoom / u_resolution;


    float total = 0.0;
    
    int start = int(log(1.0 / u_zoom) / log(5.0));

    int range = 4;

    for(int i = 0; i < range * 2; i++) {
      float cellSize = 1.0 * pow(5.0, float(i + start - range));

      float gridDistance = distanceFromGrid(coord, cellSize);

      total = max(total, line(gridDistance, scale.y * 0.8) * min(u_zoom * cellSize * 0.05, 1.0));
    }

    gl_FragColor = vec4(0, 0, 0, total);
  }
`;

const vertexShader = `
  void main() {
    gl_Position = vec4( position, 1.0 );
  }
`;



export function initGrid(container: HTMLDivElement, camera: OrthographicCamera) {
  const planeGeometry = new PlaneGeometry(1000, 1000);

  const shaderMaterial = new ShaderMaterial({
    vertexShader,
    uniforms: {
      u_zoom: { value: 1.0 },
      u_resolution: {
        value: new Vector2(
          container.clientWidth * window.devicePixelRatio,
          container.clientHeight * window.devicePixelRatio
        )
      },
      u_cameraPosition: { value: new Vector3(0, 0, 0) },
      u_camera: { value: new Vector4(0, 0, 0, 0) }
    },
    fragmentShader,
    transparent: false
  });

  const mesh = new Mesh(planeGeometry, shaderMaterial);
  mesh.onBeforeRender = () => {
    mesh.position.copy(camera.position);
    mesh.material.uniforms.u_zoom.value = camera.zoom;
    mesh.material.uniforms.u_resolution.value.set(
      container.clientWidth * window.devicePixelRatio,
      container.clientHeight * window.devicePixelRatio
    );
    mesh.material.uniforms.u_cameraPosition.value.copy(camera.position);
    mesh.material.uniforms.u_camera.value = new Vector4(
      camera.left,
      camera.right,
      camera.top,
      camera.bottom
    );
  }

  return mesh;
}
