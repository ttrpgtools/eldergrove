<script lang="ts">
	import SaveSlots from './SaveSlots.svelte';
	import Character from '$lib/components/Character.svelte';
	import SceneWindow from '$lib/components/SceneWindow.svelte';
	import Location from '$lib/components/Location.svelte';
	import type { GameState } from '$state/game.svelte';
	import { collectSceneImages, createImagePreloader } from '$lib/scene-images';

	let { gamestate }: { gamestate: GameState } = $props();
	const imagePreloader = createImagePreloader();
	$effect(() => {
		imagePreloader.update(collectSceneImages(gamestate, gamestate.availableChoices));
		return imagePreloader.clear;
	});
	$effect(() => {
		const session = gamestate;
		// Lifecycle cleanup aborts pending work in the view being replaced.
		return () => session.cancelCommand();
	});
</script>

<div class="flex min-h-dvh flex-col md:h-full md:min-h-0">
	{#if gamestate.saveNotice}
		<p role="status" class="mx-2 mt-2 border border-amber-400 bg-black p-2 text-xs text-amber-200">
			{gamestate.saveNotice}
		</p>
	{/if}
	{#if gamestate.commandNotice}
		<p role="status" class="mx-2 mt-2 border border-amber-400 bg-black p-2 text-xs text-amber-200">
			{gamestate.commandNotice}
		</p>
	{/if}
	<main
		aria-busy={gamestate.busy}
		class="grid min-h-0 min-w-0 flex-1 grid-cols-1 items-start gap-3 p-3 md:grid-cols-8 md:grid-rows-[auto_auto_minmax(0,1fr)] md:items-stretch md:gap-2 md:p-2"
	>
		<div class="flex min-h-0 min-w-0 items-center justify-center md:col-span-3">
			<img
				src="/img/eldergrove-banner.webp"
				alt="Eldergrove"
				width="1024"
				height="341"
				class="h-auto w-full max-w-sm md:max-h-full md:max-w-none md:object-contain"
			/>
		</div>
		<Location location={gamestate.location} />
		<SceneWindow {gamestate} />
		<Character {gamestate} />
	</main>
</div>

{#if gamestate.saveDialog}
	{#key gamestate.saveDialog}
		<SaveSlots {gamestate} />
	{/key}
{/if}
