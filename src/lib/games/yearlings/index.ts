import { validateCheckpoint } from '$lib/saves';
import type { GameDef } from '$lib/types';
import { items } from './items';
import { locations } from './locations';
import { npcInstances, npcTemplates } from './npcs';

export const yearlings: GameDef = {
	id: 'yearlings',
	contentVersion: 2,
	migrateCheckpoint(value) {
		if (
			!value ||
			typeof value !== 'object' ||
			!('contentVersion' in value) ||
			value.contentVersion !== 1
		)
			return value;
		// The two original listings keep their order; only the new potions are appended.
		const oldLocations = locations.map((location) =>
			location.id === 'yearlings/pylaim/general'
				? { ...location, shop: location.shop!.slice(0, 2) }
				: location
		);
		const checkpoint = validateCheckpoint(value, {
			...yearlings,
			contentVersion: 1,
			locations: oldLocations
		});
		checkpoint.contentVersion = 2;
		for (const location of checkpoint.world.locations) {
			if (location.id === 'yearlings/pylaim/general' && location.stock) {
				location.stock.push(
					...locations
						.find((entry) => entry.id === location.id)!
						.shop!.slice(2)
						.map((entry) => entry.stock)
				);
			}
		}
		return checkpoint;
	},
	rules: { death: { item: 'yearlings/you-die' } },
	start: 'yearlings/grassy-field',
	baseChar: {
		name: 'Stranger',
		maxHp: 30,
		coin: 150,
		str: 4,
		dex: 3,
		wil: 3,
		xp: 0,
		level: 1,
		inventory: [['yearlings/cure-potion', 5]],
		equip: [
			/* ['yearlings/masemune', 'right'],
			['yearlings/diamond-suit', 'torso'] */
		]
	},
	locations,
	items,
	npcInstances,
	npcTemplates
};
