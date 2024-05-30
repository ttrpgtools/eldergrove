<script lang="ts">
	import Character from '$lib/components/Character.svelte';
	import SceneWindow from '$lib/components/SceneWindow.svelte';
	import Location from '$lib/components/Location.svelte';
	import type { GameState } from '$state/game.svelte';

	let { gamestate }: { gamestate: GameState } = $props();
</script>

<main class="grid h-full grid-cols-8 grid-rows-8 gap-2 p-2">
	<div class=" col-span-3 flex items-center justify-center">
		<img src="/img/eldergrove-banner.webp" alt="Eldergrove" />
	</div>
	<Location location={gamestate.location} />
	<SceneWindow {gamestate} />
	<Character {gamestate} />
</main>
