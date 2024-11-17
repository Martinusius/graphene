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
  } from "three";
  import { OrbitControls } from "three/addons/controls/OrbitControls.js";
  import { initGrid } from "./lib/grid";
  import { ThreeGraph } from "./lib/threeGraph";
  import { Instancer } from "./lib/three/Instancer";
  import { Globals } from "./lib/three/Globals";
  import { Bezier } from "./lib/three/Bezier";
  import { Point } from "./lib/three/Point";

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

    const circleGeometry = new CircleGeometry(32, 32);
    // const circle = new Mesh(circleGeometry, new MeshBasicMaterial({ color: 0xff0000 }));

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

    const graph = new ThreeGraph(scene);

    const a = graph.createVertex();
    const b = graph.createVertex();
    const c = graph.createVertex();
    const d = graph.createVertex();

    graph.createEdge(a, b);
    graph.createEdge(b, c);
    graph.createEdge(c, d);
    graph.createEdge(d, a);
  });
</script>

<div bind:this={container} class="w-full h-full"></div>
