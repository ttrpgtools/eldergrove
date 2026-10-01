<script lang="ts">
	import type { Gear } from '$lib/types';
	import type { GameState } from '$state/game.svelte';
	import Icon from '$ui/Icon.svelte';

	let {
		gamestate,
		where,
		icon,
		flip = false
	}: { gamestate: GameState; where: keyof Gear; icon: string; flip?: boolean } = $props();
	const item = $derived(gamestate.character.gear[where]);
</script>

<p class="-mx-1 flex items-center gap-4 px-1 py-2 hover:bg-neutral-800">
	<Icon {icon} class={`size-6 ${flip ? `-scale-x-100` : ''}`} />
	{item?.name ?? '(None)'}
	{#if item != null}
		<button
			type="button"
			class="nes-pointer ml-auto block h-full px-2"
			disabled={gamestate.busy}
			onclick={() => gamestate.unequip(where)}
		>
			<i class="nes-icon close is-small before:text-white"></i>
			<span class="sr-only">Unequip</span>
		</button>
	{/if}
</p>
