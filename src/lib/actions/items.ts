import { encounterTurn } from '$lib/games/encounter';
import type { Item } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import type { Action } from '.';

export async function itemPush(state: GameState, item: Item) {
	state.item.push(item);
}

export async function itemPop(state: GameState) {
	state.item.pop();
}

export async function inventoryAdd(state: GameState, item: Item | string) {
	await state.character.addToInventory(item);
}

export async function inventoryRemove(state: GameState, item: Item | string) {
	state.character.removeFromInventory(item);
}

export async function itemUse(state: GameState, item: Item | undefined) {
	if (item) item = await state.data.items.get(item.id);
	if (
		!item ||
		!state.canUseInventory ||
		(state.mode === 'combat' && item.combatUse === 'forbidden') ||
		state.character.getInventoryCount(item) === 0 ||
		!item.effects
	)
		return;
	// Reserve the consumable before effects. Interrupted/failed effects cannot reuse it.
	if (item.type === 'consumable') state.character.removeFromInventory(item);
	await encounterTurn(state, item.effects, item.combatUse !== 'free');
}

export async function itemFind(
	state: GameState,
	{ item, takeActions }: { item: Item | string; takeActions: Action[] }
) {
	if (typeof item === 'string') {
		item = await state.data.items.get(item);
	}
	state.interactions.dialog(
		{
			presentation: { title: item.name, description: item.desc, image: item.image },
			choices: [
				{
					label: 'Take it!',
					actions: async (state) => {
						await inventoryAdd(state, item);
						await state.resolveActions(takeActions);
					}
				},
				{ label: 'No Thanks...', actions: [] }
			]
		},
		'conversation',
		item
	);
}
