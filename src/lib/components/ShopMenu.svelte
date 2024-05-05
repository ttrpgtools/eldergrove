<script lang="ts">
	import type { Choice, Item, Scene, ShopItemInstance } from '$lib/types';
	import type { Character } from '$state/character.svelte';
	import { EXIT, createMachine } from '$util/fsm.svelte';
	import type { Messanger } from '$state/messanger.svelte';
	import type { Stack } from '$state/stack.svelte';

	let {
		purse,
		shop,
		character,
		message,
		item,
		ondone
	}: {
		purse: Scene;
		shop: Choice[];
		character: Character;
		message: Messanger;
		item: Stack<Item>;
		ondone: VoidFunction;
	} = $props();
	let current: ShopItemInstance | undefined = $state();
	const shopping = createMachine('buying', {
		buying: {
			inspect(shopitem: ShopItemInstance) {
				item.set(shopitem.item);
				current = shopitem;
				message.set(`It costs ${shopitem.cost} coin, interested?`);
				return 'inspecting';
			},
			noThanks: ondone
		},
		inspecting: {
			yes() {
				if (current && character.coin < current.cost) {
					message.set(`Looks like you don't have enough coin at the moment...`);
				} else if (current) {
					character.coin -= current.cost;
					character.addToInventory(current.item);
					message.set(`A pleasure doing business with you.`);
				}
				return 'buying';
			},
			no() {
				message.set(`Hopefully it'll be here if you reconsider.`);
				return 'buying';
			},
			[EXIT]() {
				current = undefined;
				item.clear();
			}
		}
	});
</script>

{#if shopping.state === 'buying'}
	{#each shop as { label, actions: [first] }}
		<button
			type="button"
			class="nes-btn"
			onclick={() => shopping.inspect(first.arg as ShopItemInstance)}
			>{label} ({(first.arg as ShopItemInstance).cost})</button
		>
	{/each}
	<button type="button" class="nes-btn" onclick={shopping.noThanks}>No Thanks</button>
{:else if shopping.state === 'inspecting'}
	<button type="button" class="nes-btn is-primary" onclick={shopping.yes}>Yes</button>
	<button type="button" class="nes-btn" onclick={shopping.no}>No</button>
{/if}
