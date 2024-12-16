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
  import { Vertices } from "./lib/texture/Vertex";
  import {
    isMousePressed,
    LEFT_MOUSE_BUTTON,
    RIGHT_MOUSE_BUTTON,
  } from "./lib/input";
  import { Draw } from "./lib/draw";
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

    // Globals.init(renderer, scene, camera);

    // const drag = new Drag();

    // drag.addEventListener("hoveron", (event) => {
    //   if (event.object instanceof Point) {
    //     event.object.image = "node-hovered";
    //   } else if (event.object instanceof Bezier) {
    //     event.object.color = new Color(0.5, 0.5, 0.5);
    //   }
    // });

    // drag.addEventListener("hoveroff", (event) => {
    //   //console.log(event);

    //   if (event.object instanceof Point) {
    //     event.object.image = "node-base";
    //   } else if (event.object instanceof Bezier) {
    //     event.object.color = new Color(0, 0, 0);
    //   }
    // });

    // drag.addEventListener("dragstart", (event) => {
    //   if (event.object instanceof Point) {
    //     event.object.image = "node-selected";
    //   }
    // });

    // drag.addEventListener("dragend", (event) => {
    //   if (event.object instanceof Point) {
    //     event.object.image = "node-base";
    //   }
    // });

    // drag.addEventListener("drag", (event) => {
    //   if (event.object instanceof Bezier) {
    //     const delta = event.position?.clone().sub(event.object.position);

    //     const edges = new Set<ThreeEdge>();
    //     event.object.data.vertices.forEach((vertex: any) => {
    //       vertex.point.position = vertex.point.position.clone().add(delta);
    //       vertex._edges.forEach((edge: any) => edges.add(edge));
    //     });

    //     edges.forEach((edge) => {
    //       edge.recalculate();
    //     });
    //   } else if (event.object instanceof Point) {
    //     event.object.position = event.position!;
    //     event.object.data._edges.forEach((edge: any) => edge.recalculate());
    //   }
    // });

    // const graph = new ThreeGraph(scene);

    // const a = graph.createVertex();
    // const b = graph.createVertex();
    // const c = graph.createVertex();
    // const d = graph.createVertex();

    // graph.createEdge(a, b);
    // graph.createEdge(b, a);
    // graph.createEdge(a, b);
    // graph.createEdge(b, a);

    // graph.createEdge(b, c);
    // graph.createEdge(c, d);
    // graph.createEdge(d, a);

    const vertices = new Vertices(renderer, camera, scene, 1024);

    camera.updateMatrix();

    // vertices.selection(new Vector2(100, 100), new Vector2(700, 900));

    function screenCoords(event: MouseEvent) {
      const { top, left, width, height } =
        renderer.domElement.getBoundingClientRect();
      return new Vector2(
        ((event.clientX - left) / width) * 2 - 1,
        ((height - (event.clientY - top)) / height) * 2 - 1
      );
    }

    let first = new Vector2(),
      selection = false;

    let select = true;

    window.addEventListener("mousedown", (event) => {
      if (isMousePressed(RIGHT_MOUSE_BUTTON)) return;
      if (event.button !== LEFT_MOUSE_BUTTON) return;

      select = !event.altKey;

      first = screenCoords(event);
      first.divideScalar(camera.zoom * 100);

      selection = true;
    });

    function mouseMove(event: MouseEvent) {
      const id = vertices.raycast(screenCoords(event));
      if (id) vertices.select(id);

      if (!selection) return;

      Draw.reset();

      const second = screenCoords(event);

      const firstScaled = first.clone();
      firstScaled.multiplyScalar(camera.zoom * 100);

      const min = firstScaled.clone().min(second);
      const max = firstScaled.clone().max(second);

      vertices.selection(min, max, select);
      Draw.selectionRectangle(min, max);
    }

    window.addEventListener("mousemove", mouseMove);

    window.addEventListener("mouseup", (event) => {
      if (event.button !== 0) return;

      if (!selection) return;

      const second = screenCoords(event);

      const firstScaled = first.clone();
      firstScaled.multiplyScalar(camera.zoom * 100);

      const min = firstScaled.clone().min(second);
      const max = firstScaled.clone().max(second);

      vertices.selection(min, max, select, false);
      Draw.reset();
      selection = false;
    });

    const compute = new Compute(renderer);

    const size = 8192;

    const texture = compute.createTexture(size, size);

    const regular = compute.createProgram(`
      void main() {
        gl_FragColor = vec4(1);
      }
    `);

    const special = compute.createSpecialProgram(`
      uniform ivec2 outputSize;

      void main() {
        int x = (gl_VertexID % outputSize.x) + 1;
        int y = (gl_VertexID / outputSize.y) + 1;

        write(vec2(x, y) / vec2(outputSize), vec4(1));
      }
    `);

    const start = performance.now();
    special.execute(size * size, texture);
    // regular.execute(texture);

    // console.log(texture.read(0, 0, 1, 1));
    // console.log(texture.read(Math.floor(size / 2), Math.floor(size / 2), 1, 1));
    const elapsed = performance.now() - start;
    console.log(`Took ${Math.floor(elapsed)}ms`);
  });
</script>

<div bind:this={container} class="w-full h-full"></div>
