<script lang="ts">
	import { ENTER, createMachine } from '$lib/util/fsm.svelte';
	import { Messanger } from '$lib/util/messanger.svelte';
	import type { Action, NpcInstance } from '$lib/types';
	import NavigateMenu from './NavigateMenu.svelte';
	import BattleMenu from './BattleMenu.svelte';
	import { hasHp } from '$lib/util/validate';
	import { invokeAction } from '$lib/util/actions';
	import type { GameState } from '$lib/util/game.svelte';

	let {
		gamestate
	}: {
		gamestate: GameState;
	} = $props();

	const msg = new Messanger();
	let npc: NpcInstance | undefined = $state();
	const entity = $derived(npc ?? gamestate.location.current);

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
				if (enc.npc) {
					npc = enc.npc;
					game.startFight();
				}
			},
			startFight: 'fight'
		},
		fight: {
			fightOver: 'exploring'
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
				<span>{entity.name}</span>
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
	{/if}
</div>
