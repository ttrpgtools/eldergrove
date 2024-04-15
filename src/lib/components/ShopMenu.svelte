<script lang="ts" generics="TMachine">
	import type { Item, Scene, ShopItemInstance } from '$lib/types';
	import type { Character } from '$lib/util/character.svelte';
	import { ENTER, EXIT, createMachine } from '$lib/util/fsm.svelte';
	import type { Messanger } from '$lib/util/messanger.svelte';

	let {
		purse,
		shop,
		character,
		message,
		ondone,
		onviewitem
	}: {
		purse: Scene;
		shop: ShopItemInstance[];
		character: Character;
		message: Messanger;
		ondone: VoidFunction;
		onviewitem: (item: Item | undefined) => void;
	} = $props();
	let current: ShopItemInstance | undefined = $state();
	const shopping = createMachine('buying', {
		buying: {
			inspect(item: ShopItemInstance) {
				onviewitem(item.item);
				current = item;
				message.set(`It costs ${item.cost} coin, interested?`);
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
				onviewitem(undefined);
			}
		}
	});
</script>

{#if shopping.state === 'buying'}
	{#each shop as item}
		<button type="button" class="nes-btn" onclick={() => shopping.inspect(item)}
			>{item.item.name} ({item.cost})</button
		>
	{/each}
	<button type="button" class="nes-btn" onclick={shopping.noThanks}>No Thanks</button>
{:else if shopping.state === 'inspecting'}
	<button type="button" class="nes-btn is-primary" onclick={shopping.yes}>Yes</button>
	<button type="button" class="nes-btn" onclick={shopping.no}>No</button>
{/if}
