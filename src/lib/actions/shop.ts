import type { Choice } from '$lib/types';
import type { GameState } from '$state/game.svelte';
export async function shopStart(state: GameState, msg?: string) {
	if (state.mode !== 'exploration' || state.character.hp === 0) return;
	if (!state.location.current.shop?.length) {
		state.requestDialog({
			message: `This place doesn't seem to have any wares available at the moment.`,
			choices: [{ label: 'OK', actions: [{ action: 'messageClear' }] }]
		});
		return;
	}
	const listings = await Promise.all(
		state.location.current.shop.map(async (listing) => ({
			item: await state.data.items.get(
				typeof listing.item === 'string' ? listing.item : listing.item.id
			),
			cost: listing.cost
		}))
	);
	const choices: Choice[] = listings.map((listing) => ({
		label: `${listing.item.name} (${listing.cost})`,
		actions: async (state) => {
			if (!shop.active) return;
			state.interactions.dialog(
				{
					message: `It costs ${listing.cost} coin, interested?`,
					choices: [
						{
							label: 'Yes',
							actions: async (state) => {
								if (state.character.coin < listing.cost) {
									state.message.set(`Looks like you don't have enough coin at the moment...`);
									return;
								}
								await state.character.addToInventory(listing.item);
								state.character.coin -= listing.cost;
								state.message.set('A pleasure doing business with you.');
							}
						},
						{
							label: 'No',
							actions: async (state) => {
								state.message.set(`Hopefully it'll be here if you reconsider.`);
							}
						}
					]
				},
				'conversation',
				listing.item
			);
		}
	}));
	choices.push({ label: 'No Thanks', actions: () => shop.close() });
	const shop = state.interactions.open('shop', choices);
	if (msg) state.message.set(msg);
}
export async function shopFinish(state: GameState) {
	if (state.mode === 'shop') state.interactions.closeCurrent();
}
