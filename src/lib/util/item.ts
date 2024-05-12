import type { Item } from '$lib/types';

export function isUsable(item: Item) {
	return item.effects && item.effects.length;
}
