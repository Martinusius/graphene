<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import Input from "./lib/components/ui/input/input.svelte";
  import Label from "./lib/components/ui/label/label.svelte";
  import Button from "./lib/components/ui/button/button.svelte";

  import VertexSidebar from "./VertexSidebar.svelte";
  import Trash from "lucide-svelte/icons/trash";
  import EdgeSidebar from "./EdgeSidebar.svelte";
  import type { EditorInterface } from "./EditorInterface";

  let {
    selection,
    updateSelected,
    editor,
    open = $bindable(),
  } = $props() as {
    selection: any;
    updateSelected: any;
    editor: EditorInterface;
    open: boolean;
  };

  let position = $state({ x: 0, y: 0 });

  $effect(() => {
    if (selection) {
      position = { ...selection.averageVertexPosition };
    }
  });
</script>

<Sidebar.Root side="right">
  <Sidebar.Content class="p-4">
    {#if selection && (selection.vertexCount || selection.edgeCount)}
      {#if selection.vertex}
        <VertexSidebar {selection} {updateSelected} {editor} />
      {:else if selection.edge}
        <EdgeSidebar {selection} {editor} />
      {:else}
        <Sidebar.Header class="flex flex-row">
          <div class="text-2xl font-semibold flex-1">Selection</div>
          <Sidebar.Trigger />
        </Sidebar.Header>
        <div class="p-2 flex flex-col gap-3">
          <div>
            <Label>Vertex Count</Label>
            <Input type="number" disabled value={selection.vertexCount} />
          </div>

          <div>
            <Label>Edge Count</Label>
            <Input type="number" disabled value={selection.edgeCount} />
          </div>

          <div>
            <Label>Average X</Label>
            <Input
              type="number"
              bind:value={position.x}
              oninput={() =>
                updateSelected({
                  ...selection,
                  averageVertexPosition: { ...position },
                })}
            />
          </div>

          <div>
            <Label>Average Y</Label>
            <Input
              type="number"
              bind:value={position.y}
              oninput={() =>
                updateSelected({
                  ...selection,
                  averageVertexPosition: { ...position },
                })}
            />
          </div>
        </div>
        <Sidebar.Footer>
          <Button class="flex w-full" variant="destructive">
            <Trash size="16" /> Delete
          </Button>
        </Sidebar.Footer>
      {/if}
    {:else}
      <Sidebar.Header class="flex flex-row justify-end">
        <Sidebar.Trigger />
      </Sidebar.Header>
      <div class="flex flex-col items-center justify-center h-full">
        <div class="text-2xl font-semibold">No Selection</div>
        <div class="text-gray-500">Select a vertex or an edge to view details</div>
      </div>
    {/if}
  </Sidebar.Content>
</Sidebar.Root>
