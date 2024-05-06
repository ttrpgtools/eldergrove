import type { Item } from '$lib/types';
import type { GameState } from '$state/game.svelte';

export async function itemPush(state: GameState, item: Item) {
	state.item.push(item);
}

export async function itemPop(state: GameState) {
	state.item.pop();
}

export async function inventoryAdd(state: GameState, item: Item) {
	state.character.addToInventory(item);
}
