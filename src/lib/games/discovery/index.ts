import type { GameDef } from '$lib/types';
import { items } from './items';
import { locations } from './locations';
import { npcInstances, npcTemplates } from './npcs';

export const discovery: GameDef = {
	start: 'opening',
	baseChar: {
		hp: 10,
		coin: 30,
		str: 4,
		dex: 3,
		wil: 3,
		exp: 0,
		level: 1,
		inventory: [['mystery-object', 1]],
		equip: [
			['rusty-dagger', 'right'],
			['tattered-robes', 'torso']
		]
	},
	locations,
	items,
	npcTemplates,
	npcInstances
};
