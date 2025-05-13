<script lang="ts">
  import { buttonVariants } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import Separator from "$lib/components/ui/separator/separator.svelte";

  let n = $state(10);

  let x = $state(0);
  let y = $state(0);

  let spacing = $state(20);
  let randomness = $state(0);

  let { open = $bindable(), editor } = $props();
</script>

<Dialog.Root bind:open={open}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Generate Empty Graph</Dialog.Title>
    </Dialog.Header>
    <Label>Vertex count</Label>
    <Input type="number" bind:value={n} />

    <div class="flex flex-row gap-4">
      <div class="flex-1">
        <Label>Center X</Label>
        <Input type="number" bind:value={x} />
      </div>
      <div class="flex-1">
        <Label>Center Y</Label>
        <Input type="number" bind:value={y} />
      </div>
    </div>

    <div class="flex flex-row gap-4">
      <div class="flex-1">
        <Label>Spacing</Label>
        <Input type="number" bind:value={spacing} />
      </div>
      <div class="flex-1">
        <Label>Randomness</Label>
        <Input type="number" bind:value={randomness} />
      </div>
    </div>

    
    <Dialog.Footer>
      <Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
      <Dialog.Close
        class={buttonVariants({ variant: "default" })}
        onclick={async () => {
          editor.generator.position.x = x;
          editor.generator.position.y = y;
          editor.generator.spacing = spacing;
          editor.generator.randomness = randomness;

          await editor.generator.empty(n);
        }}>Generate
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>