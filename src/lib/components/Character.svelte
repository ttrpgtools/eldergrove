<script lang="ts">
	import Icon from '$ui/Icon.svelte';
	import GearSlot from './GearSlot.svelte';
	import Inventory from './Inventory.svelte';
	import type { GameState } from '$state/game.svelte';
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { hpHeal } from '$lib/actions/hp';
	let { gamestate }: { gamestate: GameState } = $props();
	const character = $derived(gamestate.character);
	let inventoryOpen = $state(false);
	let fullHp = $derived(`${character.hp}/${character.maxHp}`);

	let floatChar: { label: string; color: string } | undefined = $state();
	gamestate.events.on('hpChange', async (amt) => {
		floatChar =
			amt === 0
				? { label: 'MISS', color: 'text-black' }
				: amt < 0
					? { label: `${amt}`, color: 'text-red-500' }
					: { label: `+${amt}`, color: 'text-emerald-500' };
		await tick();
		floatChar = undefined;
	});
</script>

<div class="pixel-corners col-span-5 row-span-5 p-4">
	<div class="grid grid-cols-3">
		{#snippet stat(icon: string, label: string | number)}
			<p class="flex items-center gap-4">
				<Icon {icon} class="size-6" />
				{label}
			</p>
		{/snippet}
		<div class="col-span-2 flex flex-col gap-3">
			<p class="nes-text is-primary mb-2 text-xl">{character.name}</p>
			{@render stat('heart', fullHp)}
			{@render stat('coins', character.coin)}
			{@render stat('star', character.xp)}
			{@render stat('level', character.level)}
		</div>
		<div class="flex flex-col gap-2">
			<button type="button" class="nes-btn" onclick={() => (inventoryOpen = true)}>Inventory</button
			>
			<button
				type="button"
				class="nes-btn"
				onclick={() => hpHeal(gamestate, gamestate.character.maxHp - gamestate.character.hp)}
				>Fill</button
			>
			<button type="button" class="nes-btn is-error" onclick={() => gamestate.reset()}>Reset</button
			>
		</div>
		<div class="col-span-3">
			<p class="nes-text is-primary my-2 text-xl">Equipped</p>
			<GearSlot {character} where="right" icon="hand" flip />
			<GearSlot {character} where="left" icon="hand" />
			<GearSlot {character} where="head" icon="head" />
			<GearSlot {character} where="torso" icon="torso" />
			<GearSlot {character} where="feet" icon="boot" />
		</div>
	</div>
	{#if floatChar}
		<div
			class="floater absolute inset-0 z-[100] flex items-center justify-center text-5xl {floatChar.color}"
			out:fly={{ y: -50, duration: 1500, easing: cubicInOut }}
		>
			{floatChar.label}
		</div>
	{/if}
</div>
<Inventory {gamestate} bind:open={inventoryOpen} />

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
