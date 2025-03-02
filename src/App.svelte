<script lang="ts">
  import AppSidebar from "$lib/AppSidebar.svelte";
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
  import { onKeybind } from "$lib/input";

  let selection = $state(null);

  let updateSelected = $state(null);

  let forcesEnabled = $state(false);
  let gridEnabled = $state(false);

  onKeybind("Ctrl+Shift+X", () => {
    console.log("pressed Ctrl+Shift+X");
  });
</script>

<div class="w-full h-full bg-gray-100 flex flex-col overflow-hidden">
  <Menubar.Root class="px-4 -mx-2">
    <Menubar.Menu>
      <Menubar.Trigger>File</Menubar.Trigger>
      <Menubar.Content>
        <Menubar.Item class="cursor-pointer">
          <File strokeWidth="1" class="mr-2" size="16" />
          New
          <Menubar.Shortcut>Ctrl+N</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <FolderOpen strokeWidth="1" class="mr-2" size="16" />
          Open
          <Menubar.Shortcut>Ctrl+O</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <Download strokeWidth="1" class="mr-2" size="16" />
          Download
          <Menubar.Shortcut>Ctrl+S</Menubar.Shortcut>
        </Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>

    <Menubar.Menu>
      <Menubar.Trigger>Edit</Menubar.Trigger>
      <Menubar.Content>
        <Menubar.Item class="cursor-pointer">
          <Undo strokeWidth="1" class="mr-2" size="16" />
          Undo
          <Menubar.Shortcut>Ctrl+Z</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <Redo strokeWidth="1" class="mr-2" size="16" />
          Redo
          <Menubar.Shortcut>Ctrl+Y</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Separator />
        <Menubar.Item class="cursor-pointer">
          <Copy strokeWidth="1" class="mr-2" size="16" />
          Copy
          <Menubar.Shortcut>Ctrl+C</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <Clipboard strokeWidth="1" class="mr-2" size="16" />
          Paste
          <Menubar.Shortcut>Ctrl+V</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <Scissors strokeWidth="1" class="mr-2" size="16" />
          Cut
          <Menubar.Shortcut>Ctrl+X</Menubar.Shortcut>
        </Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>

    <Menubar.Menu>
      <Menubar.Trigger>Selection</Menubar.Trigger>
      <Menubar.Content class="w-64">
        <Menubar.Item class="cursor-pointer">
          <SquareMousePointer strokeWidth="1" class="mr-2" size="16" />
          Select All
          <Menubar.Shortcut>Ctrl+A</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <UnfoldVertical strokeWidth="1" class="mr-2" size="16" />
          Invert Selection
          <Menubar.Shortcut>Ctrl+I</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Separator />
        <Menubar.Item class="cursor-pointer">
          <CircleSmall strokeWidth="1" class="mr-2" size="16" />
          Only Vertices
          <Menubar.Shortcut>Ctrl+Shift-V</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <Spline strokeWidth="1" class="mr-2" size="16" />
          Only Edges
          <Menubar.Shortcut>Ctrl+Shift+E</Menubar.Shortcut>
        </Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>

    <Menubar.Menu>
      <Menubar.Trigger>Preferences</Menubar.Trigger>
      <Menubar.Content>
        <Menubar.CheckboxItem bind:checked={forcesEnabled} class="cursor-pointer">
          <Atom strokeWidth="1" class="mr-2" size="16" />
          Enable Forces
          <Menubar.Shortcut>F</Menubar.Shortcut>
        </Menubar.CheckboxItem>
        <Menubar.CheckboxItem bind:checked={gridEnabled} class="cursor-pointer">
          <Grid3x3 strokeWidth="1" class="mr-2" size="16" />
          Show Grid
          <Menubar.Shortcut>G</Menubar.Shortcut>
        </Menubar.CheckboxItem>
      </Menubar.Content>
    </Menubar.Menu>

    <Menubar.Menu>
      <Menubar.Trigger>Tools</Menubar.Trigger>
      <Menubar.Content class="w-64">
        <Menubar.Item class="cursor-pointer">
          <Combine strokeWidth="1" class="mr-2" size="16" />
          Merge
          <Menubar.Shortcut>M</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <Globe strokeWidth="1" class="mr-2" size="16" />
          Cliqueify
          <Menubar.Shortcut>K</Menubar.Shortcut>
        </Menubar.Item>
        <Menubar.Separator />
        <Menubar.Item class="cursor-pointer">
          <Crop strokeWidth="1" class="mr-2" size="16" />
          Subgraph
        </Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>

    <Menubar.Menu>
      <Menubar.Trigger>Generate</Menubar.Trigger>
      <Menubar.Content class="w-64">
        <Menubar.Item class="cursor-pointer">
          <Circle strokeWidth="1" class="mr-2" size="16" />
          Empty
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <Globe strokeWidth="1" class="mr-2" size="16" />
          Clique
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <TreePine strokeWidth="1" class="mr-2" size="16" />
          Tree
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
          <Grid3x3 strokeWidth="1" class="mr-2" size="16" />
          Grid
        </Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>

    <!-- <Menubar.Menu>
      <Menubar.Trigger>Scripts</Menubar.Trigger>
      <Menubar.Content>
        <Menubar.Item>Executable Scripts</Menubar.Item>
        <Menubar.Item>Import Scripts</Menubar.Item>
        <Menubar.Item>Export Scripts</Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu> -->

    <Menubar.Menu>
      <Menubar.Trigger>Algorithms</Menubar.Trigger>
      <Menubar.Content>
        <Menubar.Item class="cursor-pointer">
          <ChevronsDown strokeWidth="1" class="mr-2" size="16" />
          DFS
        </Menubar.Item>
        <Menubar.Item class="cursor-pointer">
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
    <Editor onselect={(info: any) => (selection = info)} bind:updateSelected />
    <Sidebar.Provider>
      <AppSidebar {selection} {updateSelected} />
    </Sidebar.Provider>
  </div>
</div>
