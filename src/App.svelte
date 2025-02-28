<script lang="ts">
  import { onMount } from "svelte";
  import {
    Scene,
    OrthographicCamera,
    WebGLRenderer,
    Vector2,
    Vector3,
  } from "three";
  import { OrbitControls } from "./lib/OrbitControls";
  import { initGrid } from "./lib/grid";
  import {
    getMousePosition,
    isKeyPressed,
    isMousePressed,
    LEFT_MOUSE_BUTTON,
    RIGHT_MOUSE_BUTTON,
  } from "./lib/input";
  import { Draw } from "./lib/Draw";
  import { GraphRenderer } from "./lib/texture/GraphRenderer";
  import { Three } from "./lib/texture/Three";
  import { Task } from "./lib/texture/Task";
  import { Graph, Vertex } from "./lib/texture/interface/undirected/Graph";
  import { floatBitsToUint, uintBitsToFloat } from "./lib/texture/reinterpret";
  import { GraphGenerator } from "./lib/texture/GraphGenerator";
  import { DirectedGraph } from "./lib/texture/interface/directed/DirectedGraph";
  import { DirectedGraphGenerator } from "./lib/texture/DirectedGraphGenerator";
  import { DynamicArray } from "./lib/texture/DynamicArray";
  import { selectEdges } from "./lib/texture/selectEdges.glsl";
  import { Auxiliary } from "./lib/texture/interface/Auxiliary";

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

    const gi = new DirectedGraph(graph);

    const generator = new DirectedGraphGenerator(gi);

    // graph.text.vertices.maxDigits = 0;
    // graph.text.edges.maxDigits = 0;

    // generator.spacing *= 2;
    // generator.randomness = 20;

    function primes(n: number): number[] {
      const primes: number[] = [];
      let candidate = 2; // Start checking from the first prime number

      // Continue until we have collected n prime numbers
      while (primes.length < n) {
        let isPrime = true;
        const sqrtCandidate = Math.sqrt(candidate);

        // Check divisibility only up to the square root of candidate
        for (let i = 2; i <= sqrtCandidate; i++) {
          if (candidate % i === 0) {
            isPrime = false;
            break;
          }
        }

        // If candidate is prime, add it to the list
        if (isPrime) {
          primes.push(candidate);
        }

        candidate++; // Move to the next number
      }

      return primes;
    }

    // generator.empty(1000);
    generator.grid(2).then(() => {
      gi.transaction(() => {
        const semtex = gi.vertexAuxiliary.createProperty();
        // semtex.set(0, 71828);
        primes(gi.vertexCount).forEach((prime, index) => {
          semtex.set(index, prime);
        });

        graph.text.vertices.aux = semtex.ref;
        console.log("set");
      });
    });

    let doRender = true,
      doForce = false;

    const loop = async () => {
      await gi.tick();
      setTimeout(loop, 5);
    };

    loop();

    const render = async () => {
      requestAnimationFrame(render);

      if (!doRender) return;
      if (!Task.idle()) return;

      if (doForce) graph.forces.update(0.1);

      renderer.render(scene, camera);
    };
    render();

    console.log("edgeData", await graph.edgeData.read(0, 1));
    console.log("edgeCount", graph.edges.count);

    window.addEventListener("dblclick", async (event) => {
      if (event.button !== LEFT_MOUSE_BUTTON) return;
      if (hovering) return;

      const { x, y } = worldCoords(event);

      await gi.transaction(() => {
        gi.addVertex(x, y);
      });
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "x") {
        gi.transaction(async () => {
          const edges = gi.edges.clone();

          for (let i = 0; i < graph.edges.count * 16; i += 16) {
            const selected = edges.getUint32(i + 8) & 1;
            const id = edges.getUint32(i + 12);

            if (selected) {
              const e = gi.getEdge(id);
              if (!e) continue;
              gi.deleteEdge(e);
            }
          }

          const vertices = gi.vertices.clone();

          for (let i = 0; i < graph.vertices.count * 16; i += 16) {
            const selected = vertices.getUint32(i + 8) & 1;
            const id = vertices.getUint32(i + 12);

            if (selected) {
              const v = gi.getVertex(id);
              if (!v) continue;
              gi.deleteVertex(v);
            }
          }
        });
      } else if (event.key === "m") {
        gi.transaction(async () => {
          const selectedVertices: any[] = [];
          const vertices = gi.vertices.clone();

          for (let i = 0; i < graph.vertices.count * 16; i += 16) {
            const isSelected = vertices.getUint32(i + 8) & 1;
            const id = vertices.getUint32(i + 12);

            if (isSelected) {
              selectedVertices.push(gi.getVertex(id)!);
            }
          }

          gi.merge(selectedVertices);
        });

        // gi.addVertex(0, 0);
      } else if (event.key === "k") {
        gi.transaction(async () => {
          const selectedVertices: any[] = [];
          const vertices = gi.vertices;

          for (let i = 0; i < graph.vertices.count * 16; i += 16) {
            const isSelected = vertices.getUint32(i + 8) & 1;
            const id = vertices.getUint32(i + 12);

            if (isSelected) {
              selectedVertices.push(gi.getVertex(id)!);
            }
          }

          gi.cliqueify(selectedVertices);
        });
      } else if (event.key === "q") {
        const coords = getMousePosition();
        const { x, y } = worldCoords({
          clientX: coords.x,
          clientY: coords.y,
        } as any);

        gi.transaction(() => {
          const vertices = gi.vertices;

          const hoveredVertex = gi.addVertex(x, y);

          for (let i = 0; i < graph.vertices.count * 16; i += 16) {
            const isSelected = vertices.getUint32(i + 8) & 1;
            const id = vertices.getUint32(i + 12);

            if (isSelected) {
              const selectedVertex = gi.getVertex(id);
              if (!selectedVertex || selectedVertex.id === hoveredVertex.id)
                continue;
              gi.addEdge(selectedVertex, hoveredVertex);
            }
          }

          for (let i = 0; i < graph.vertices.count * 16; i += 16) {
            vertices.setUint32(i + 8, 0);
          }

          vertices.setUint32(hoveredVertex.index * 16 + 8, 3);
        });
      } else if (event.key === "e") {
        if (hoveredType !== "vertex") return;
        const hid = hoveredId;

        gi.transaction(async () => {
          const vertices = gi.vertices;

          const hoveredVertex = gi.getVertex(
            vertices.getUint32(hid * 16 + 12)
          )!;

          for (let i = 0; i < graph.vertices.count * 16; i += 16) {
            const isSelected = vertices.getUint32(i + 8) & 1;
            const id = vertices.getUint32(i + 12);

            if (isSelected) {
              const selectedVertex = gi.getVertex(id);
              if (!selectedVertex || selectedVertex.id === hoveredVertex.id)
                continue;
              try {
                gi.addEdge(selectedVertex, hoveredVertex);
              } catch (e) {
                console.error(e);
              }
            }
          }

          for (let i = 0; i < graph.vertices.count * 16; i += 16) {
            vertices.setUint32(i + 8, 0);
          }

          vertices.setUint32(hid * 16 + 8, 3);
        });
      } else if (event.key === "f") {
        doForce = !doForce;
      } else if (event.key === "z") {
        gi.transaction(
          () => {
            console.log("undo");
            gi.undo();
          },
          { undo: true }
        );
      } else if (event.key === "y") {
        gi.transaction(
          () => {
            console.log("redo");
            gi.redo();
          },
          { redo: true }
        );
      }
    });

    function screenCoords(event: MouseEvent) {
      const { top, left, width, height } =
        renderer.domElement.getBoundingClientRect();
      return new Vector2(
        ((event.clientX - left) / width) * 2 - 1,
        ((height - (event.clientY - top)) / height) * 2 - 1
      );
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
        } else if (event.shiftKey)
          graph.select(hoveredType as any, hoveredId, false);

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

      // graph.selection(min, max, select, false);
      graph.countSelected();

      Draw.reset();
      selection = false;
    });

    window.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  });
</script>

<div bind:this={container} class="w-full h-full"></div>
