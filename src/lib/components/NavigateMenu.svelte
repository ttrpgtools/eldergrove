<script lang="ts">
	import type { Action } from '$lib/types';
	import { checkCondition } from '$lib/util/conditions';
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

	function shouldShow(action: Action) {
		if (action.show == null) return true;
		const show =
			typeof action.show === 'string' ? { condition: action.show, arg: undefined } : action.show;
		return checkCondition(show.condition, gamestate, show.arg);
	}
	const available = $derived(actions.filter(shouldShow));
</script>

{#each available as option}
	<button type="button" class="nes-btn" onclick={() => onact(option)}>{option.label}</button>
{/each}
