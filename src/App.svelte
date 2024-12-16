<script lang="ts">
  import { onMount } from "svelte";
  import {
    Scene,
    OrthographicCamera,
    WebGLRenderer,
    Vector2,
    BufferGeometry,
  } from "three";
  import { OrbitControls } from "three/addons/controls/OrbitControls.js";
  import { initGrid } from "./lib/grid";
  import { Globals } from "./lib/three/Globals";
  import { OldVertices } from "./lib/texture/Vertex";
  import {
    isMousePressed,
    LEFT_MOUSE_BUTTON,
    RIGHT_MOUSE_BUTTON,
  } from "./lib/input";
  import { Draw } from "./lib/draw";
  // import { Compute } from "./lib/texture/compute";
  import { Graph } from "./lib/texture/Graph";
  import { Three } from "./lib/texture/Three";
  import { Compute } from "./lib/texture/Compute";

  let container: HTMLDivElement;

  onMount(async () => {
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x000000, 1);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new Scene();

    const camera = new OrthographicCamera(
      container.clientWidth / -100,
      container.clientWidth / 100,
      container.clientHeight / 100,
      container.clientHeight / -100,
      0.1,
      1000
    );
    camera.position.set(0, 0, 50);
    camera.lookAt(0, 0, 0);
    camera.zoom = 1 / 100;
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, container);
    controls.enableRotate = false;
    controls.minZoom = 0.05 / 100;
    controls.maxZoom = 10;
    // controls.enablePan = true;

    window.addEventListener("resize", () => {
      camera.left = container.clientWidth / -100;
      camera.right = container.clientWidth / 100;
      camera.top = container.clientHeight / 100;
      camera.bottom = container.clientHeight / -100;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(container.clientWidth, container.clientHeight);
    });

    scene.add(initGrid(container, camera));
    Draw.init(scene, camera);

    const render = () => {
      requestAnimationFrame(render);
      renderer.render(scene, camera);
    };
    render();

    const three = new Three(renderer, camera, scene);

    const graph = new Graph(three, 1024, 1024);
    graph.generateVertices();

    window.addEventListener("mousemove", (event) => {
      const { top, left, width, height } =
        renderer.domElement.getBoundingClientRect();
      const x = ((event.clientX - left) / width) * 2 - 1;
      const y = ((height - (event.clientY - top)) / height) * 2 - 1;
      // const id = graph.raycast(new Vector2(x, y));

      // if (id) console.log(id);
      // if (id) graph.select(id, true);
    });

    // const vertices = new OldVertices(renderer, camera, scene, 1024);

    camera.updateMatrix();

    // vertices.selection(new Vector2(100, 100), new Vector2(700, 900));

    // function screenCoords(event: MouseEvent) {
    //   const { top, left, width, height } =
    //     renderer.domElement.getBoundingClientRect();
    //   return new Vector2(
    //     ((event.clientX - left) / width) * 2 - 1,
    //     ((height - (event.clientY - top)) / height) * 2 - 1
    //   );
    // }

    // let first = new Vector2(),
    //   selection = false;

    // let select = true;

    // window.addEventListener("mousedown", (event) => {
    //   if (isMousePressed(RIGHT_MOUSE_BUTTON)) return;
    //   if (event.button !== LEFT_MOUSE_BUTTON) return;

    //   select = !event.altKey;

    //   first = screenCoords(event);
    //   first.divideScalar(camera.zoom * 100);

    //   selection = true;
    // });

    // function mouseMove(event: MouseEvent) {
    //   const id = vertices.raycast(screenCoords(event));
    //   if (id) vertices.select(id);

    //   if (!selection) return;

    //   Draw.reset();

    //   const second = screenCoords(event);

    //   const firstScaled = first.clone();
    //   firstScaled.multiplyScalar(camera.zoom * 100);

    //   const min = firstScaled.clone().min(second);
    //   const max = firstScaled.clone().max(second);

    //   vertices.selection(min, max, select);
    //   Draw.selectionRectangle(min, max);
    // }

    // window.addEventListener("mousemove", mouseMove);

    // window.addEventListener("mouseup", (event) => {
    //   if (event.button !== 0) return;

    //   if (!selection) return;

    //   const second = screenCoords(event);

    //   const firstScaled = first.clone();
    //   firstScaled.multiplyScalar(camera.zoom * 100);

    //   const min = firstScaled.clone().min(second);
    //   const max = firstScaled.clone().max(second);

    //   vertices.selection(min, max, select, false);
    //   Draw.reset();
    //   selection = false;
    // });

    const compute = new Compute(renderer);

    const texture = compute.createTexture(4, 4);

    const red = compute.createProgram(`

      void main() {
        gl_FragColor = vec4(1, 0, 0, 0);
      }
    `);

    const swap = compute.createProgram(`
      uniform sampler2D inputTexture;

      void main() {
        vec4 color = texture2D(inputTexture, gl_FragCoord.xy / 4.0);
        gl_FragColor = color.argb;
      }
    `);

    // swap.setUniform("inputTexture", texture);
    // red.execute(texture);
    // swap.execute(texture);
    // swap.execute(texture);
    // swap.execute(texture);

    // texture.write(0, 0, 1, 1, new Float32Array([1, 1, 1, 1]));

    // console.log(texture.read(0, 0, 4, 4));
  });
</script>

<div bind:this={container} class="w-full h-full"></div>
