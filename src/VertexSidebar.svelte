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
  import type { EditorInterface } from "./EditorInterface";
  import { onDestroy, onMount } from "svelte";

  let { selection, updateSelected, editor } = $props() as {
    selection: any;
    updateSelected: any;
    editor: EditorInterface;
  };

  let rename = $state("");

  let propertyValues = $state({} as Record<string, number>);
  let properties = $state({} as Record<string, any>);

  let displayProperty = $state("ID");

  function react() {
    if (!selection.vertex) return;

    for (const propertyName of Object.keys(editor.vertexProperties.properties)) {
      propertyValues[propertyName] = editor.vertexProperties.getProperty(propertyName, selection.vertex.index);
    }

    properties = editor.vertexProperties.properties;
    displayProperty = editor.vertexDisplayProperty;
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
  <div class="text-2xl font-semibold flex-1">Vertex</div>
  <Sidebar.Trigger />
</Sidebar.Header>
<div class="p-2 flex flex-col gap-3">
  <div>
    <Label>Position X</Label>
    <Input
      type="number"
      bind:value={selection.vertex.x}
      onchange={() => updateSelected(selection)}
      oninput={() => updateSelected(selection)}
    />
  </div>

  <div>
    <Label>Position Y</Label>
    <Input
      type="number"
      bind:value={selection.vertex.y}
      onchange={() => updateSelected(selection)}
      oninput={() => updateSelected(selection)}
    />
  </div>

  <div>
    <Label>ID</Label>
    <Input disabled value={selection.vertex.id} />
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
        placeholder={typeStyle.special[propertyValues[propertyName]]}
        value={typeStyle.special[propertyValues[propertyName]] ? "" : propertyValues[propertyName]}
        oninput={(event) => {
          editor.transaction(() => {
            editor.vertexProperties.setProperty(
              propertyName,
              selection.vertex.index,
              Number((event.target as HTMLInputElement).value)
            );

            propertyValues[propertyName] = editor.vertexProperties.getProperty(propertyName, selection.vertex.index);
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
        <Dialog.Title>Vertex Properties</Dialog.Title>
      </Dialog.Header>
      <div class="p-2 flex flex-col gap-3">
        {#each Object.entries(properties) as [propertyName, property]}
          {@const typeStyle = propertyTypes[property.type as keyof typeof propertyTypes]}

          <div class="flex flex-row gap-3">
            <Dialog.Root
              onOpenChange={(open) => {
                if (open) rename = propertyName;
              }}
            >
              <Dialog.Trigger class="flex-1">
                <Input value={propertyName} oninput={(event) => event.preventDefault()} />
              </Dialog.Trigger>
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
                        editor.vertexProperties.renameProperty(propertyName, rename);
                        react();
                      });
                    }}
                  >
                    Save
                  </Dialog.Close>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Root>

            <Select.Root
              type="single"
              bind:value={property.type}
              onValueChange={(value) => {
                editor.transaction(() => {
                  editor.vertexProperties.setPropertyType(propertyName, value as keyof typeof propertyTypes);
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
                  editor.vertexProperties.deleteProperty(propertyName);
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
            const takenNames = new Set(Object.keys(editor.vertexProperties.properties));

            const originalName = "Property";
            let name = originalName;
            let index = 2;

            while (takenNames.has(name)) {
              name = `${originalName}_${index}`;
              index++;
            }

            editor.transaction(() => {
              editor.vertexProperties.createProperty(name, "integer");
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
              editor.vertexDisplayProperty = value;
            });
          }}
        >
          <Select.Trigger>
            {displayProperty}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="None">None</Select.Item>
            <Select.Item value="ID">ID</Select.Item>
            {#each Object.keys(editor.vertexProperties.properties) as propertyName}
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
