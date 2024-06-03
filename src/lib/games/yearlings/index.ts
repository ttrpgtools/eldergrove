import type { GameDef } from '$lib/types';
import { items } from './items';
import { locations } from './locations';
import { npcInstances, npcTemplates } from './npcs';

export const yearlings: GameDef = {
	id: 'yearlings',
	start: 'yearlings/grassy-field',
	baseChar: {
		name: 'Stranger',
		maxHp: 190,
		coin: 15000,
		str: 24,
		dex: 3,
		wil: 3,
		xp: 0,
		level: 1,
		inventory: [['yearlings/cure-potion', 5]],
		equip: [
			['yearlings/masemune', 'right'],
			['yearlings/diamond-suit', 'torso']
		]
	},
	locations,
	items,
	npcInstances,
	npcTemplates
};
