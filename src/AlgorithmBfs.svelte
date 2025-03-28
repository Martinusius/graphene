<script lang="ts">
  import { buttonVariants } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import * as Select from "$lib/components/ui/select/index.js"; 
  import type { EditorInterface } from "./EditorInterface";

  let { open = $bindable<boolean>(), editor }: { open: boolean, editor: EditorInterface } = $props();

  let depthProperty = $state(undefined);
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
        for(const vertex of editor.graph.vertices) {
          if(rootId === undefined) rootId = vertex.id;


          if(vertex.isSelected) {
            rootId = vertex.id;
            break;
          }
        }
      });
     
    } else if(editor.unreactive) {
      editor.unreactive(react);
    }
  });
</script>

<Dialog.Root bind:open={open}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Breadth-first search</Dialog.Title>
    </Dialog.Header>

    <Label>Root Vertex ID</Label>
    <Input type="number" bind:value={rootId} />

    <Label>Depth property</Label>
    <Select.Root type="single" bind:value={depthProperty}>
      <Select.Trigger>
        <span>{depthProperty || "Select a property"}</span>
      </Select.Trigger>
      <Select.Content>
        {#each Object.keys(editor.vertexProperties.properties) as propertyName}
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
        onclick={async () => {
          if(!rootId) {
            alert("Root vertex not selected");
            return;
          }

          const root =  editor.graph.getVertex(rootId);

          if (!root) {
            alert("Root vertex not found");
            return;
          }

          await editor.algorithms.bfs(root, depthProperty);
        }}>Run
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>