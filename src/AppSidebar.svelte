<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import Input from "./lib/components/ui/input/input.svelte";
  import Label from "./lib/components/ui/label/label.svelte";
  import Button from "./lib/components/ui/button/button.svelte";

  import VertexSidebar from "./VertexSidebar.svelte";
  import Trash from "lucide-svelte/icons/trash";
  import EdgeSidebar from "./EdgeSidebar.svelte";

  let { selection, updateSelected } = $props();

  const typeStyles = {
    uint32: {
      label: "Uint32",
      color: "text-indigo-700",
    },
    float32: {
      label: "Float32",
      color: "text-green-700",
    },
  };
</script>

<Sidebar.Root side="right">
  <Sidebar.Content class="p-4">
    {#if selection && (selection.vertexCount || selection.edgeCount)}
      {#if selection.vertex}
        <VertexSidebar {selection} {updateSelected} />
      {:else if selection.edge}
        <EdgeSidebar {selection} />
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
              bind:value={selection.averageVertexPosition.x}
              oninput={() => updateSelected(selection)}
            />
          </div>

          <div>
            <Label>Average Y</Label>
            <Input
              type="number"
              bind:value={selection.averageVertexPosition.y}
              oninput={() => updateSelected(selection)}
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
      <div class="flex flex-col items-center justify-center h-full">
        <div class="text-2xl font-semibold">No Selection</div>
        <div class="text-gray-500">Select a vertex or an edge to view details</div>
      </div>
    {/if}
  </Sidebar.Content>
</Sidebar.Root>
