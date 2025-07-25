<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { buttonVariants } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import { getPropertyOfTypeNames } from "$lib/ui";
  import type { EditorInterface } from "./EditorInterface";

  let { open = $bindable<boolean>(), editor }: { open: boolean; editor: EditorInterface } = $props();

  let depthProperty = $state(undefined);
  let previousVertexProperty = $state(undefined as string | undefined);

  let rootId: number | undefined = $state(undefined);

  let properties = $state({} as Record<string, any>);

  function react() {
    properties = editor.vertexProperties.properties;
  }

  $effect(() => {
    if (open) {
      editor.reactive(react);
      react();

      console.log("open");

      editor.transaction(() => {
        for (const vertex of editor.graph.vertices) {
          if (rootId === undefined) rootId = vertex.id;

          if (vertex.isSelected) {
            rootId = vertex.id;
            break;
          }
        }
      });
    } else if (editor.unreactive) {
      editor.unreactive(react);
    }
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Depth-first search</Dialog.Title>
    </Dialog.Header>

    <Label>Root Vertex ID</Label>
    <Input type="number" bind:value={rootId} />

    <Label>
      Depth property
      <Badge class="ml-2">Output</Badge>
    </Label>
    <Select.Root type="single" bind:value={depthProperty}>
      <Select.Trigger>
        <span>{depthProperty || "Select a property"}</span>
      </Select.Trigger>
      <Select.Content>
        {#if getPropertyOfTypeNames(editor.vertexProperties, "integer").length === 0}
          <div class="px-2 py-1 text-muted-foreground text-sm">
            No suitable properties found. You can create them in the sidebar.
          </div>
        {:else}
          {#each getPropertyOfTypeNames(editor.vertexProperties, "integer") as propertyName}
            <Select.Item value={propertyName}>
              {propertyName}
            </Select.Item>
          {/each}
        {/if}
      </Select.Content>
    </Select.Root>

    <Label>
      Previous vertex property
      <Badge class="ml-2">Output</Badge>
    </Label>
    <Select.Root type="single" bind:value={previousVertexProperty}>
      <Select.Trigger>
        <span>{previousVertexProperty || "Select a property"}</span>
      </Select.Trigger>
      <Select.Content>
        {#if getPropertyOfTypeNames(editor.vertexProperties, "vertex").length === 0}
          <div class="px-2 py-1 text-muted-foreground text-sm">
            No suitable properties found. You can create them in the sidebar.
          </div>
        {:else}
          {#each getPropertyOfTypeNames(editor.vertexProperties, "vertex") as propertyName}
            <Select.Item value={propertyName}>
              {propertyName}
            </Select.Item>
          {/each}
        {/if}
      </Select.Content>
    </Select.Root>

    <Dialog.Footer>
      <Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
      <Dialog.Close
        class={buttonVariants({ variant: "default" })}
        onclick={async () => {
          if (!rootId) {
            alert("Root vertex not selected");
            return;
          }

          const root = editor.graph.getVertex(rootId);

          if (!root) {
            alert("Root vertex not found");
            return;
          }

          await editor.algorithms.dfs(root, depthProperty, previousVertexProperty);
        }}
        >Run
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
