import type { Choice } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { purchasePrice, sellingPrice } from '$lib/trade';
import { integer } from '$lib/contracts';
export async function shopStart(state: GameState, msg?: string) {
	if (state.mode !== 'exploration' || state.character.hp === 0) return;
	const location = state.location.current;
	if (!location.shop?.length) {
		state.requestDialog({
			message: `This place doesn't seem to have any wares available at the moment.`,
			choices: [{ label: 'OK', actions: [{ action: 'messageClear' }] }]
		});
		return;
	}
	const listings = await Promise.all(
		location.shop.map(async (listing) => ({
			listing,
			item: await state.data.items.get(
				typeof listing.item === 'string' ? listing.item : listing.item.id
			)
		}))
	);
	const refresh = () => {
		if (shop.active) shop.update('shop', menu());
	};
	const menu = (): Choice[] => [
		...listings.flatMap(({ listing, item }): Choice[] => {
			const cost = purchasePrice(item, listing, location, state.rules);
			const offer = sellingPrice(item, listing, location, state.rules);
			const confirm = (selling: boolean) => async (state: GameState) => {
				if (!shop.active) return;
				state.interactions.dialog(
					{
						message: selling
							? `Sell one ${item.name} for ${offer} coins?`
							: `Buy one ${item.name} for ${cost} coins? (${listing.stock} in stock)`,
						choices: [
							{
								label: 'Yes',
								actions: async (state) => {
									if (!shop.active || state.location.current !== location) return;
									integer(listing.stock, 'shop stock');
									integer(state.character.coin, 'coins');
									if (selling) {
										if (offer === undefined || state.character.getInventoryCount(item) < 1) {
											state.message.set('You no longer have that item to sell.');
											return;
										}
										const coins = integer(state.character.coin + offer, 'coins');
										const stock = integer(listing.stock + 1, 'shop stock');
										state.character.removeFromInventory(item, 1);
										state.character.coin = coins;
										listing.stock = stock;
										state.message.set(`Sold ${item.name} for ${offer} coins.`);
									} else {
										if (listing.stock < 1) {
											state.message.set('That item is out of stock.');
											return;
										}
										if (state.character.coin < cost) {
											state.message.set(`You need ${cost} coins for this item.`);
											return;
										}
										await state.character.addToInventory(item, 1);
										state.character.coin -= cost;
										listing.stock -= 1;
										state.message.set('A pleasure doing business with you.');
									}
									refresh();
								}
							},
							{
								label: 'No',
								actions: async (state) => {
									state.message.set('Perhaps another time.');
									refresh();
								}
							}
						]
					},
					'conversation',
					item
				);
			};
			return [
				{
					label: `${item.name} (${cost})`,
					get description() {
						return `${listing.stock} in stock`;
					},
					show: () => listing.stock > 0,
					actions: confirm(false)
				},
				...(offer === undefined
					? []
					: [
							{
								label: `Sell ${item.name} (${offer})`,
								get description() {
									return `${state.character.getInventoryCount(item)} carried`;
								},
								show: () => state.character.getInventoryCount(item) > 0,
								actions: confirm(true)
							}
						])
			];
		}),
		{ label: 'No Thanks', actions: () => shop.close() }
	];
	const shop = state.interactions.open('shop', menu());
	if (msg) state.message.set(msg);
}
export async function shopFinish(state: GameState) {
	if (state.mode === 'shop') state.interactions.closeCurrent();
}
