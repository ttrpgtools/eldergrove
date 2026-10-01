<script lang="ts">
	import type { LocationManager } from '$state/location.svelte';

	let {
		location
	}: {
		location: LocationManager;
	} = $props();
	const bgUrl = $derived(location.biome ? `url(${location.biome.image})` : ``);
</script>

<div
	class="pixel-corners min-w-0 bg-neutral-400 bg-cover bg-center p-4 bg-blend-color-burn md:col-span-5 md:min-h-0"
	style:background-image={bgUrl}
>
	<p class="mb-3 break-words text-base md:text-xl">{location.primary}</p>
	<p>{location.secondary}</p>
</div>
