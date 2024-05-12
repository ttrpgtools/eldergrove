import { getItem } from '$data/items';
import type { Item } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import type { Action } from '.';

export async function itemPush(state: GameState, item: Item) {
	state.item.push(item);
}

export async function itemPop(state: GameState) {
	state.item.pop();
}

export async function inventoryAdd(state: GameState, item: Item) {
	state.character.addToInventory(item);
}

export async function itemUse(state: GameState, item: Item | undefined) {
	if (!item || state.character.getInventoryCount(item) === 0 || !item.effects) return;
	return (async function* () {
		if (item.effects) yield item.effects;
		if (item.type === 'consumable') {
			state.character.removeFromInventory(item);
		}
	})();
	/* const heal = item.effects.find((x) => x.type === 'healing')!;
  const amt = evaluateDiceRoll(heal.amount);
  this.#heal(amt);
  
  return true; */
}

export async function itemFind(state: GameState, item: Item | string) {
	return (async function* () {
		if (typeof item === 'string') {
			item = await getItem(item);
		}
		yield [
			{ action: 'itemPush', arg: item },
			{
				action: 'choicesPush',
				arg: [
					{
						label: 'Take it!',
						actions: [
							{ action: 'inventoryAdd', arg: item },
							{ action: 'choicesPop' },
							{ action: 'itemPop' }
						]
					}
				]
			}
		] as Action[];
	})();
}
