<script lang="ts">
	import { ENTER, createMachine } from '$lib/util/fsm.svelte';
	import { Messanger } from '$lib/util/messanger.svelte';
	import type { Action, Item, NpcInstance, ShopItemInstance } from '$lib/types';
	import NavigateMenu from './NavigateMenu.svelte';
	import BattleMenu from './BattleMenu.svelte';
	import { hasHp } from '$lib/util/validate';
	import { invokeAction } from '$lib/util/actions';
	import type { GameState } from '$lib/util/game.svelte';
	import ShopMenu from './ShopMenu.svelte';
	import { npcLabel } from '$lib/util/npc';

	let {
		gamestate
	}: {
		gamestate: GameState;
	} = $props();

	const msg = new Messanger();
	let npc: NpcInstance | undefined = $state();
	let item: Item | undefined = $state();
	const entity = $derived(item ?? npc ?? gamestate.location.current);

	let shop: ShopItemInstance[] = $state([]);

	let currentActions: Action[] | undefined = $state();
	const actions = $derived(currentActions ?? gamestate.location.current.actions);

	const game = createMachine('exploring', {
		exploring: {
			[ENTER]() {
				msg.clear();
				npc = undefined;
			},
			act: async (action: Action) => {
				msg.clear();
				const enc = await invokeAction(action.action, gamestate, action.arg);
				console.log(`act handler, for action (${action.action})`, enc);
				currentActions = enc.actions;
				if (enc.location) {
					gamestate.location.moveTo(enc.location);
				}
				if (enc.msg) {
					msg.set(enc.msg);
				}
				if (enc.flow === 'shop' && enc.shop) {
					shop = enc.shop;
					game.goShopping();
				}
				if (enc.npc && enc.flow === 'fight') {
					npc = enc.npc;
					game.startFight();
				}
			},
			startFight: 'fight',
			goShopping: 'shop'
		},
		fight: {
			fightOver: 'exploring'
		},
		shop: {
			done: 'exploring'
		}
	});
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
		{#if msg.message}
			<p class="">{msg.message}</p>
		{/if}
	{/if}
</div>
<div class="pixel-corners col-span-3 row-span-5 flex flex-col gap-2 p-4">
	{#if game.state === 'exploring'}
		<NavigateMenu {gamestate} {actions} onact={game.act} />
	{:else if game.state === 'fight' && npc}
		<BattleMenu character={gamestate.character} {npc} ondone={game.fightOver} message={msg} />
	{:else if game.state === 'shop'}
		<ShopMenu
			character={gamestate.character}
			purse={gamestate.location.current}
			{shop}
			message={msg}
			ondone={game.done}
			onviewitem={(sel: Item | undefined) => item = sel}
		/>
	{/if}
</div>
