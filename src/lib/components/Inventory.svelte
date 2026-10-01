<script lang="ts">
	import Artwork from './Artwork.svelte';
	import type { Gear, Item } from '$lib/types';
	import type { GameState } from '$state/game.svelte';
	import Button from '$ui/button/button.svelte';
	import * as Dialog from '$ui/dialog';
	import { isUsable } from '$util/item';
	let { gamestate, open = $bindable() }: { gamestate: GameState; open: boolean } = $props();
	const character = $derived(gamestate.character);
	let shownItem: Item | undefined = $state();
	let shownSlot: keyof Gear | undefined = $state();
	const equippable = $derived(
		shownItem &&
			shownSlot === undefined &&
			character.getInventoryCount(shownItem) > 0 &&
			gamestate.rules.equipment
				.slots(shownItem, character)
				.some((slot) => gamestate.rules.equipment.canEquip(character, shownItem!, slot))
	);
	const usable = $derived(shownItem ? isUsable(shownItem) : false);
</script>

<Dialog.Root
	bind:open
	onOpenChange={() => {
		shownItem = undefined;
		shownSlot = undefined;
	}}
>
	<Dialog.Content>
		<Dialog.Title>Inventory</Dialog.Title>
		<Dialog.Description class="sr-only">Manage your equipment and carried items.</Dialog.Description
		>
		<div class="text-sm text-muted-foreground">
			<div class="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
				<div class="grid grid-cols-[1fr_3rem] items-center gap-x-2 gap-y-4">
					{#each Object.entries(character.gear) as [slot, gear] (slot)}
						{#if gear}
							<button
								type="button"
								class="nes-pointer min-h-11 break-words text-left"
								onclick={() => {
									shownItem = gear;
									shownSlot = slot as keyof Gear;
								}}>{gear.name}</button
							>
							<p class="text-right">{slot}</p>
						{/if}
					{/each}
					{#each character.inventory as entry (entry.item.id)}
						<button
							type="button"
							class="nes-pointer min-h-11 break-words text-left"
							onclick={() => {
								shownItem = entry.item;
								shownSlot = undefined;
							}}>{entry.item.name}</button
						>
						<p class="text-right">{entry.quantity}</p>
					{/each}
				</div>
				<div class="flex flex-col gap-2">
					{#if shownItem}
						<Artwork src={shownItem.image} alt={shownItem.name} />
						{#if shownItem?.desc}
							<p class="mt-4">{shownItem.desc}</p>
						{/if}
						<div class="flex flex-col gap-4">
							{#if equippable}
								<button
									type="button"
									class="nes-btn"
									disabled={gamestate.busy || !gamestate.canUseInventory}
									onclick={() => gamestate.equip(shownItem)}>Equip</button
								>
							{/if}
							{#if usable}
								<Button
									disabled={gamestate.busy || !gamestate.canUseInventory}
									onclick={async () => {
										const result = await gamestate.useItem(shownItem);
										if (result !== 'busy') open = false;
									}}>Use</Button
								>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
