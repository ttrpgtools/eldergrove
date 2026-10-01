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
	<button
		type="button"
		class="nes-btn min-h-11 break-words text-left"
		disabled={gamestate.busy}
		onclick={() => onact(option)}
		>{option.label}{#if option.description}<span class="mt-2 block text-xs opacity-75"
				>{option.description}</span
			>{/if}</button
	>
{/each}
