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

  let edgeDistanceProperty = $state(undefined as string | undefined);
  let pathDistanceProperty = $state(undefined as string | undefined);
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
      Edge distance property
      <Badge class="ml-2">Input</Badge>
    </Label>
    <Select.Root type="single" bind:value={edgeDistanceProperty}>
      <Select.Trigger>
        <span>{edgeDistanceProperty || "Select a property"}</span>
      </Select.Trigger>
      <Select.Content>
        {#each getPropertyOfTypeNames(editor.edgeProperties, "integer") as propertyName}
          <Select.Item value={propertyName}>
            {propertyName}
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>

    <Label>
      Path distance property
      <Badge class="ml-2">Output</Badge>
    </Label>
    <Select.Root type="single" bind:value={pathDistanceProperty}>
      <Select.Trigger>
        <span>{pathDistanceProperty || "Select a property"}</span>
      </Select.Trigger>
      <Select.Content>
        {#each getPropertyOfTypeNames(editor.vertexProperties, "integer") as propertyName}
          <Select.Item value={propertyName}>
            {propertyName}
          </Select.Item>
        {/each}
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
        {#each getPropertyOfTypeNames(editor.vertexProperties, "vertex") as propertyName}
          <Select.Item value={propertyName}>
            {propertyName}
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>

    <Dialog.Footer>
      <Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
      <Dialog.Close
        class={buttonVariants({ variant: "default" })}
        onclick={(event) => {
          if (!rootId) {
            alert("Root vertex not selected");
            event.preventDefault();
            return;
          }

          const root = editor.graph.getVertex(rootId);

          if (!root) {
            alert("Root vertex not found");
            event.preventDefault();
            return;
          }

          if (!edgeDistanceProperty) {
            alert("Edge distance property not selected");
            event.preventDefault();
            return;
          }

          editor.algorithms.dijkstra(root, edgeDistanceProperty!, pathDistanceProperty, previousVertexProperty).catch((error) => {
            alert(`Dijkstra: ${error}`);
          });
        }}
        >Run
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
