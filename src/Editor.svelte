<script lang="ts">
  import "./app.css";
  import { onMount } from "svelte";
  import { Scene, OrthographicCamera, WebGLRenderer, Vector2, Vector3 } from "three";
  import { OrbitControls } from "./lib/OrbitControls";
  import { initGrid } from "./lib/grid";
  import { getMousePosition, isMousePressed, LEFT_MOUSE_BUTTON, RIGHT_MOUSE_BUTTON } from "./lib/input";
  import { Draw } from "./lib/Draw";
  import { GraphRenderer } from "./lib/texture/GraphRenderer";
  import { Three } from "./lib/texture/Three";
  import { Task } from "./lib/texture/Task";
  import { UndirectedGraph } from "./lib/texture/interface/undirected/UndirectedGraph";
  import { floatBitsToUint } from "./lib/texture/reinterpret";
  import { GraphGenerator } from "./lib/texture/GraphGenerator";
  import { DynamicArray } from "./lib/texture/DynamicArray";
  import { DragState, type EditorInterface } from "./EditorInterface";
  import { toByteArray, fromByteArray } from "base64-js";
  import { GraphAlgorithms } from "$lib/GraphAlgorithms";
  import { INTEGER_NULL } from "./Properties";
  import { GraphExporter } from "$lib/texture/GraphExporter";
  import { GraphImporter } from "$lib/texture/GraphImporter";
  import { DirectedGraph } from "$lib/texture/interface/directed/DirectedGraph";
  import { SelectionOperation } from "$lib/texture/SelectionOperation";

  let { onselect, updateSelected = $bindable(), editor = $bindable() as EditorInterface } = $props();

  let container: HTMLDivElement;

  onMount(async () => {
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xffffff, 0);
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

    const grid = initGrid(container, camera);
    scene.add(grid);

    Draw.init(scene, camera);

    const three = new Three(renderer, camera, scene);

    const graph = new GraphRenderer(three, 1024, 1024);
    graph.vertices.count = 0;

    let gi: UndirectedGraph | DirectedGraph = new DirectedGraph(graph);

    const generator = new GraphGenerator(gi);

    let lastSelection: any;

    let lastUpdateSelectionInfoTimestamp = 0;
    async function updateSelectionInfo() {
      if (lastUpdateSelectionInfoTimestamp + 100 > performance.now()) return;
      lastUpdateSelectionInfoTimestamp = performance.now();

      const info = await graph.selectionInfo();
      const vertex = info.vertexIndex !== null ? await graph.vertexData.read(info.vertexIndex) : null;
      const edge = info.edgeIndex !== null ? await graph.edgeData.read(info.edgeIndex) : null;

      const result = {
        vertexCount: info.vertexCount,
        edgeCount: info.edgeCount,
        vertex: vertex ? { x: vertex[0], y: vertex[1], id: floatBitsToUint(vertex[3]), index: info.vertexIndex } : null,
        edge: edge
          ? {
              u: floatBitsToUint(edge[0]),
              v: floatBitsToUint(edge[1]),
              id: floatBitsToUint(edge[3]),
              index: info.edgeIndex,
            }
          : null,
        averageVertexPosition: info.averageVertexPosition,
      };

      lastSelection = structuredClone(result);

      onselect(result);
      reactives.forEach((callback) => callback());
    }

    updateSelected = function (selection: any) {
      let diff;

      if (selection.vertex && lastSelection.vertex) {
        diff = new Vector2(selection.vertex.x - lastSelection.vertex.x, selection.vertex.y - lastSelection.vertex.y);
      } else {
        diff = new Vector2(
          selection.averageVertexPosition.x - lastSelection.averageVertexPosition.x,
          selection.averageVertexPosition.y - lastSelection.averageVertexPosition.y
        );
      }

      lastSelection = $state.snapshot(selection);

      if (diff) graph.drag(diff);
    };

    let doRender = true,
      doForce = false;

    let reactives: (() => void)[] = [];

    let algorithms = new GraphAlgorithms(gi);
    let exporter = new GraphExporter(gi);
    let importer = new GraphImporter(gi);

    async function copy(cut = false) {
      const mouseWorld = worldCoords({ clientX: getMousePosition().x, clientY: getMousePosition().y } as any);

      const graphene = await exporter.graphene(false, cut, mouseWorld);

      await navigator.clipboard.writeText(graphene);
    }

    async function paste() {
      const text = await navigator.clipboard.readText();

      if (!text) return;

      const mouseWorld = worldCoords({ clientX: getMousePosition().x, clientY: getMousePosition().y } as any);

      await importer.graphene(text, mouseWorld);
    }

    editor = {
      operations: {
        delete() {
          return gi.transaction(async () => {
            const edges = gi.edges;
            for (const edge of edges) {
              if (edge.isSelected) edge.delete();
            }

            const vertices = gi.vertices;
            for (const vertex of vertices) {
              if (vertex.isSelected) vertex.delete();
            }
          });
        },
        merge() {
          return gi.transaction(async () => {
            gi.merge(gi.vertices.filter((v) => v.isSelected) as any);
          });
        },
        cliqueify() {
          return gi.transaction(async () => {
            gi.cliqueify(gi.vertices.filter((v) => v.isSelected) as any);
          });
        },
        subgraph() {
          return gi.transaction(async () => {
            const edges = gi.edges;
            for (const edge of edges) {
              if (!edge.isSelected) edge.delete();
            }

            const vertices = gi.vertices;
            for (const vertex of vertices) {
              if (!vertex.isSelected) vertex.delete();
            }
          });
        },
        undo() {
          return gi
            .transaction(
              () => {
                gi.undo();
              },
              { undo: true }
            )
            .then(() => {
              reactives.forEach((callback) => callback());
            });
        },
        redo() {
          gi.transaction(
            () => {
              gi.redo();
            },
            { redo: true }
          ).then(() => {
            reactives.forEach((callback) => callback());
          });
        },
        copy() {
          copy(false);
        },
        cut() {
          copy(true);
        },
        paste() {
          paste();
        },
      },
      selectionOperation(operation: SelectionOperation) {
        graph.selectionOperation(operation);
      },
      flags: {
        isUndoable: false,
        isRedoable: false,
      },
      reactive(callback: () => void) {
        reactives.push(callback);
      },
      unreactive(callback: () => void) {
        reactives = reactives.filter((other) => other !== callback);
      },
      areForcesEnabled: doForce,
      isGridShown: grid.parent !== null,
      vertexProperties: gi.vertexAuxiliary,
      edgeProperties: gi.edgeAuxiliary,
      set vertexDisplayProperty(value: string) {
        gi.vertexDisplayProperty = value === "None" ? null : value;
      },
      get vertexDisplayProperty() {
        return gi.vertexDisplayProperty === null ? "None" : gi.vertexDisplayProperty;
      },
      set edgeDisplayProperty(value: string) {
        gi.edgeDisplayProperty = value === "None" ? null : value;
      },
      get edgeDisplayProperty() {
        return gi.edgeDisplayProperty === null ? "None" : gi.edgeDisplayProperty;
      },
      transaction(fn: () => void) {
        return gi.transaction(fn);
      },
      get generator() {
        return generator;
      },
      get algorithms() {
        return algorithms;
      },
      get exporter() {
        return exporter;
      },
      get importer() {
        return importer;
      },
      get graph() {
        return gi;
      },
      async createNew(type) {
        gi.dispose();

        if (type === "undirected") gi = new UndirectedGraph(graph);
        else if (type === "directed") gi = new DirectedGraph(graph);

        editor.vertexProperties = gi.vertexAuxiliary;
        editor.edgeProperties = gi.edgeAuxiliary;

        exporter = new GraphExporter(gi);
        importer = new GraphImporter(gi);
        algorithms = new GraphAlgorithms(gi);
      },
    } as EditorInterface;

    generator.grid(4).then(() => {
      generator.grid(3);

      editor.transaction(() => {
        editor.vertexProperties.createProperty("Distance", "integer");
        editor.vertexProperties.createProperty("Previous", "vertex");

        for (const vertex of gi.vertices) {
          // vertex.setProperty("Distance", INTEGER_NULL);
        }

        editor.edgeProperties.createProperty("EdgeLength", "integer");
        for (const edge of gi.edges) {
          edge.setProperty("EdgeLength", Math.floor(Math.random() * 10));
        }
      });

      editor.vertexProperties.createProperty("Test", "integer");

      editor.edgeProperties.createProperty("Test", "integer");


      let lastProp = null as null | number;

      editor.vertexDisplayProperty = "Test";

      async function roll() {
        await gi.transaction(() => {


          const currentProp = gi.vertices[0].getProperty("Test");
          
          console.log('last', lastProp, 'current', currentProp); 
          if(lastProp != null && lastProp !== currentProp) {
            throw new Error('Not matching');
          }

          // lastProp = Math.floor(Math.random() * 2**32) - 2**31 - 2**26;
          // lastProp = Math.floor(Math.random() * 2**32) - 2**31;
          lastProp = -200;
          // lastProp = 0;


          gi.vertices[0].setProperty("Test", lastProp);
        });

        setTimeout(roll, 1);
      }

      // setTimeout(roll, 1000);
      // algorithms.dijkstra(gi.vertices[0], "EdgeLength", "Distance", "Previous");
    });

    generator.clique(5);

    window.addEventListener("keydown", (event) => {
      if (event.key === "q") {
        const coords = getMousePosition();
        const { x, y } = worldCoords({
          clientX: coords.x,
          clientY: coords.y,
        } as any);

        gi.transaction(() => {
          const newVertex = gi.addVertex(x, y);

          const vertices = gi.vertices;

          for (const vertex of vertices) {
            if (vertex.isSelected && vertex.id !== newVertex.id) {
              try {
                gi.addEdge(vertex as any, newVertex as any);
              } catch (_) {} // If already exists (we don't really need to log this)
            }

            vertex.isSelected = vertex.id === newVertex.id;
          }
        });
      } else if (event.key === "e") {
        if (hoveredType !== "vertex") return;
        const hoveredId = gi.vertexAt(hoveredIndex)?.id;

        gi.transaction(async () => {
          const vertices = gi.vertices;

          const hoveredVertex = gi.getVertex(hoveredId);
          if (!hoveredVertex) return;

          for (const vertex of vertices) {
            if (vertex.isSelected) {
              try {
                gi.addEdge(vertex as any, hoveredVertex as any);
              } catch (_) {} // If already exists (we don't really need to log this)
            }

            vertex.isSelected = vertex.id === hoveredVertex.id;
          }
        });
      }
    });

    const loop = async () => {
      const resolveTask = await gi.tick();

      if (resolveTask) {
        editor.flags.isUndoable = gi.versioner.isUndoable();
        editor.flags.isRedoable = gi.versioner.isRedoable();

        resolveTask();
      }

      await updateSelectionInfo();

      if (editor.isGridShown !== !!grid.parent) scene[grid.parent ? "remove" : "add"](grid);

      setTimeout(loop, 10);
    };

    loop();

    const render = async () => {
      requestAnimationFrame(render);

      if (!doRender) return;
      if (!Task.idle()) return;

      if (editor.areForcesEnabled) graph.forces.update(0.1);

      gi.beforeRender();
      renderer.render(scene, camera);
    };
    render();

    container.addEventListener("dblclick", async (event) => {
      if (event.button !== LEFT_MOUSE_BUTTON) return;
      if (hovering) {
        let position = new Vector2();
        let size = 0;

        if (hoveredType === "vertex") {
          const vertex = gi.vertexAt(hoveredIndex);
          await vertex.download();

          position.set(vertex.x, vertex.y);
          size = 8;
        } else if (hoveredType === "edge") {
          const edge = gi.edgeAt(hoveredIndex);
          await Promise.all([edge.u.download(), edge.v.download()]);

          const uPos = new Vector2(edge.u.x, edge.u.y);
          const vPos = new Vector2(edge.v.x, edge.v.y);

          position.copy(uPos.lerp(vPos, 0.5));
        }

        controls.reset();
        controls.target.set(position.x, position.y, 0);
        camera.position.set(position.x, position.y, 50);
        controls.update();
      } else {
        const { x, y } = worldCoords(event);

        await gi.transaction(() => {
          gi.addVertex(x, y);
        });
      }
    });

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
      hoveredIndex = -1;

    function mouseMoveHover(event: MouseEvent) {
      if (dragState !== DragState.None) return;

      const { x, y } = screenCoords(event);

      graph.raycast(new Vector2(x, y)).then((result) => {
        if (!result) {
          document.body.style.cursor = "default";

          graph.unhover();

          hovering = false;
          return;
        }

        const { type, index } = result;

        document.body.style.cursor = "pointer";

        if (type === "vertex") {
          graph.hover("vertex", index);
        }

        if (type === "edge") {
          graph.hover("edge", index);
        }

        hoveredType = type;
        hoveredIndex = index;
        hovering = true;
      });
    }

    container.addEventListener("mousemove", mouseMoveHover);
    container.addEventListener("wheel", mouseMoveHover);

    camera.updateMatrix();

    let first = new Vector2();
    let selecting = false;

    let select = true;

    let dragState = DragState.None;

    const startCoords = new Vector2();

    async function mouseDown(event: MouseEvent) {
      if (isMousePressed(RIGHT_MOUSE_BUTTON)) return;
      if (event.button !== LEFT_MOUSE_BUTTON) return;

      if (hovering && !event.altKey) {
        dragState = DragState.Preparing;
        const selected = await graph.isSelected(hoveredType as any, hoveredIndex);
        dragState = DragState.Ready;

        if (!selected) {
          if (!event.shiftKey) graph.deselectAll();
          graph.select(hoveredType as any, hoveredIndex);
        } else if (event.shiftKey) graph.select(hoveredType as any, hoveredIndex, false);

        startCoords.copy(worldCoords(event));
        updateSelectionInfo();
        return;
      }

      if (!event.shiftKey && !event.altKey) {
        updateSelectionInfo();
        graph.deselectAll();
      }

      select = !event.altKey;

      first = screenCoords(event);
      first.divideScalar(camera.zoom * 100);

      selecting = true;
    }

    function mouseMove(event: MouseEvent) {
      if (dragState >= DragState.Ready) {
        const diff = worldCoords(event).sub(startCoords);
        startCoords.copy(worldCoords(event));

        dragState = DragState.Dragging;

        graph.forces.cooling = 1;
        graph.drag(diff);
        updateSelectionInfo();

        return;
      }

      if (!selecting) return;

      Draw.reset();

      const second = screenCoords(event);

      const firstScaled = first.clone();
      firstScaled.multiplyScalar(camera.zoom * 100);

      const min = firstScaled.clone().min(second);
      const max = firstScaled.clone().max(second);

      graph.selection(min, max, select);

      Draw.selectionRectangle(min, max);
    }

    function mouseUp(event: MouseEvent) {
      if (event.button !== 0) return;

      if (dragState !== DragState.None) {
        if (dragState !== DragState.Dragging) {
          if (event.altKey) graph.select(hoveredType as any, hoveredIndex, false);
        } else {
          graph.undrag();
        }

        dragState = DragState.None;

        return;
      }

      if (!selecting) return;

      const second = screenCoords(event);

      const firstScaled = first.clone();
      firstScaled.multiplyScalar(camera.zoom * 100);

      const min = firstScaled.clone().min(second);
      const max = firstScaled.clone().max(second);

      graph.selection(min, max, select, false);
      updateSelectionInfo();

      Draw.reset();
      selecting = false;
    }

    container.addEventListener("mousedown", mouseDown);
    container.addEventListener("mouseup", mouseUp);
    container.addEventListener("mousemove", mouseMove);
    container.addEventListener("wheel", mouseMove);

    container.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  });
</script>

<div bind:this={container} class="absolute inset-0"></div>
