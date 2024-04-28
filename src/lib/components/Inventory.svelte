<script lang="ts">
	import type { Item } from '$lib/types';
	import type { Character } from '$lib/util/character.svelte';
	import { canHeal } from '$lib/util/item';
	import Button from '$ui/button/button.svelte';
	import * as Dialog from '$ui/dialog';
	let { character, open = $bindable() }: { character: Character; open: boolean } = $props();
	let shownItem: Item | undefined = $state();
	const equippable = $derived(
		shownItem &&
			!character.isEquipped(shownItem) &&
			(shownItem.type === 'armor' || shownItem.type === 'weapon')
	);
	const usable = $derived(shownItem ? canHeal(shownItem) : false);
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		shownItem = undefined;
	}}
>
	<Dialog.Content>
		<Dialog.Title>Inventory</Dialog.Title>
		<Dialog.Description>
			<div class="grid grid-cols-2 items-start gap-4">
				<div class="grid grid-cols-[1fr_3rem] items-center gap-x-2 gap-y-4">
					{#each character.equipped as gear (gear.id)}
						<button type="button" class="nes-pointer text-left" onclick={() => (shownItem = gear)}
							>{gear.name}</button
						>
						<p class="text-right"></p>
					{/each}
					{#each character.inventory as entry (entry.item.id)}
						<button
							type="button"
							class="nes-pointer text-left"
							onclick={() => (shownItem = entry.item)}>{entry.item.name}</button
						>
						<p class="text-right">{entry.quantity}</p>
					{/each}
				</div>
				<div class="flex flex-col gap-2">
					{#if shownItem}
						<img src={shownItem?.image} alt={shownItem?.name} class=" aspect-square" />
						{#if shownItem?.desc}
							<p class="mt-4">{shownItem.desc}</p>
						{/if}
						<div class="flex flex-col gap-4">
							{#if equippable}
								<button type="button" class="nes-btn" onclick={() => character.autoEquip(shownItem)}
									>Equip</button
								>
							{/if}
							{#if usable}
								<Button onclick={() => character.useItem(shownItem)}>Use</Button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</Dialog.Description>
	</Dialog.Content>
</Dialog.Root>
