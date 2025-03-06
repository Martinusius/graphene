<script lang="ts">
  import Calendar from "lucide-svelte/icons/calendar";
  import House from "lucide-svelte/icons/house";
  import Inbox from "lucide-svelte/icons/inbox";
  import Search from "lucide-svelte/icons/search";
  import Settings from "lucide-svelte/icons/settings";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import Input from "./components/ui/input/input.svelte";
  import Label from "./components/ui/label/label.svelte";
  import Button, { buttonVariants } from "./components/ui/button/button.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Select from "$lib/components/ui/select/index.js";


  import Trash from "lucide-svelte/icons/trash";
  import Wrench from "lucide-svelte/icons/wrench";
  import Plus from "lucide-svelte/icons/plus";
  import TextCursorInput from "lucide-svelte/icons/text-cursor-input";

  import Separator from "./components/ui/separator/separator.svelte";

  let open = $state(true);

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

  let ids = $state(1);

  let vertexProperties = $state([
    { id: ids++, name: "DFS_012", type: "uint32" },
    { id: ids++, name: "Weight", type: "float32" },
  ]);

  let rename = $state('');

  let vertexTextProperty = $state("ID");
</script>

<Sidebar.Root side="right">
  <!-- <Sidebar.Trigger class="absolute -right-10" /> -->

  <!-- <Sidebar.Trigger class={buttonVariants({ variant: "outline" })}>Open</Sheet.Trigger> -->
  <Sidebar.Content class="p-4">
    {#if selection && (selection.vertexCount || selection.edgeCount)}
      {#if selection.vertex}
        <Sidebar.Header class="flex flex-row">
          <div class="text-2xl font-semibold flex-1">Vertex</div>
          <Sidebar.Trigger />
        </Sidebar.Header>
        <div class="p-2 flex flex-col gap-3">
          <div>
            <Label>Position X</Label>
            <Input type="number" bind:value={selection.vertex.x} oninput={() => updateSelected(selection)} />
          </div>

          <div>
            <Label>Position Y</Label>
            <Input type="number" bind:value={selection.vertex.y} oninput={() => updateSelected(selection)} />
          </div>

          <div>
            <Label>ID</Label>
            <Input disabled value={selection.vertex.id} />
          </div>

          <Separator class="my-4" />

          <div class="text-lg font-semibold">Custom Properties</div>

          {#each vertexProperties as property}
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
                <Dialog.Title>Vertex Properties</Dialog.Title>
              </Dialog.Header>
                <div class="p-2 flex flex-col gap-3">
                  {#each vertexProperties as property}
                    {@const typeStyle = typeStyles[property.type as keyof typeof typeStyles]}

                    <div class="flex flex-row gap-3">
                      <Dialog.Root onOpenChange={(open) => {
                        if(open) rename = property.name;
                      }}>
                        <Dialog.Trigger>
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
                              if(vertexProperties.some(other => other.id !== property.id && other.name === rename)) {
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
                        <Select.Trigger class="w-[180px]">
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
                        vertexProperties = vertexProperties.filter(other => other.id !== property.id)
                      }}>
                        <Trash size="16" />
                      </Button>
                    </div>
                  {/each}

                  <Button onclick={() => {
                    const takenNames = new Set(vertexProperties.map(property => property.name));
                    
                    const originalName = 'Property';
                    let name = originalName;
                    let index = 2;

                    while(takenNames.has(name)) {
                      name = `${originalName}_${index}`;
                      index++;
                    }

                    vertexProperties.push({ id: ids++, name, type: 'uint32' });
                  }}>
                    <Plus size="16" />
                    New property
                  </Button>

                  <Label class="mt-4">Display property</Label>
                  <Select.Root type="single" bind:value={vertexTextProperty}>
                    <Select.Trigger>
                      {vertexTextProperty}
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="None">
                        None
                      </Select.Item>
                      <Select.Item value="ID">
                        ID
                      </Select.Item>
                      {#each vertexProperties as property}
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
      {:else if selection.edge}
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

          <div>
            <Label>DFS_01 (<span class="text-indigo-700">Uint32</span>)</Label>
            <Input class="mt-2" value="1486" />
          </div>

          <div>
            <Label>Weight (<span class="text-green-700">Float32</span>)</Label>
            <Input class="mt-2" value="1486" />
          </div>

          <Button class="flex w-full mt-4" variant="outline">
            <Wrench size="16" /> Configure Properties
          </Button>
        </div>
        <Sidebar.Footer>
          <Button class="flex w-full" variant="destructive">
            <Trash size="16" /> Delete
          </Button>
        </Sidebar.Footer>
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
<!-- 
<Sidebar.Root side="right">
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>Vertex</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu class="px-2">
          <Sidebar.MenuItem>
            <Label>Position X</Label>
            <Input />
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Label>Position Y</Label>
            <Input />
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Label>ID</Label>
            <Input disabled value="1486" />
          </Sidebar.MenuItem>

          <Sidebar.Separator class="my-4" />

          <Sidebar.MenuItem>
            <Button class="flex w-full" variant="destructive">
              <Trash size="16" /> Delete
            </Button>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupLabel>Edge</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu class="px-2">
          <Sidebar.MenuItem>
            <Label>Vertex U</Label>
            <Button class="flex w-full" variant="outline">#1005</Button>
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Label>Vertex V</Label>
            <Button class="flex w-full" variant="outline">#1006</Button>
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Label>ID</Label>
            <Input disabled value="512" />
          </Sidebar.MenuItem>

          <Sidebar.Separator class="my-4" />

          <Sidebar.MenuItem>
            <Button class="flex w-full" variant="destructive">
              <Trash size="16" /> Delete
            </Button>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupLabel>Selection</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu class="px-2">
          <Sidebar.MenuItem>
            <Label>Vertex U</Label>
            <Button class="flex w-full" variant="outline">#1005</Button>
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Label>Vertex V</Label>
            <Button class="flex w-full" variant="outline">#1006</Button>
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Label>ID</Label>
            <Input disabled value="512" />
          </Sidebar.MenuItem>

          <Sidebar.Separator class="my-4" />

          <Sidebar.MenuItem>
            <Button class="flex w-full" variant="destructive">
              <Trash size="16" /> Delete
            </Button>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</Sidebar.Root> -->
