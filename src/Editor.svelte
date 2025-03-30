<script lang="ts">
  import "./app.css";
  import { onMount } from "svelte";
  import { Scene, OrthographicCamera, WebGLRenderer, Vector2, Vector3 } from "three";
  import { OrbitControls } from "./lib/OrbitControls";
  import { initGrid } from "./lib/grid";
  import { getMousePosition, isKeyPressed, isMousePressed, LEFT_MOUSE_BUTTON, RIGHT_MOUSE_BUTTON } from "./lib/input";
  import { Draw } from "./lib/Draw";
  import { GraphRenderer } from "./lib/texture/GraphRenderer";
  import { Three } from "./lib/texture/Three";
  import { Task } from "./lib/texture/Task";
  import { UndirectedGraph } from "./lib/texture/interface/undirected/UndirectedGraph";
  import { floatBitsToUint, uintBitsToFloat } from "./lib/texture/reinterpret";
  import { GraphGenerator } from "./lib/texture/GraphGenerator";
  import { DirectedGraph } from "./lib/texture/interface/directed/DirectedGraph";
  import { DynamicArray } from "./lib/texture/DynamicArray";
  import { selectEdges } from "./lib/texture/selectEdges.glsl";
  import { Auxiliary, type AuxiliaryType } from "./lib/texture/interface/Auxiliary";
  import { DragState, type EditorInterface, type Operations } from "./EditorInterface";
  import internal from "stream";
  import { toByteArray, fromByteArray } from "base64-js";
  import { GraphAlgorithms } from "$lib/GraphAlgorithms";
  import { ArrayQueue } from "$lib/ArrayQueue";

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

    const gi = new UndirectedGraph(graph);

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

    // graph.text.vertices.maxDigits = 0;
    // graph.text.edges.maxDigits = 0;

    // generator.spacing *= 2;
    // generator.randomness = 20;

    let doRender = true,
      doForce = false;

    let reactives: (() => void)[] = [];

    function copy(cut = false, all = false) {
      gi.transaction(async () => {
        const mouseWorld = worldCoords({ clientX: getMousePosition().x, clientY: getMousePosition().y } as any);

        const vertexProperties = Object.entries(gi.vertexAuxiliary.properties)
          .sort((a, b) => a[1].index - b[1].index)
          .map(([name]) => name);

        const edgeProperties = Object.entries(gi.edgeAuxiliary.properties)
          .sort((a, b) => a[1].index - b[1].index)
          .map(([name]) => name);

        const vertexData = new DynamicArray(12);

        const vertices = gi.vertices;
        for (const vertex of vertices) {
          if (!all && !vertex.isSelected) continue;

          vertexData.pushFloat32(vertex.x - mouseWorld.x);
          vertexData.pushFloat32(vertex.y - mouseWorld.y);
          vertexData.pushUint32(vertex.id);

          for (const property of vertexProperties) {
            vertexData.pushUint32(gi.vertexAuxiliary.getProperty(property, vertex.index));
          }
        }

        const edgeData = new DynamicArray(8);

        const edges = gi.edges;
        for (const edge of edges) {
          if (!all && (!edge.isSelected || !edge.u.isSelected || !edge.v.isSelected)) continue;

          edgeData.pushUint32(edge.u.id);
          edgeData.pushUint32(edge.v.id);

          for (const property of edgeProperties) {
            edgeData.pushUint32(gi.edgeAuxiliary.getProperty(property, edge.index));
          }
        }

        const finalJson = {
          vertexProperties,
          edgeProperties,
          vertexData: fromByteArray(vertexData.toArray()),
          edgeData: fromByteArray(edgeData.toArray()),
        };

        navigator.clipboard.writeText(JSON.stringify(finalJson));

        if (cut) {
          for (const edge of edges) {
            if (all || edge.isSelected) edge.delete();
          }

          for (const vertex of vertices) {
            if (all || vertex.isSelected) vertex.delete();
          }
        }
      });
    }

    function paste() {
      gi.transaction(async () => {
        try {
          const mouseWorld = worldCoords({ clientX: getMousePosition().x, clientY: getMousePosition().y } as any);

          const text = await navigator.clipboard.readText();

          const { vertexProperties, edgeProperties, vertexData, edgeData } = JSON.parse(text);

          const vertexDataArray = toByteArray(vertexData);
          const edgeDataArray = toByteArray(edgeData);

          const vertexSize = 12 + vertexProperties.length * 4;
          const edgeSize = 8 + edgeProperties.length * 4;

          const vertexIdConversion = new Map<number, number>();

          for (let i = 0; i < vertexDataArray.length; i += vertexSize) {
            const array = new DynamicArray(vertexSize);
            array.pushFrom(vertexDataArray, i, vertexSize);

            const vertex = gi.addVertex(array.getFloat32(0) + mouseWorld.x, array.getFloat32(4) + mouseWorld.y);

            vertexIdConversion.set(array.getUint32(8), vertex.id);

            for (let j = 0; j < vertexProperties.length; j++) {
              if (gi.vertexAuxiliary.hasProperty(vertexProperties[j])) {
                gi.vertexAuxiliary.setProperty(vertexProperties[j], vertex.index, array.getUint32(12 + j * 4));
              }
            }
          }

          for (let i = 0; i < edgeData.length; i += edgeSize) {
            const array = new DynamicArray(edgeSize);
            array.pushFrom(edgeDataArray, i, edgeSize);

            const u = gi.getVertex(vertexIdConversion.get(array.getUint32(0))!);
            const v = gi.getVertex(vertexIdConversion.get(array.getUint32(4))!);

            if (u && v) {
              const edge = gi.addEdge(u, v);

              for (let j = 0; j < edgeProperties.length; j++) {
                if (gi.edgeAuxiliary.hasProperty(edgeProperties[j])) {
                  gi.edgeAuxiliary.setProperty(edgeProperties[j], edge.index, array.getUint32(8 + j * 4));
                }
              }
            }
          }
        } catch (error) {
          console.error(error);
        }
      });
    }

    const algorithms = new GraphAlgorithms(gi);

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
            gi.merge(gi.vertices.filter((v) => v.isSelected));
          });
        },
        cliqueify() {
          return gi.transaction(async () => {
            gi.cliqueify(gi.vertices.filter((v) => v.isSelected));
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
          copy(false, false);
        },
        cut() {
          copy(true, false);
        },
        paste() {
          paste();
        },
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
        console.log(value);
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
      get graph() {
        return gi;
      },
    } as EditorInterface;

    generator.grid(2).then(() => {
      generator.grid(3);

      editor.transaction(() => {
        editor.vertexProperties.createProperty("hello", "float32");
        for (const vertex of gi.vertices) {
          editor.vertexProperties.setProperty("hello", vertex.index, 11.324);
        }
      });

      algorithms.bfs(gi.vertices[0], "hello");
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
                gi.addEdge(vertex, newVertex);
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
                gi.addEdge(vertex, hoveredVertex);
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

        await updateSelectionInfo();
        resolveTask();
      }

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
        // zoom at object
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

          // size = uPosCopy.sub(vPosCopy).length();
          position.copy(uPos.lerp(vPos, 0.5));
        }

        controls.reset();
        controls.target.set(position.x, position.y, 0);
        camera.position.set(position.x, position.y, 50);
        // camera.position.x = position.x;
        // camera.position.y = position.y;
        // camera.zoom = 1 / size;
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
