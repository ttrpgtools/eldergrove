<script lang="ts">
	import type { Choice } from '$lib/types';
	import NavigateMenu from './NavigateMenu.svelte';
	import { hasHp } from '$util/validate';
	import type { GameState } from '$state/game.svelte';
	import { npcLabel } from '$util/npc';

	let {
		gamestate
	}: {
		gamestate: GameState;
	} = $props();

	const entity = $derived(
		gamestate.item.current ?? gamestate.npc.current ?? gamestate.location.current
	);

	const crossOut = $derived(entity && hasHp(entity) && entity.hp === 0);

	async function onact(choice: Choice) {
		console.log(`Clicked menu button: ${choice.label}`);
		gamestate.message.clear();
		await gamestate.resolveActions(choice.actions);
	}
</script>

<div class="pixel-corners--wrapper col-span-3 row-span-3">
	{#if entity}
		{#if crossOut}
			<svg class="absolute z-10 size-full opacity-50">
				<line x1="0" y1="100%" x2="100%" y2="0" class=" stroke-red-500 stroke-[16px]" />
				<line x1="0" y1="0" x2="100%" y2="100%" class=" stroke-red-500 stroke-[16px]" />
			</svg>
		{/if}
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
		{#if entity.desc}<p class="mb-6 text-gray-300">{entity.desc}</p>{/if}
		{#if gamestate.message.text}
			<p class="">{gamestate.message.text}</p>
		{/if}
	{/if}
</div>
<div class="pixel-corners col-span-3 row-span-5 flex flex-col gap-2 p-4">
	<NavigateMenu {gamestate} {onact} />
</div>
