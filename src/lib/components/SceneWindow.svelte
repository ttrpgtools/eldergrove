<script lang="ts">
	import { ENTER, createMachine } from '$lib/util/fsm.svelte';
	import { Messanger } from '$lib/util/messanger.svelte';
	import type { Action, Item, Location, NpcInstance, ShopItemInstance } from '$lib/types';
	import NavigateMenu from './NavigateMenu.svelte';
	import BattleMenu from './BattleMenu.svelte';
	import { hasHp } from '$lib/util/validate';
	import { resolveActions } from '$lib/util/actions';
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

	async function nav(loc: string | Location): Promise<void> {
		console.log(`Exit location ${gamestate.location.current.name}`);
		if (gamestate.location.current.exit) {
			console.log(`Location has exit actions`);
			await game.act(gamestate.location.current.exit);
		}
		await gamestate.location.moveTo(loc);
		console.log(`Enter location ${gamestate.location.current.name}`);
		if (gamestate.location.current.enter) {
			console.log(`Location has enter actions`);
			await game.act(gamestate.location.current.enter);
		}
	}

	// This function assumes you won't be setting a new NPC
	// while one is currently set.
	async function setNpc(next: NpcInstance | undefined) {
		if (next === undefined && npc && npc.exit) {
			await game.act(npc.exit);
		}
		npc = next;
		if (next && next.enter) {
			await game.act(next.enter);
		}
	}

	const game = createMachine('exploring', {
		exploring: {
			[ENTER]() {
				msg.clear();
				setNpc(undefined);
			},
			act: async (action: Action | Action[]) => {
				msg.clear();
				const list = Array.isArray(action) ? action : [action];
				const enc = await resolveActions(list, gamestate);
				console.log(`Actions resolved`, enc);
				currentActions = enc.actions;
				if (enc.location) {
					nav(enc.location);
				}
				if (enc.msg) {
					msg.set(enc.msg);
				}
				if (enc.flow === 'shop' && enc.shop) {
					shop = enc.shop;
					game.goShopping();
				}
				if (enc.npc && enc.flow === 'fight') {
					setNpc(enc.npc);
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
