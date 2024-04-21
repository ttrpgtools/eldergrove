<script lang="ts">
  import type { Snippet } from "svelte";
  let { children }: { children: Snippet } = $props();
</script>
<div class="flex items-center justify-center">
  <div class="size-[100vmin] bg-black font-game">
    {@render children()}
  </div>
</div>