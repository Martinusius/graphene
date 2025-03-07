<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import Button, { buttonVariants } from "$lib/components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Select from "$lib/components/ui/select/index.js"; 

  import Trash from "lucide-svelte/icons/trash";
  import Wrench from "lucide-svelte/icons/wrench";
  import Plus from "lucide-svelte/icons/plus";
  import Separator from "$lib/components/ui/separator/separator.svelte";
  import { typeStyles } from "./Properties";

  let { selection, updateSelected } = $props();

  let ids = $state(1);

  let edgeProperties = $state([
    { id: ids++, name: "DFS_012", type: "uint32" },
    { id: ids++, name: "Weight", type: "float32" },
  ]);

  let rename = $state('');

  let edgeTextProperty = $state("ID");
</script>

<Sidebar.Header class="flex flex-row">
  <div class="text-2xl font-semibold flex-1">Edge</div>
  <Sidebar.Trigger />
</Sidebar.Header>
<div class="p-2 flex flex-col gap-3">
  <div>
    <Label>Vertex U</Label>
    <Input type="number" value={selection.edge.u} disabled />
  </div>

  <div>
    <Label>Vertex V</Label>
    <Input type="number" value={selection.edge.v} disabled />
  </div>

  <div>
    <Label>ID</Label>
    <Input disabled value={selection.edge.id} />
  </div>

  <Separator class="my-4" />

  <div class="text-lg font-semibold">Custom Properties</div>

  {#each edgeProperties as property}
    {@const typeStyle = typeStyles[property.type as keyof typeof typeStyles]}
    <div>
      <Label>{property.name} (<span class={typeStyle.color}>{typeStyle.label}</span>)</Label>
      <Input class="mt-2" value="1486" />
    </div>
  {/each}

  <Dialog.Root>
    <Dialog.Trigger class={['mt-4', buttonVariants({ variant: "outline" })]}>
      <Wrench size="16" /> 
      Configure Properties
    </Dialog.Trigger>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Edge Properties</Dialog.Title>
      </Dialog.Header>
        <div class="p-2 flex flex-col gap-3">
          {#each edgeProperties as property}
            {@const typeStyle = typeStyles[property.type as keyof typeof typeStyles]}

            <div class="flex flex-row gap-3">
              <Dialog.Root onOpenChange={(open) => {
                if(open) rename = property.name;
              }}>
                <Dialog.Trigger class="flex-1">
                  <Input value={property.name} oninput={(event) => event.preventDefault()}/>
                </Dialog.Trigger>
                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title>Rename Property</Dialog.Title>
                  </Dialog.Header>
                  <Input bind:value={rename} />
                  <Dialog.Footer>
                    <Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
                    <Dialog.Close  class={buttonVariants({ variant: "default" })} onclick={(event) => {
                      if(edgeProperties.some(other => other.id !== property.id && other.name === rename)) {
                        event.preventDefault();
                        alert('Property name must be unique');
                        return;
                      }

                      property.name = rename;
                    }}>Save</Dialog.Close>
                  </Dialog.Footer>
                </Dialog.Content>
              </Dialog.Root>
             
              <Select.Root type="single" bind:value={property.type}>
                <Select.Trigger class="w-[140px]">
                  <span class={typeStyle.color}>{typeStyle.label}</span>
                </Select.Trigger>
                <Select.Content>
                  {#each Object.keys(typeStyles) as type}
                    {@const typeStyle = typeStyles[type as keyof typeof typeStyles]}
                    <Select.Item value={type}>
                      <span class={typeStyle.color}>{typeStyle.label}</span>
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              <Button variant="destructive" onclick={() => {
                edgeProperties = edgeProperties.filter(other => other.id !== property.id)
              }}>
                <Trash size="16" />
              </Button>
            </div>
          {/each}

          <Button onclick={() => {
            const takenNames = new Set(edgeProperties.map(property => property.name));
            
            const originalName = 'Property';
            let name = originalName;
            let index = 2;

            while(takenNames.has(name)) {
              name = `${originalName}_${index}`;
              index++;
            }

            edgeProperties.push({ id: ids++, name, type: 'uint32' });
          }}>
            <Plus size="16" />
            New property
          </Button>

          <Label class="mt-4">Display property</Label>
          <Select.Root type="single" bind:value={edgeTextProperty}>
            <Select.Trigger>
              {edgeTextProperty}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="None">
                None
              </Select.Item>
              <Select.Item value="ID">
                ID
              </Select.Item>
              {#each edgeProperties as property}
                <Select.Item value={property.name}>
                  {property.name}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>

        </div>
    </Dialog.Content>
  </Dialog.Root>
</div>
<Sidebar.Footer>
  <Button class="flex w-full" variant="destructive">
    <Trash size="16" /> Delete
  </Button>
</Sidebar.Footer>