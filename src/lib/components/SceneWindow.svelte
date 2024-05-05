<script lang="ts">
	import type { Choice, Item, ShopItemInstance } from '$lib/types';
	import NavigateMenu from './NavigateMenu.svelte';
	import BattleMenu from './BattleMenu.svelte';
	import { hasHp } from '$util/validate';
	import { resolveActions } from '$lib/actions';
	import type { GameState } from '$state/game.svelte';
	import ShopMenu from './ShopMenu.svelte';
	import { npcLabel } from '$util/npc';

	let {
		gamestate
	}: {
		gamestate: GameState;
	} = $props();

	const entity = $derived(
		gamestate.item.current ?? gamestate.npc.current ?? gamestate.location.current
	);

	async function onact(choice: Choice) {
		gamestate.message.clear();
		await resolveActions(choice.actions, gamestate);
	}
	async function ondone(action: 'shopFinish' | 'encounterFinish') {
		gamestate.message.clear();
		await resolveActions([{ action }], gamestate);
	}
</script>

<div class="pixel-corners--wrapper col-span-3 row-span-3">
	{#if entity}
		<img src={entity.image ?? gamestate.location.current.image} alt={entity.name} />
	{/if}
</div>
<div class="pixel-corners col-span-5 row-span-3 p-4">
	{#if entity}
		{#if hasHp(entity)}
			<p class="mb-3 flex justify-between text-xl">
				<span>{npcLabel(entity)}</span>
				<span>{entity.hp} / {entity.maxHp}</span>
			</p>
		{:else if !gamestate.location.nameAlreadyShown(entity.name)}
			<p class="mb-3 text-xl">{entity.name}</p>
		{/if}
		<p class="mb-6 text-gray-300">{entity.desc}</p>
		{#if gamestate.message.text}
			<p class="">{gamestate.message.text}</p>
		{/if}
	{/if}
</div>
<div class="pixel-corners col-span-3 row-span-5 flex flex-col gap-2 p-4">
	{#if gamestate.mode.state === 'fighting' && gamestate.npc.current}
		<BattleMenu
			character={gamestate.character}
			npc={gamestate.npc.current}
			ondone={() => ondone('encounterFinish')}
			message={gamestate.message}
		/>
	{:else if gamestate.mode.state === 'exploring'}
		<NavigateMenu {gamestate} {onact} />
	{:else if gamestate.mode.state === 'shopping'}
		<ShopMenu
			character={gamestate.character}
			purse={gamestate.location.current}
			shop={gamestate.choices.currentOrDefault([])}
			message={gamestate.message}
			item={gamestate.item}
			ondone={() => ondone('shopFinish')}
		/>
	{/if}
</div>
