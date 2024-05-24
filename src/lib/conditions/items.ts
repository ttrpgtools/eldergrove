import type { Item } from '$lib/types';
import type { GameState } from '$state/game.svelte';

export function inventoryContains(state: GameState, item: Item | string) {
	return state.character.getInventoryCount(item) > 0;
}
