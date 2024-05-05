import { getItem } from '$data/items';
import type { ShopItemInstance } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { resolveList } from '$util/async';

function noEncounter(state: GameState) {
	state.message.set(`This place doesn't seem to have any wares available at the moment.`);
	state.choices.set([{ label: `OK`, actions: [{ action: 'messageClear' }] }]);
}

export async function shopStart(state: GameState, msg?: string) {
	if (!state.location.current.shop) return noEncounter(state);
	const fullshop = await resolveList(state.location.current.shop, 'item', getItem);
	state.choices.push(
		fullshop.map((inv) => ({
			label: inv.item.name,
			actions: [{ action: 'shopInspect', arg: inv }]
		}))
	);
	if (msg) {
		state.message.set(msg);
	}
	state.mode.shop();
}

export async function shopInspect(_: GameState, item: ShopItemInstance) {
	item;
}

export async function shopFinish(state: GameState) {
	state.choices.pop();
	state.mode.doneShopping();
}
