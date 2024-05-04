<script lang="ts">
	import type { Character } from '$state/character.svelte';
	import { evaluateDiceRoll } from '$util/dice';
	import Icon from '$ui/Icon.svelte';
	import GearSlot from './GearSlot.svelte';
	import Inventory from './Inventory.svelte';
	let { character }: { character: Character } = $props();
	let inventoryOpen = $state(false);
	let fullHp = $derived(`${character.hp}/${character.maxHp}`);
	const ctx = $derived({ str: 5, dex: 3, wil: 3, hp: character.hp, coin: character.coin });
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
				onclick={() => console.log(evaluateDiceRoll(`d(2*d[coin] + 5)`, ctx))}>Map</button
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
</div>
<Inventory {character} bind:open={inventoryOpen} />
