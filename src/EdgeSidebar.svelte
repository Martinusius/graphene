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
  import { propertyTypes } from "./Properties";
  import { onDestroy, onMount } from "svelte";

  let { selection, editor } = $props();

  let rename = $state("");
  let openRename = $state(false);

  let propertyValues = $state({} as Record<string, number>);
  let properties = $state({} as Record<string, any>);

  let displayProperty = $state("ID");

  function react() {
    if (!selection.edge) return;

    for (const propertyName of Object.keys(editor.edgeProperties.properties)) {
      propertyValues[propertyName] = editor.edgeProperties.getProperty(propertyName, selection.edge.index);
    }

    properties = editor.edgeProperties.properties;
    displayProperty = editor.edgeDisplayProperty;
  }

  onMount(() => {
    editor.reactive(react);
    react();
  });

  onDestroy(() => {
    editor.unreactive(react);
  });
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

  {#each Object.entries(properties) as [propertyName, property]}
    {@const typeStyle = propertyTypes[property.type as keyof typeof propertyTypes] as any}
    <div>
      <Label>{propertyName} (<span class={typeStyle.color}>{typeStyle.label}</span>)</Label>
      <Input
        class="mt-2"
        type="number"
        placeholder={typeStyle.special[propertyValues[propertyName]]?.label}
        value={typeStyle.special[propertyValues[propertyName]]?.label ? "" : propertyValues[propertyName]}
        oninput={(event) => {
          editor.transaction(() => {
            propertyValues[propertyName] = Number((event.target as HTMLInputElement).value);
            editor.edgeProperties.setProperty(
              propertyName,
              selection.edge.index,
              Number((event.target as HTMLInputElement).value)
            );

            propertyValues[propertyName] = editor.edgeProperties.getProperty(propertyName, selection.edge.index);
          });
        }}
      />
    </div>
  {/each}

  <Dialog.Root>
    <Dialog.Trigger class={["mt-4", buttonVariants({ variant: "outline" })]}>
      <Wrench size="16" />
      Configure Properties
    </Dialog.Trigger>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Edge Properties</Dialog.Title>
      </Dialog.Header>
      <div class="p-2 flex flex-col gap-3">
        {#each Object.entries(properties) as [propertyName, property]}
          {@const typeStyle = propertyTypes[property.type as keyof typeof propertyTypes]}

          <div class="flex flex-row gap-3">
            <Dialog.Root bind:open={openRename}>
              <Input
                value={propertyName}
                onfocus={(event) => {
                  (event.target as HTMLInputElement).blur();
                }}
                onclick={() => {
                  openRename = true;
                  rename = propertyName;
                }}
              />
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Rename Property</Dialog.Title>
                </Dialog.Header>
                <Input bind:value={rename} />
                <Dialog.Footer>
                  <Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
                  <Dialog.Close
                    class={buttonVariants({ variant: "default" })}
                    onclick={() => {
                      editor.transaction(() => {
                        editor.edgeProperties.renameProperty(propertyName, rename);
                        react();
                      });
                    }}>Save</Dialog.Close
                  >
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Root>

            <Select.Root
              type="single"
              bind:value={property.type}
              onValueChange={async (value) => {
                editor.transaction(() => {
                  editor.edgeProperties.setPropertyType(propertyName, value);
                  react();
                });
              }}
            >
              <Select.Trigger class="w-[140px]">
                <span class={typeStyle.color}>{typeStyle.label}</span>
              </Select.Trigger>
              <Select.Content>
                {#each Object.keys(propertyTypes) as type}
                  {@const typeStyle = propertyTypes[type as keyof typeof propertyTypes]}
                  <Select.Item value={type}>
                    <span class={typeStyle.color}>{typeStyle.label}</span>
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
            <Button
              variant="destructive"
              onclick={() => {
                editor.transaction(() => {
                  editor.edgeProperties.deleteProperty(propertyName);
                  react();
                });
              }}
            >
              <Trash size="16" />
            </Button>
          </div>
        {/each}

        <Button
          onclick={() => {
            const takenNames = new Set(Object.keys(editor.edgeProperties.properties));

            const originalName = "Property";
            let name = originalName;
            let index = 2;

            while (takenNames.has(name)) {
              name = `${originalName}_${index}`;
              index++;
            }

            editor.transaction(() => {
              editor.edgeProperties.createProperty(name, "integer");
              react();
            });
          }}
        >
          <Plus size="16" />
          New property
        </Button>

        <Label class="mt-4">Display property</Label>
        <Select.Root
          type="single"
          bind:value={displayProperty}
          onValueChange={async (value) => {
            editor.transaction(() => {
              editor.edgeDisplayProperty = value;
            });
          }}
        >
          <Select.Trigger>
            {displayProperty}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="None">None</Select.Item>
            <Select.Item value="ID">ID</Select.Item>
            {#each Object.keys(editor.edgeProperties.properties) as propertyName}
              <Select.Item value={propertyName}>
                {propertyName}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </Dialog.Content>
  </Dialog.Root>
</div>
<Sidebar.Footer>
  <Button class="flex w-full" variant="destructive" onclick={() => editor.operations.delete()}>
    <Trash size="16" /> Delete
  </Button>
</Sidebar.Footer>
