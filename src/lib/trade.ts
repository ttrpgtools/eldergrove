import type { Item, Location, ShopItem } from './types';
import type { GameRules } from './rules';
import { integer } from './contracts';

export function purchasePrice(item: Item, listing: ShopItem, location: Location, rules: GameRules) {
	const base = listing.cost ?? item.price;
	if (base === undefined) throw new Error(`No purchase price for '${item.id}'.`);
	return integer(
		Math.floor(base * rules.trade.purchaseMultiplier * (location.trade?.purchaseMultiplier ?? 1)),
		'purchase price'
	);
}
export function sellingPrice(
	item: Item,
	listing: ShopItem,
	location: Location,
	rules: GameRules
): number | undefined {
	if (listing.willBuy === undefined || listing.willBuy === false) return undefined;
	const base =
		typeof listing.willBuy === 'number'
			? listing.willBuy
			: (item.sellPrice ?? (item.price ?? listing.cost ?? 0) * rules.trade.saleRatio);
	return integer(Math.floor(base * (location.trade?.saleMultiplier ?? 1)), 'selling price');
}
