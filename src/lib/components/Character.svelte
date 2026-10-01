<script lang="ts">
	import Icon from '$ui/Icon.svelte';
	import GearSlot from './GearSlot.svelte';
	import Inventory from './Inventory.svelte';
	import type { GameState } from '$state/game.svelte';
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { konamiCode } from '$util/konami';
	let { gamestate }: { gamestate: GameState } = $props();
	const character = $derived(gamestate.character);
	let inventoryOpen = $state(false);
	let cheatmode = $state(false);
	let fullHp = $derived(`${character.hp}/${character.maxHp}`);

	let floatChar: { label: string; color: string } | undefined = $state();
	$effect(() => {
		let active = true;
		const unsubscribe = gamestate.events.on('hpChange', async (amt) => {
			if (!active) return;
			floatChar =
				amt === 0
					? { label: 'MISS', color: 'text-black' }
					: amt < 0
						? { label: `${amt}`, color: 'text-red-500' }
						: { label: `+${amt}`, color: 'text-emerald-500' };
			await tick();
			if (active) floatChar = undefined;
		});
		return () => {
			active = false;
			unsubscribe();
		};
	});
</script>

<svelte:window onkeyup={konamiCode(() => (cheatmode = true))} />

<div class="pixel-corners min-w-0 p-4 md:col-span-5 md:min-h-0">
	<div
		class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 md:h-full md:content-start md:overflow-y-auto md:overflow-x-hidden"
	>
		{#snippet stat(icon: string, label: string | number)}
			<p class="flex items-center gap-4">
				<Icon {icon} class="size-6" />
				{label}
			</p>
		{/snippet}
		<div class="flex flex-col gap-3 sm:col-span-2 md:gap-2">
			<p class="nes-text is-primary mb-2 break-words text-base md:text-xl">{character.name}</p>
			{@render stat('heart', fullHp)}
			{@render stat('coins', character.coin)}
			{@render stat('star', character.xp)}
			{@render stat('level', character.level)}
		</div>
		<div class="flex flex-col gap-2">
			<button type="button" class="nes-btn" onclick={() => (inventoryOpen = true)}>Inventory</button
			>
			{#if cheatmode}<button
					type="button"
					class="nes-btn"
					disabled={gamestate.busy || !gamestate.canUseInventory}
					onclick={() =>
						gamestate.runCommand([
							{ action: 'hpHeal', arg: gamestate.character.maxHp - gamestate.character.hp }
						])}>Fill HP</button
				>{/if}
			<button
				type="button"
				class="nes-btn is-error"
				disabled={gamestate.busy}
				onclick={() => gamestate.reset()}>Reset</button
			>
		</div>
		<div class="sm:col-span-3">
			<p class="nes-text is-primary my-2 text-xl md:my-1">Equipped</p>
			<GearSlot {gamestate} where="right" icon="hand" flip />
			<GearSlot {gamestate} where="left" icon="hand" />
			<GearSlot {gamestate} where="head" icon="head" />
			<GearSlot {gamestate} where="torso" icon="torso" />
			<GearSlot {gamestate} where="feet" icon="boot" />
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
