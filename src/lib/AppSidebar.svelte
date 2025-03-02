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

  import Badge from "./components/ui/badge/badge.svelte";

  import Trash from "lucide-svelte/icons/trash";
  import Wrench from "lucide-svelte/icons/wrench";

  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import Separator from "./components/ui/separator/separator.svelte";

  let open = $state(true);

  let { selection, updateSelected } = $props();
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
      {:else if selection.edge}
        <Sidebar.Header class="flex flex-row">
          <div class="text-2xl font-semibold flex-1">Edge</div>
          <Sidebar.Trigger />
        </Sidebar.Header>
        <div class="p-2 flex flex-col gap-3">
          <div>
            <Label>Vertex U</Label>
            <Input type="number" value={selection.edge.u} />
          </div>

          <div>
            <Label>Vertex V</Label>
            <Input type="number" value={selection.edge.v} />
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
