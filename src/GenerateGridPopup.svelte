<script lang="ts">
  import { buttonVariants } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import Separator from "$lib/components/ui/separator/separator.svelte";
  import * as Select from "$lib/components/ui/select/index.js";


  let width = $state(10);
  let height = $state(10);

  let edges: 'none' | 'horizontal' | 'vertical' | 'straight' | 'straight-and-diagonal' = $state('straight');

  const edgesOptions = {
    none: { label: "None" },
    horizontal: { label: "Horizontal" },
    vertical: { label: "Vertical" },
    straight: { label: "Straight" },
    "straight-and-diagonal": { label: "Straight and Diagonal" },
  };

  let x = $state(0);
  let y = $state(0);

  let spacing = $state(20);
  let randomness = $state(0);

  let { open = $bindable(), editor } = $props();
</script>

<Dialog.Root bind:open={open}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Generate Grid Graph</Dialog.Title>
    </Dialog.Header>

    <div class="flex flex-row gap-4">
      <div class="flex-1">
        <Label>Rows</Label>
        <Input type="number" bind:value={height} />
      </div>
      <div class="flex-1">
        <Label>Columns</Label>
        <Input type="number" bind:value={width} />
      </div>
    </div>
    
    <Select.Root type="single" bind:value={edges}>
      <Select.Trigger class="w-[140px]">
        {@const edgesOption = edgesOptions[edges as keyof typeof edgesOptions]}
        <span>{edgesOption.label}</span>
      </Select.Trigger>
      <Select.Content>
        {#each Object.keys(edgesOptions) as edges}
          {@const edgesOption = edgesOptions[edges as keyof typeof edgesOptions]}
          <Select.Item value={edges}>
            <span>{edgesOption.label}</span>
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>

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

          await editor.generator.grid(width, height, edges);
        }}>Generate
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>