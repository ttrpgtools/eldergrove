<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="flex items-center justify-center">
	<div
		class="min-h-dvh w-full max-w-6xl bg-black font-game md:size-[100vmin] md:min-h-0 md:max-w-none"
	>
		{@render children()}
	</div>
</div>
