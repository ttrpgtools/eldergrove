<script lang="ts">
	import type { LocationManager } from '$lib/util/location.svelte';

	let {
		location
	}: {
		location: LocationManager;
	} = $props();
	const bgUrl = $derived(location.biome ? `url(${location.biome.image})` : ``);
</script>

<div
	class="pixel-corners col-span-5 bg-neutral-400 bg-cover bg-center p-4 bg-blend-color-burn"
	style:background-image={bgUrl}
>
	<p class="mb-3 text-xl">{location.primary}</p>
	<p>{location.secondary}</p>
</div>
