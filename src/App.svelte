<script lang="ts">
  import { onMount } from "svelte";
  import { Scene, OrthographicCamera, WebGLRenderer, Vector2, Vector3 } from "three";
  import { OrbitControls } from "./lib/OrbitControls";
  import { initGrid } from "./lib/grid";
  import { isMousePressed, LEFT_MOUSE_BUTTON, RIGHT_MOUSE_BUTTON } from "./lib/input";
  import { Draw } from "./lib/Draw";
  import { GraphRenderer } from "./lib/texture/GraphRenderer";
  import { Three } from "./lib/texture/Three";
  import { Task } from "./lib/texture/Task";
  import { Graph, Vertex } from "./lib/texture/interface/Graph";
  import { floatBitsToUint } from "./lib/texture/reinterpret";
  import { GraphGenerator } from "./lib/texture/GraphGenerator";

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
      1000,
    );
    camera.position.set(0, 0, 50);
    camera.lookAt(0, 0, 0);
    camera.zoom = 1 / 20;
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, container);
    controls.enableRotate = false;
    controls.enablePan = true;
    controls.minZoom = 0.05 / 100;
    controls.maxZoom = 1;

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

    const three = new Three(renderer, camera, scene);

    const graph = new GraphRenderer(three, 1024, 1024);
    graph.vertices.count = 0;

    const gi = new Graph(graph);

    // const a = gi.addVertex(100, 100);
    // const b = gi.addVertex(50, 200);
    // const c = gi.addVertex(200, 200);
    // const d = gi.addVertex(200, 50);
    // const e = gi.addVertex(50, 0);
    // const f = gi.addVertex(100, 50);

    // gi.addEdge(a, b);
    // gi.addEdge(b, c);
    // gi.addEdge(c, d);
    // gi.addEdge(d, e);
    // gi.addEdge(e, f);
    // gi.addEdge(f, a);
    // gi.addEdge(a, c);

    //const size = 2;

    // let last = null;

    //generateClique(gi, 10);

    //generateGrid(gi, size);

    const generator = new GraphGenerator(gi);

    // generator.randomness = 5;
    // generator.clique(10);
    generator.grid(100, 100, true);

    await gi.upload();

    let doRender = true;

    console.log("edgeData", await graph.edgeData.read(0, 1));
    console.log("edgeCount", graph.edges.count);

    let doForce = false;

    window.addEventListener("keydown", async (event) => {
      // delete
      if (event.key === "x") {
        gi.transaction(async () => {
          const edges = await graph.edgeData.read();
          for (let i = 0; i < graph.edges.count * 4; i += 4) {
            const selected = floatBitsToUint(edges[i + 2]) & 1;
            const id = floatBitsToUint(edges[i + 3]);

            if (selected) {
              const e = gi.getEdge(id);
              if (!e) continue;
              gi.deleteEdge(e);
            }
          }

          // await new Promise((resolve) => setTimeout(resolve, 1000));

          const vertices = await graph.vertexData.read();
          for (let i = 0; i < graph.vertices.count * 4; i += 4) {
            const selected = floatBitsToUint(vertices[i + 2]) & 1;
            const id = floatBitsToUint(vertices[i + 3]);

            //console.log("selected");

            if (selected) {
              const v = gi.getVertex(id);
              if (!v) continue;
              // console.log(v.edges);
              // console.log(v.edges.map((e) => e.index));
              gi.deleteVertex(v);
            }
          }
        });

        // console.log("DELETE");
        // doRender = false;
        // renderer.resetState();

        // await gi.download();

        // await gi.upload();
      } else if (event.key === "m") {
        gi.transaction(async () => {
          const vertices = await graph.vertexData.read();
          const selectedVertices: Vertex[] = [];

          for (let i = 0; i < graph.vertices.count * 4; i += 4) {
            const isSelected = floatBitsToUint(vertices[i + 2]) & 1;
            const id = floatBitsToUint(vertices[i + 3]);

            if (isSelected) {
              selectedVertices.push(gi.getVertex(id)!);
            }
          }

          graph.deselectAll();
          gi.merge(selectedVertices);
        });

        // gi.addVertex(0, 0);
      } else if (event.key === "f") {
        doForce = !doForce;
      }
    });

    // await graph.generateVertices();
    // await graph.generateEdges();
    // await graph.generateSpanningTree();

    let i = 0;

    const render = async () => {
      requestAnimationFrame(render);

      await gi.tick();

      if (!doRender) return;
      if (!Task.idle()) return;

      if (doForce) graph.forces.update(0.1);
      // if (i++ % 10 === 0) graph.forces.update(0.1);

      // graph.countOnScreen().then(console.log);

      renderer.render(scene, camera);
    };
    render();

    function screenCoords(event: MouseEvent) {
      const { top, left, width, height } = renderer.domElement.getBoundingClientRect();
      return new Vector2(((event.clientX - left) / width) * 2 - 1, ((height - (event.clientY - top)) / height) * 2 - 1);
    }

    function worldCoords(event: MouseEvent) {
      const coords = screenCoords(event);
      const world = new Vector3(coords.x, coords.y, 0).unproject(camera);
      return new Vector2(world.x, world.y);
    }

    let hovering = false,
      hoveredType = "",
      hoveredId = -1;

    function mouseMoveHover(event: MouseEvent) {
      if (dragging) return;

      const { x, y } = screenCoords(event);

      graph.raycast(new Vector2(x, y)).then((result) => {
        if (!result) {
          document.body.style.cursor = "default";

          graph.unhover();

          hovering = false;
          return;
        }

        const { type, id } = result;

        document.body.style.cursor = "pointer";

        if (type === "vertex") {
          graph.hover("vertex", id);
        }

        if (type === "edge") {
          graph.hover("edge", id);
        }

        hoveredType = type;
        hoveredId = id;
        hovering = true;
      });
    }

    window.addEventListener("mousemove", mouseMoveHover);
    window.addEventListener("wheel", mouseMoveHover);

    camera.updateMatrix();

    let first = new Vector2();
    let selection = false;

    let select = true;

    let dragging = false;
    let dragged = false;

    const startCoords = new Vector2();

    window.addEventListener("mousedown", async (event) => {
      if (isMousePressed(RIGHT_MOUSE_BUTTON)) return;
      if (event.button !== LEFT_MOUSE_BUTTON) return;

      if (hovering && !event.altKey) {
        const selected = await graph.isSelected(hoveredType as any, hoveredId);
        dragging = true;
        dragged = false;

        if (!selected) {
          if (!event.shiftKey) graph.deselectAll();
          graph.select(hoveredType as any, hoveredId);
        } else if (event.shiftKey) graph.select(hoveredType as any, hoveredId, false);

        startCoords.copy(worldCoords(event));
        return;
      }

      if (!event.shiftKey && !event.altKey) graph.deselectAll();

      select = !event.altKey;

      first = screenCoords(event);
      first.divideScalar(camera.zoom * 100);

      selection = true;
    });

    function mouseMove(event: MouseEvent) {
      // console.log(worldCoords(event));

      if (dragging) {
        const diff = worldCoords(event).sub(startCoords);
        startCoords.copy(worldCoords(event));

        dragged = true;

        graph.forces.cooling = 1;
        graph.drag(diff);
        return;
      }

      if (!selection) return;

      Draw.reset();

      const second = screenCoords(event);

      const firstScaled = first.clone();
      firstScaled.multiplyScalar(camera.zoom * 100);

      const min = firstScaled.clone().min(second);
      const max = firstScaled.clone().max(second);

      graph.selection(min, max, select);
      Draw.selectionRectangle(min, max);
    }

    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("wheel", mouseMove);

    window.addEventListener("mouseup", (event) => {
      if (event.button !== 0) return;

      if (dragging) {
        dragging = false;

        if (!dragged) {
          if (event.altKey) graph.select(hoveredType as any, hoveredId, false);
        } else {
          graph.undrag();
        }

        return;
      }

      if (!selection) return;

      const second = screenCoords(event);

      const firstScaled = first.clone();
      firstScaled.multiplyScalar(camera.zoom * 100);

      const min = firstScaled.clone().min(second);
      const max = firstScaled.clone().max(second);

      graph.selection(min, max, select, false);
      graph.countSelected();
      // graph.hash().then(console.log);

      Draw.reset();
      selection = false;
    });

    window.addEventListener("contextmenu", (event) => {
      event.preventDefault();

      // graph.updateForces();
    });

    // const compute = new Compute(renderer);

    // const texture = compute.createTexture(10, 10, Ubyte);
    // const data = new Uint8Array(new Array(10 * 10 + 18).fill(0).map((_, i) => 120 - i));
    // console.log(data);
    // texture.write(0, 0, 10, 10, data);
    // console.log(texture.readUint(0, 0, 10, 10));

    // const compute = new NewCompute(renderer);

    // const buffer = compute.createBuffer(4);

    // const program = compute.createProgram(`
    //   uniform buffer data;

    //   void main() {
    //     vec4 rgba = ReadBuffer(data, instanceId);

    //     WriteOutput(instanceId, rgba + vec4(0, 1, 2, 3) + vec4(instanceId * 4));
    //   }
    // `);

    // program.setUniform("data", buffer);

    // program.execute(buffer);

    // console.log("result", await buffer.read());
  });
</script>

<div bind:this={container} class="w-full h-full"></div>
