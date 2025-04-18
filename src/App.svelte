<script lang="ts">
  import AppSidebar from "./AppSidebar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import Editor from "./Editor.svelte";
  import * as Menubar from "$lib/components/ui/menubar/index.js";

  import Atom from "lucide-svelte/icons/atom";

  import Copy from "lucide-svelte/icons/copy";
  import Scissors from "lucide-svelte/icons/scissors";
  import Clipboard from "lucide-svelte/icons/clipboard";

  import Undo from "lucide-svelte/icons/undo";
  import Redo from "lucide-svelte/icons/redo";

  import File from "lucide-svelte/icons/file";
  import FolderOpen from "lucide-svelte/icons/folder-open";
  import Download from "lucide-svelte/icons/download";

  import Route from "lucide-svelte/icons/route";
  import TreePine from "lucide-svelte/icons/tree-pine";
  import Expand from "lucide-svelte/icons/expand";
  import ChevronsDown from "lucide-svelte/icons/chevrons-down";

  import SquareMousePointer from "lucide-svelte/icons/square-mouse-pointer";
  import UnfoldVertical from "lucide-svelte/icons/unfold-vertical";

  import Spline from "lucide-svelte/icons/spline";
  import CircleSmall from "lucide-svelte/icons/circle-small";

  import Globe from "lucide-svelte/icons/globe";
  import Combine from "lucide-svelte/icons/combine";
  import Crop from "lucide-svelte/icons/crop";
  import Circle from "lucide-svelte/icons/circle";
  import Grid3x3 from "lucide-svelte/icons/grid-3x3";

  import PanelLeft from "lucide-svelte/icons/panel-left";

  import { onKeybind } from "$lib/input";
  import type { EditorInterface } from "./EditorInterface";
  import GenerateEmptyPopup from "./GenerateEmptyPopup.svelte";
  import GenerateGridPopup from "./GenerateGridPopup.svelte";
  import GenerateCliquePopup from "./GenerateCliquePopup.svelte";
  import AlgorithmDfs from "./AlgorithmDfs.svelte";
  import AlgorithmBfs from "./AlgorithmBfs.svelte";
  import { onMount } from "svelte";
  import { SelectionOperation } from "$lib/texture/SelectionOperation";
  import NewGraphPopup from "./NewGraphPopup.svelte";
  import { fileUpload } from "$lib/upload";

  let openSidebar = $state(true);

  let selection = $state(null);

  let updateSelected = $state(null);

  let editor = $state.raw({} as EditorInterface);

  onMount(() => {
    (window as any).importer = editor.importer;
  });

  onKeybind("X", () => editor.operations.delete());
  onKeybind("Delete", () => editor.operations.delete());

  onKeybind("M", () => editor.operations.merge());
  onKeybind("K", () => editor.operations.cliqueify());
  onKeybind("H", () => editor.operations.subgraph());

  onKeybind("Ctrl+Z", () => editor.operations.undo());
  onKeybind("Ctrl+Y", () => editor.operations.redo());

  onKeybind("Ctrl+C", () => editor.operations.copy());
  onKeybind("Ctrl+V", () => editor.operations.paste());
  onKeybind("Ctrl+X", () => editor.operations.cut());

  onKeybind("Ctrl+A", () => editor.selectionOperation(SelectionOperation.SELECT_ALL));
  onKeybind("Ctrl+I", () => editor.selectionOperation(SelectionOperation.INVERT_SELECTION));
  onKeybind("Ctrl+Shift+V", () => editor.selectionOperation(SelectionOperation.ONLY_VERTICES));
  onKeybind("Ctrl+Shift+E", () => editor.selectionOperation(SelectionOperation.ONLY_EDGES));

  let areForcesEnabled = $state(false);
  let isGridShown = $state(true);

  onKeybind("F", () => (areForcesEnabled = editor.areForcesEnabled = !areForcesEnabled));
  onKeybind("G", () => (isGridShown = editor.isGridShown = !isGridShown));

  onKeybind("Ctrl+Shift+X", () => {
    console.log("pressed Ctrl+Shift+X");
  });

  let openNewGraph = $state(false);

  let openGenerateEmpty = $state(false);
  let openGenerateGrid = $state(false);
  let openGenerateClique = $state(false);

  let openAlgorithmDfs = $state(false);
  let openAlgorithmBfs = $state(false);

  function download(filename: string, text: string) {
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    element.setAttribute("download", filename);

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }
</script>

<div class="w-full h-full bg-gray-100 flex flex-col overflow-hidden">
  <NewGraphPopup bind:open={openNewGraph} {editor} />

  <GenerateEmptyPopup bind:open={openGenerateEmpty} {editor} />
  <GenerateCliquePopup bind:open={openGenerateClique} {editor} />
  <GenerateGridPopup bind:open={openGenerateGrid} {editor} />

  <AlgorithmDfs bind:open={openAlgorithmDfs} {editor} />
  <AlgorithmBfs bind:open={openAlgorithmBfs} {editor} />

  <Menubar.Root class="px-4 -mx-2">
    <Menubar.Menu>
      <Menubar.Trigger>File</Menubar.Trigger>
      <Menubar.Content>
        <Menubar.Item class="cursor-pointer" onclick={() => (openNewGraph = true)}>
          <File strokeWidth="1" class="mr-2" size="16" />
          New
          <Menubar.Shortcut>Ctrl+N</Menubar.Shortcut>
        </Menubar.Item>
        <!-- <Menubar.Item class="cursor-pointer" disabled>
        
        </Menubar.Item> -->

        <Menubar.Sub>
          <Menubar.SubTrigger class="cursor-pointer">
            <FolderOpen strokeWidth="1" class="mr-2" size="16" />
            Import
          </Menubar.SubTrigger>
          <Menubar.SubContent>
            <Menubar.Item
              class="cursor-pointer"
              onclick={async () => {
                await editor.importer.edgeList(await fileUpload("text/plain"));
              }}>Edge List (.txt)</Menubar.Item
            >
            <Menubar.Item
              class="cursor-pointer"
              onclick={async () => {
                await editor.importer.weightedEdgeList(await fileUpload("text/plain"));
              }}>Weighted Edge List (.txt)</Menubar.Item
            >
            <Menubar.Item
              class="cursor-pointer"
              onclick={async () => {
                await editor.importer.graphene(await fileUpload(".ene"));
              }}>Graphene (.ene)</Menubar.Item
            >
          </Menubar.SubContent>
        </Menubar.Sub>

        <Menubar.Sub>
          <Menubar.SubTrigger class="cursor-pointer">
            <Download strokeWidth="1" class="mr-2" size="16" />
            Export
          </Menubar.SubTrigger>
          <Menubar.SubContent>
            <Menubar.Item
              class="cursor-pointer"
              onclick={async () => download("graph.txt", await editor.exporter.edgeList())}
              >Edge List (.txt)</Menubar.Item
            >
            <Menubar.Item
              class="cursor-pointer"
              onclick={async () => download("graph.txt", await editor.exporter.weightedEdgeList("Weight"))}
              >Weighted Edge List (.txt)</Menubar.Item
            >
            <Menubar.Item
              class="cursor-pointer"
              onclick={async () => download("graph.ene", await editor.exporter.graphene(true))}
              >Graphene (.ene)</Menubar.Item
            >
          </Menubar.SubContent>
        </Menubar.Sub>
      </Menubar.Content>
    </Menubar.Menu>

    <Menubar.Menu>
      <Menubar.Trigger>Edit</Menubar.Trigger>
      <Menubar.Content>
        <Menubar.Item
          class="cursor-pointer"
          onclick={() => editor.operations.undo()}
          disabled={!editor.flags.isUndoable}
        >
          <Undo strokeWidth="1" class="mr-2" size="16" />
          Undo
          <Menubar.Shortcut>Ctrl+Z</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item
          class="cursor-pointer"
          onclick={() => editor.operations.redo()}
          disabled={!editor.flags.isRedoable}
        >
          <Redo strokeWidth="1" class="mr-2" size="16" />
          Redo
          <Menubar.Shortcut>Ctrl+Y</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Separator />
        <Menubar.Item class="cursor-pointer" onclick={() => editor.operations.copy()}>
          <Copy strokeWidth="1" class="mr-2" size="16" />
          Copy
          <Menubar.Shortcut>Ctrl+C</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer" onclick={() => editor.operations.paste()}>
          <Clipboard strokeWidth="1" class="mr-2" size="16" />
          Paste
          <Menubar.Shortcut>Ctrl+V</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer" onclick={() => editor.operations.cut()}>
          <Scissors strokeWidth="1" class="mr-2" size="16" />
          Cut
          <Menubar.Shortcut>Ctrl+X</Menubar.Shortcut>
        </Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>

    <Menubar.Menu>
      <Menubar.Trigger>Selection</Menubar.Trigger>
      <Menubar.Content class="w-64">
        <Menubar.Item class="cursor-pointer" onclick={() => editor.selectionOperation(SelectionOperation.SELECT_ALL)}>
          <SquareMousePointer strokeWidth="1" class="mr-2" size="16" />
          Select All
          <Menubar.Shortcut>Ctrl+A</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item
          class="cursor-pointer"
          onclick={() => editor.selectionOperation(SelectionOperation.INVERT_SELECTION)}
        >
          <UnfoldVertical strokeWidth="1" class="mr-2" size="16" />
          Invert Selection
          <Menubar.Shortcut>Ctrl+I</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Separator />
        <Menubar.Item
          class="cursor-pointer"
          onclick={() => editor.selectionOperation(SelectionOperation.ONLY_VERTICES)}
        >
          <CircleSmall strokeWidth="1" class="mr-2" size="16" />
          Only Vertices
          <Menubar.Shortcut>Ctrl+Shift+V</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer" onclick={() => editor.selectionOperation(SelectionOperation.ONLY_EDGES)}>
          <Spline strokeWidth="1" class="mr-2" size="16" />
          Only Edges
          <Menubar.Shortcut>Ctrl+Shift+E</Menubar.Shortcut>
        </Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>

    <Menubar.Menu>
      <Menubar.Trigger>Preferences</Menubar.Trigger>
      <Menubar.Content class="w-64">
        <Menubar.CheckboxItem
          checked={areForcesEnabled}
          class="cursor-pointer"
          onclick={() => (areForcesEnabled = editor.areForcesEnabled = !areForcesEnabled)}
        >
          <Atom strokeWidth="1" class="mr-2" size="16" />
          Enable Forces
          <Menubar.Shortcut>F</Menubar.Shortcut>
        </Menubar.CheckboxItem>
        <Menubar.CheckboxItem
          checked={isGridShown}
          class="cursor-pointer"
          onclick={() => (isGridShown = editor.isGridShown = !isGridShown)}
        >
          <Grid3x3 strokeWidth="1" class="mr-2" size="16" />
          Show Grid
          <Menubar.Shortcut>G</Menubar.Shortcut>
        </Menubar.CheckboxItem>
        <Menubar.CheckboxItem checked={openSidebar} class="cursor-pointer" onclick={() => (openSidebar = !openSidebar)}>
          <PanelLeft strokeWidth="1" class="mr-2" size="16" />
          Show Sidebar
          <Menubar.Shortcut>Ctrl + B</Menubar.Shortcut>
        </Menubar.CheckboxItem>
      </Menubar.Content>
    </Menubar.Menu>

    <Menubar.Menu>
      <Menubar.Trigger>Tools</Menubar.Trigger>
      <Menubar.Content class="w-64">
        <Menubar.Item class="cursor-pointer" onclick={() => editor.operations.merge()}>
          <Combine strokeWidth="1" class="mr-2" size="16" />
          Merge
          <Menubar.Shortcut>M</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer" onclick={() => editor.operations.cliqueify()}>
          <Globe strokeWidth="1" class="mr-2" size="16" />
          Cliqueify
          <Menubar.Shortcut>K</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer" onclick={() => editor.operations.subgraph()}>
          <Crop strokeWidth="1" class="mr-2" size="16" />
          Subgraph
          <Menubar.Shortcut>H</Menubar.Shortcut>
        </Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>

    <Menubar.Menu>
      <Menubar.Trigger>Generate</Menubar.Trigger>
      <Menubar.Content class="w-64">
        <Menubar.Item class="cursor-pointer" onclick={() => (openGenerateEmpty = true)}>
          <Circle strokeWidth="1" class="mr-2" size="16" />
          Empty
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer" onclick={() => (openGenerateClique = true)}>
          <Globe strokeWidth="1" class="mr-2" size="16" />
          Clique
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer" onclick={() => (openGenerateGrid = true)}>
          <Grid3x3 strokeWidth="1" class="mr-2" size="16" />
          Grid
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer" disabled>
          <TreePine strokeWidth="1" class="mr-2" size="16" />
          Tree
        </Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>

    <!-- 
    TODO: For the future

    <Menubar.Menu>
      <Menubar.Trigger>Scripts</Menubar.Trigger>
      <Menubar.Content>
        <Menubar.Item>Executable Scripts</Menubar.Item>
        <Menubar.Item>Import Scripts</Menubar.Item>
        <Menubar.Item>Export Scripts</Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>
    -->

    <Menubar.Menu>
      <Menubar.Trigger>Algorithms</Menubar.Trigger>
      <Menubar.Content>
        <Menubar.Item class="cursor-pointer" onclick={() => (openAlgorithmDfs = true)}>
          <ChevronsDown strokeWidth="1" class="mr-2" size="16" />
          DFS
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer" onclick={() => (openAlgorithmBfs = true)}>
          <Expand strokeWidth="1" class="mr-2" size="16" />
          BFS
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <Route strokeWidth="1" class="mr-2" size="16" />
          Dijkstra
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <TreePine strokeWidth="1" class="mr-2" size="16" />
          Kruskal
        </Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>
  </Menubar.Root>

  <div class="relative flex-1">
    <Editor onselect={(info: any) => (selection = info)} bind:updateSelected bind:editor />
    <Sidebar.Provider open={openSidebar} onOpenChange={(open) => (openSidebar = open)}>
      <AppSidebar {selection} {updateSelected} {editor} />
    </Sidebar.Provider>
  </div>
</div>
