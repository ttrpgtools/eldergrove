<script lang="ts">
	import Artwork from './Artwork.svelte';
	import type { Choice } from '$lib/types';
	import NavigateMenu from './NavigateMenu.svelte';
	import { hasHp } from '$util/validate';
	import type { GameState } from '$state/game.svelte';
	import { npcLabel } from '$util/npc';
	import { fly } from 'svelte/transition';
	import { tick } from 'svelte';
	import { cubicInOut } from 'svelte/easing';

	let {
		gamestate
	}: {
		gamestate: GameState;
	} = $props();

	const entity = $derived(gamestate.scene);

	const crossOut = $derived(entity && hasHp(entity) && entity.hp === 0);

	const showDesc = $derived(
		entity && entity.desc && !(gamestate.message.text && gamestate.message.exclusive)
	);

	async function onact(choice: Choice) {
		await gamestate.choose(choice);
	}

	let floatNpc: { label: string; color: string } | undefined = $state();
	$effect(() => {
		let active = true;
		const unsubscribe = gamestate.events.on('npcHpChange', async (amt) => {
			if (!active) return;
			floatNpc =
				amt === 0
					? { label: 'MISS', color: 'text-black' }
					: amt < 0
						? { label: `${amt}`, color: 'text-red-500' }
						: { label: `+${amt}`, color: 'text-emerald-500' };
			await tick();
			if (active) floatNpc = undefined;
		});
		return () => {
			active = false;
			unsubscribe();
		};
	});
</script>

<div
	class="pixel-corners--wrapper aspect-square w-full min-w-0 md:col-span-3 md:h-auto md:min-h-0 md:self-start"
>
	{#if entity}
		{#if crossOut}
			<svg class="absolute z-10 size-full opacity-50">
				<line x1="0" y1="100%" x2="100%" y2="0" class=" stroke-red-500 stroke-[16px]" />
				<line x1="0" y1="0" x2="100%" y2="100%" class=" stroke-red-500 stroke-[16px]" />
			</svg>
		{/if}
		{#if floatNpc}
			<div
				class="floater absolute z-20 flex size-full items-center justify-center text-5xl {floatNpc.color}"
				out:fly={{ y: -50, duration: 1500, easing: cubicInOut }}
			>
				{floatNpc.label}
			</div>
		{/if}
		<Artwork
			src={entity.image ?? gamestate.location.current.image}
			alt={entity.name}
			class="absolute inset-0 aspect-auto h-full"
			fit="cover"
			eager
		/>
	{/if}
</div>
<div class="pixel-corners min-w-0 break-words p-4 md:col-span-5 md:min-h-0">
	<div class="md:h-full md:overflow-y-auto md:overflow-x-hidden">
		{#if entity}
			{#if hasHp(entity)}
				<p class="mb-3 flex flex-wrap justify-between gap-2 text-base md:text-xl">
					<span>{npcLabel(entity)}</span>
					<span>{entity.hp} / {entity.maxHp}</span>
				</p>
			{:else if !gamestate.location.nameAlreadyShown(entity.name)}
				<p class="mb-3 text-xl">{entity.name}</p>
			{/if}
			{#if showDesc}<p class="mb-6 text-gray-300">{entity.desc}</p>{/if}
			{#if gamestate.message.text}
				<p class="">{gamestate.message.text}</p>
			{/if}
		{/if}
	</div>
</div>
<div class="pixel-corners min-w-0 p-4 md:col-span-3 md:min-h-0">
	<div class="flex flex-col gap-3 md:h-full md:overflow-y-auto md:overflow-x-hidden">
		<NavigateMenu {gamestate} {onact} />
	</div>
</div>

<style>
	.floater {
		text-shadow:
			3px 3px 0 #fff,
			-3px -3px 0 #fff,
			3px -3px 0 #fff,
			-3px 3px 0 #fff,
			3px 3px 0 #fff;
	}
</style>
