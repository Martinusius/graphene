<script lang="ts">
  import {
    Button,
  } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";

  import Minus from "lucide-svelte/icons/minus";

  import MoveRight from "lucide-svelte/icons/move-right";
  import type { EditorInterface } from "./EditorInterface";

  let { open = $bindable(), editor } = $props() as {
    editor: EditorInterface;
    open: boolean;
  };

</script>
 
<Dialog.Root bind:open={open}>
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title>New Graph</Dialog.Title>
    </Dialog.Header>
    <div class="flex justify-around p-4">
      <Button variant="outline" class="flex flex-col w-32 h-32" onclick={() => {
        open = false;
        editor.createNew('undirected');
      }}>
        <Minus strokeWidth="1" />
        Undirected
      </Button>
       
      <Button variant="outline" class="flex flex-col w-32 h-32" onclick={() => {
        open = false;
        editor.createNew('directed');
      }}>
        <MoveRight  strokeWidth="1" class="w-16 h-16" />
        Directed
      </Button>
    </div>
  </Dialog.Content>
</Dialog.Root>