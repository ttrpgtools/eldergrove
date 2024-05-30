import type { GameDef } from '$lib/types';
export { locations } from './locations';

export const yearlings: GameDef = {
	id: 'yearlings',
	name: 'Yearlings',
	start: 'yearlings/grassy-field',
	baseChar: {
		hp: 130,
		coin: 15000,
		str: 14,
		dex: 3,
		wil: 3,
		exp: 0,
		level: 1,
		inventory: [['yearlings/cure-potion', 5]],
		equip: [['yearlings/rapier', 'right']]
	},
	desc: `
  This is the OG game that inspired this game engine and while this isn't fully faithful to the
  original version, it is pretty close. The images are new obviously.
  `
};
