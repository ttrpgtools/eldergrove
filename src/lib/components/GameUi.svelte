<script lang="ts">
	import Character from '$lib/components/Character.svelte';
	import SceneWindow from '$lib/components/SceneWindow.svelte';
	import Location from '$lib/components/Location.svelte';
	import type { GameState } from '$state/game.svelte';

	let { gamestate }: { gamestate: GameState } = $props();
	$effect(() => {
		const session = gamestate;
		// Lifecycle cleanup aborts pending work in the view being replaced.
		return () => session.cancelCommand();
	});
</script>

<div class="flex h-full flex-col">
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
	<main aria-busy={gamestate.busy} class="grid min-h-0 flex-1 grid-cols-8 grid-rows-8 gap-2 p-2">
		<div class=" col-span-3 flex items-center justify-center">
			<img src="/img/eldergrove-banner.webp" alt="Eldergrove" />
		</div>
		<Location location={gamestate.location} />
		<SceneWindow {gamestate} />
		<Character {gamestate} />
	</main>
</div>
