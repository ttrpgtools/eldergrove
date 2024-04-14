<script lang="ts">
	import type { Character } from '$lib/util/character.svelte';
	import Icon from '$ui/Icon.svelte';
	import Inventory from './Inventory.svelte';
	let { character }: { character: Character } = $props();
	let inventoryOpen = $state(false);
	let fullHp = $derived(`${character.hp}/${character.maxHp}`);
</script>

<div class="pixel-corners col-span-5 row-span-5 p-4">
	<div class="grid grid-cols-3">
		<div class="col-span-2 flex flex-col gap-3">
			{#snippet stat(icon: string, label: string | number, flip = false)}
				<p class="flex items-center gap-4">
					<Icon {icon} class={`size-6 ${flip ? `-scale-x-100` : ''}`} />
					{label}
				</p>
			{/snippet}
			<p class="nes-text is-primary mb-2 text-xl">Colin</p>
			{@render stat('heart', fullHp)}
			{@render stat('coins', character.gp)}
			{@render stat('star', character.xp)}
			{@render stat('level', character.level)}
			<p class="nes-text is-primary my-2 text-xl">Equipped</p>
			{@render stat('hand', character.gear.right?.name ?? '(None)', true)}
			{@render stat('hand', character.gear.left?.name ?? '(None)')}
			{@render stat('head', character.gear.head?.name ?? '(None)')}
			{@render stat('torso', character.gear.torso?.name ?? '(None)')}
			{@render stat('boot', character.gear.feet?.name ?? '(None)')}
		</div>
		<div class="flex flex-col gap-2">
			<button type="button" class="nes-btn" onclick={() => (inventoryOpen = true)}>Inventory</button
			>
			<button
				type="button"
				class="nes-btn"
				onclick={() => character.equipItem('wooden-shield', 'left')}>Map</button
			>
		</div>
	</div>
</div>
<Inventory {character} bind:open={inventoryOpen} />
