<script lang="ts">
	import type { Choice } from '$lib/types';
	import type { GameState } from '$state/game.svelte';

	let {
		onact,
		gamestate
	}: {
		onact: (clicked: Choice) => void;
		gamestate: GameState;
	} = $props();

	const available = $derived(gamestate.availableChoices);
</script>

{#each available as option (option)}
	<button type="button" class="nes-btn" disabled={gamestate.busy} onclick={() => onact(option)}
		>{option.label}</button
	>
{/each}
