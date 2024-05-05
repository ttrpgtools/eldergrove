<script lang="ts">
	import { checkCondition } from '$lib/conditions';
	import type { Choice } from '$lib/types';
	import type { GameState } from '$state/game.svelte';

	let {
		onact,
		gamestate
	}: {
		onact: (clicked: Choice) => void;
		gamestate: GameState;
	} = $props();

	const available = $derived(
		gamestate.choices
			.currentOrDefault([])
			.filter((choice) => !choice.show || checkCondition(choice.show, gamestate))
	);
</script>

{#each available as option}
	<button type="button" class="nes-btn" onclick={() => onact(option)}>{option.label}</button>
{/each}
