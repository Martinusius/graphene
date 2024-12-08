<script lang="ts">
  import { onMount } from "svelte";
  import {
    Scene,
    OrthographicCamera,
    WebGLRenderer,
    CircleGeometry,
    Mesh,
    MeshBasicMaterial,
    SphereGeometry,
    TextureLoader,
    Texture,
    Color,
    Points,
    BufferGeometry,
    Vector3,
    Vector2,
  } from "three";
  import { OrbitControls } from "three/addons/controls/OrbitControls.js";
  import { initGrid } from "./lib/grid";
  import { ThreeEdge, ThreeGraph } from "./lib/threeGraph";
  import { Instancer } from "./lib/three/Instancer";
  import { Globals } from "./lib/three/Globals";
  import { Bezier } from "./lib/three/Bezier";
  import { Point } from "./lib/three/Point";
  import { Drag } from "./lib/three/Drag";
  import { Vertices } from "./lib/texture/Vertex";
  import { isMousePressed, LEFT_MOUSE_BUTTON, RIGHT_MOUSE_BUTTON } from "./lib/input";
  import { EffectComposer, SSAARenderPass } from "three/examples/jsm/Addons.js";

  let container: HTMLDivElement;

  onMount(async () => {
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    console.log(container.clientWidth, container.clientHeight);

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

      Instancer.resize();
    });

    scene.add(initGrid(container, camera));
    // scene.add(circle);

    const render = () => {
      requestAnimationFrame(render);
      renderer.render(scene, camera);
    };
    render();

    Globals.init(renderer, scene, camera);
    // Instancer.init();
    const atlasData = [
      {
        name: "node-base",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
      {
        name: "node-selected",
        x: 0,
        y: 100,
        width: 100,
        height: 100,
      },
      {
        name: "node-hovered",
        x: 100,
        y: 0,
        width: 100,
        height: 100,
      },
      {
        name: "handle-base",
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      },
      {
        name: "handle-hovered",
        x: 0,
        y: 200,
        width: 100,
        height: 100,
      },
      {
        name: "handle-selected",
        x: 100,
        y: 200,
        width: 100,
        height: 100,
      },
    ];

    const textureLoader = new TextureLoader();
    const texture = await new Promise<Texture>((resolve) => {
      textureLoader.load("./atlas.png", (texture) => {
        resolve(texture);
      });
    });

    Point.init(texture, atlasData);
    Bezier.init();

    const drag = new Drag();

    drag.addEventListener("hoveron", (event) => {
      if (event.object instanceof Point) {
        event.object.image = "node-hovered";
      } else if (event.object instanceof Bezier) {
        event.object.color = new Color(0.5, 0.5, 0.5);
      }
    });

    drag.addEventListener("hoveroff", (event) => {
      //console.log(event);

      if (event.object instanceof Point) {
        event.object.image = "node-base";
      } else if (event.object instanceof Bezier) {
        event.object.color = new Color(0, 0, 0);
      }
    });

    drag.addEventListener("dragstart", (event) => {
      if (event.object instanceof Point) {
        event.object.image = "node-selected";
      }
    });

    drag.addEventListener("dragend", (event) => {
      if (event.object instanceof Point) {
        event.object.image = "node-base";
      }
    });

    drag.addEventListener("drag", (event) => {
      if (event.object instanceof Bezier) {
        const delta = event.position?.clone().sub(event.object.position);

        const edges = new Set<ThreeEdge>();
        event.object.data.vertices.forEach((vertex: any) => {
          vertex.point.position = vertex.point.position.clone().add(delta);
          vertex._edges.forEach((edge: any) => edges.add(edge));
        });

        edges.forEach((edge) => {
          edge.recalculate();
        });
      } else if (event.object instanceof Point) {
        event.object.position = event.position!;
        event.object.data._edges.forEach((edge: any) => edge.recalculate());
      }
    });

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

    const composer = new EffectComposer(renderer);
    composer.addPass(new SSAARenderPass(scene, camera));
    composer.render();

    const vertices = new Vertices(renderer, camera, scene, 512 * 512, 0);

    camera.updateMatrix();

    // vertices.selection(new Vector2(100, 100), new Vector2(700, 900));

    function screenCoords(event: MouseEvent) {
      const { top, left, width, height } = renderer.domElement.getBoundingClientRect();
      // console.log(top, left, width, height);
      return new Vector2(((event.clientX - left) / width) * 2 - 1, ((height - (event.clientY - top)) / height) * 2 - 1);
    }

    let first = new Vector2(),
      selection = false;

    let select = true;

    window.addEventListener("mousedown", (event) => {
      if (isMousePressed(RIGHT_MOUSE_BUTTON)) return;
      if (event.button !== LEFT_MOUSE_BUTTON) return;

      select = !event.altKey;

      // console.log("first", first);

      first = screenCoords(event);
      first.divideScalar(camera.zoom * 100);

      selection = true;
    });

    function mouseMove(event: MouseEvent) {
      if (!selection) return;

      const second = screenCoords(event);

      const first2 = new Vector2(first.x, first.y);
      first2.multiplyScalar(camera.zoom * 100);
      vertices.selection(first2.clone().min(second), first2.clone().max(second), select);
    }

    window.addEventListener("mousemove", mouseMove);
    // window.addEventListener("wheel", mouseMove);

    window.addEventListener("mouseup", (event) => {
      if (event.button !== 0) return;

      if (!selection) return;

      const second = screenCoords(event);

      const first2 = new Vector2(first.x, first.y);
      first2.multiplyScalar(camera.zoom * 100);
      vertices.selection(first2.clone().min(second), first2.clone().max(second), select, false);

      selection = false;
    });
  });
</script>

<div bind:this={container} class="w-full h-full"></div>
