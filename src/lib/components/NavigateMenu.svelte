<script lang="ts">
	import type { Action } from '$lib/types';
	import { isActionValid } from '$lib/util/actions';
	import type { GameState } from '$lib/util/game.svelte';

	let {
		actions,
		onact,
		gamestate
	}: {
		actions: Action[];
		onact: (clicked: Action) => void;
		gamestate: GameState;
	} = $props();

	const available = $derived(actions.filter((act) => isActionValid(act, gamestate)));
</script>

{#each available as option}
	<button type="button" class="nes-btn" onclick={() => onact(option)}>{option.label}</button>
{/each}
